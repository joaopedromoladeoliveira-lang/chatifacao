import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChatInput = z.object({
  conversaId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

const SYSTEM_PROMPT = `Você é a IA Professora da Chatifação, uma professora particular brasileira especializada em preparar estudantes para o ENEM, vestibulares e olimpíadas científicas.

Estilo:
- Responda sempre em português brasileiro, com clareza e didática.
- Explique passo a passo quando o aluno pedir resolução de exercícios.
- Use exemplos do dia a dia brasileiro quando ajudar.
- Quando apropriado, sugira exercícios de fixação.
- Use markdown (negrito, listas, código) para deixar a resposta legível.
- Seja amigável, encorajadora e paciente.`;

async function callOpenAI(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OpenAI error:", res.status, text);
    throw new Error(`Erro da OpenAI: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify conversa belongs to user
    const { data: conversa } = await supabase
      .from("conversas_ia")
      .select("id")
      .eq("id", data.conversaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!conversa) throw new Error("Conversa não encontrada");

    // Load history
    const { data: history } = await supabase
      .from("mensagens_ia")
      .select("role, content")
      .eq("conversa_id", data.conversaId)
      .order("created_at", { ascending: true });

    // Insert user message
    await supabase.from("mensagens_ia").insert({
      conversa_id: data.conversaId,
      user_id: userId,
      role: "user",
      content: data.message,
    });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    const reply = await callOpenAI(messages);

    await supabase.from("mensagens_ia").insert({
      conversa_id: data.conversaId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    // Update conversa title from first user message if still default
    if (!history || history.length === 0) {
      const title = data.message.slice(0, 60);
      await supabase.from("conversas_ia").update({ titulo: title, updated_at: new Date().toISOString() }).eq("id", data.conversaId);
    } else {
      await supabase.from("conversas_ia").update({ updated_at: new Date().toISOString() }).eq("id", data.conversaId);
    }

    return { reply };
  });

export const createConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("conversas_ia")
      .insert({ user_id: userId, titulo: "Nova conversa" })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id as string };
  });

// REDAÇÃO
const RedacaoInput = z.object({
  tema: z.string().min(3).max(500),
  texto: z.string().min(50).max(8000),
});

const REDACAO_PROMPT = `Você é um corretor oficial de redação do ENEM. Avalie a redação segundo as 5 competências do ENEM, atribuindo nota de 0 a 200 em cada uma:

1. Domínio da modalidade escrita formal (Competência 1)
2. Compreensão do tema e tipo dissertativo-argumentativo (Competência 2)
3. Seleção, organização e interpretação de argumentos (Competência 3)
4. Mecanismos linguísticos para argumentação (Competência 4)
5. Proposta de intervenção respeitando direitos humanos (Competência 5)

Responda EXCLUSIVAMENTE em JSON válido com esta estrutura, sem texto fora do JSON:
{
  "c1": <0-200>,
  "c2": <0-200>,
  "c3": <0-200>,
  "c4": <0-200>,
  "c5": <0-200>,
  "feedback_geral": "<parágrafo geral em português>",
  "sugestoes": "<lista de melhorias separadas por '\\n- ' começando com '- '>"
}`;

export const corrigirRedacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RedacaoInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Insert as pending
    const { data: red, error } = await supabase
      .from("redacoes")
      .insert({ user_id: userId, tema: data.tema, texto: data.texto, status: "pendente" })
      .select("id")
      .single();
    if (error) throw error;
    const redacaoId = red.id as string;

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: REDACAO_PROMPT },
            { role: "user", content: `TEMA: ${data.tema}\n\nREDAÇÃO:\n${data.texto}` },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const json = await res.json();
      const parsed = JSON.parse(json.choices[0].message.content);

      const clamp = (n: any) => Math.max(0, Math.min(200, Math.round(Number(n) || 0)));
      const c1 = clamp(parsed.c1);
      const c2 = clamp(parsed.c2);
      const c3 = clamp(parsed.c3);
      const c4 = clamp(parsed.c4);
      const c5 = clamp(parsed.c5);
      const total = c1 + c2 + c3 + c4 + c5;

      await supabase.from("redacoes").update({
        nota_c1: c1, nota_c2: c2, nota_c3: c3, nota_c4: c4, nota_c5: c5,
        nota_total: total,
        feedback_geral: String(parsed.feedback_geral ?? ""),
        sugestoes: String(parsed.sugestoes ?? ""),
        status: "corrigida",
      }).eq("id", redacaoId);

      return { id: redacaoId };
    } catch (err) {
      console.error("Erro corrigindo redação:", err);
      await supabase.from("redacoes").update({ status: "erro" }).eq("id", redacaoId);
      throw new Error("Falha ao corrigir a redação. Tente novamente.");
    }
  });
