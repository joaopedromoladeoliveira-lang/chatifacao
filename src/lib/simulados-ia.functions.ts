import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AI_MODEL = "google/gemini-2.5-flash";

const AREAS = ["linguagens", "humanas", "natureza", "matematica"] as const;
export type AreaENEM = (typeof AREAS)[number];

const AREA_LABEL: Record<AreaENEM, string> = {
  linguagens: "Linguagens, Códigos e suas Tecnologias",
  humanas: "Ciências Humanas e suas Tecnologias",
  natureza: "Ciências da Natureza e suas Tecnologias",
  matematica: "Matemática e suas Tecnologias",
};

async function gerarQuestoesIA(ano: number, area: AreaENEM, qtd: number) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const seed = Math.random().toString(36).slice(2, 10);
  const prompt = `Gere ${qtd} questões INÉDITAS no estilo ENEM ${ano}, área de ${AREA_LABEL[area]}.

Regras:
- Cada questão deve ter um enunciado completo (com texto-base/contexto quando apropriado), 5 alternativas (A,B,C,D,E) e indicar a correta.
- Inclua uma explicação curta e clara do gabarito.
- Use o estilo de redação e profundidade típicos do ENEM ${ano}.
- Varie temas e habilidades. Não repita questões. Seed de variação: ${seed}.
- Responda EXCLUSIVAMENTE em JSON válido neste formato:

{
  "questoes": [
    {
      "enunciado": "...",
      "alternativas": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "correta": "A",
      "explicacao": "...",
      "habilidade": "competência/habilidade resumida"
    }
  ]
}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.9,
      messages: [
        { role: "system", content: "Você é um elaborador oficial de questões do ENEM. Gere apenas JSON válido." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("logs_eventos").insert({
        origem: "ia",
        tipo: `simulado_${res.status}`,
        status: "erro",
        mensagem: txt.slice(0, 500),
        erro: `${res.status}`,
      });
    } catch {}
    if (res.status === 429) throw new Error("IA ocupada. Tente novamente em alguns segundos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Erro ao gerar simulado: ${res.status}`);
  }

  const json = await res.json();
  const parsed = JSON.parse(json.choices[0].message.content);
  const questoes = Array.isArray(parsed.questoes) ? parsed.questoes : [];

  return questoes
    .filter((q: any) => q?.enunciado && q?.alternativas && q?.correta)
    .map((q: any, i: number) => ({
      n: i + 1,
      enunciado: String(q.enunciado),
      alternativas: {
        A: String(q.alternativas.A ?? ""),
        B: String(q.alternativas.B ?? ""),
        C: String(q.alternativas.C ?? ""),
        D: String(q.alternativas.D ?? ""),
        E: String(q.alternativas.E ?? ""),
      },
      correta: String(q.correta).toUpperCase(),
      explicacao: String(q.explicacao ?? ""),
      habilidade: String(q.habilidade ?? ""),
    }));
}

export const criarSimuladoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ano: z.number().int().min(1998).max(2030),
        area: z.enum(AREAS),
        qtd: z.number().int().min(5).max(20).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Limite simples por hora p/ evitar abuso
    const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("simulados_ia_sessoes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", umaHora);
    if ((count ?? 0) >= 10) {
      throw new Error("Você gerou muitos simulados na última hora. Aguarde um pouco.");
    }

    const questoes = await gerarQuestoesIA(data.ano, data.area, data.qtd);
    if (questoes.length === 0) throw new Error("A IA não retornou questões válidas. Tente novamente.");

    // Versão "do aluno" — sem gabarito/explicação
    const { data: row, error } = await supabase
      .from("simulados_ia_sessoes")
      .insert({
        user_id: userId,
        ano: data.ano,
        area: data.area,
        questoes,
        total: questoes.length,
      })
      .select("id")
      .single();
    if (error) throw error;

    return { id: row.id as string };
  });

export const obterSimuladoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s, error } = await supabase
      .from("simulados_ia_sessoes")
      .select("id, ano, area, questoes, respostas, nota, acertos, total, finalizado_em, created_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!s) throw new Error("Simulado não encontrado");

    const finalizado = !!s.finalizado_em;
    // Esconde gabarito enquanto não terminou
    const questoes = (s.questoes as any[]).map((q) =>
      finalizado
        ? q
        : { n: q.n, enunciado: q.enunciado, alternativas: q.alternativas, habilidade: q.habilidade },
    );

    return { ...s, questoes };
  });

export const finalizarSimuladoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), respostas: z.record(z.string(), z.string()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s, error } = await supabase
      .from("simulados_ia_sessoes")
      .select("id, questoes, total, finalizado_em")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!s) throw new Error("Simulado não encontrado");
    if (s.finalizado_em) throw new Error("Simulado já finalizado");

    const questoes = s.questoes as any[];
    let acertos = 0;
    for (const q of questoes) {
      const resp = data.respostas[String(q.n)];
      if (resp && resp.toUpperCase() === String(q.correta).toUpperCase()) acertos++;
    }
    const total = questoes.length;
    const nota = total > 0 ? Math.round((acertos / total) * 1000) / 10 : 0;

    const { error: upErr } = await supabase
      .from("simulados_ia_sessoes")
      .update({
        respostas: data.respostas,
        acertos,
        nota,
        finalizado_em: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (upErr) throw upErr;

    return { acertos, total, nota };
  });

export const listarHistoricoSimuladosIA = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("simulados_ia_sessoes")
      .select("id, ano, area, nota, acertos, total, finalizado_em, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
