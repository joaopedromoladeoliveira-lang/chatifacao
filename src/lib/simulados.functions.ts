import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listSimulados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("simulados")
      .select("id, titulo, descricao, tipo, materia, dificuldade, duracao_minutos")
      .eq("publicado", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const iniciarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ simuladoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // limite plano gratuito: 1 simulado/dia
    const { data: premium } = await supabase.rpc("is_premium", { _user_id: userId });
    if (!premium) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("tentativas_simulado")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("iniciado_em", hoje.toISOString());
      if ((count ?? 0) >= 1) {
        throw new Error("Plano gratuito: 1 simulado por dia. Faça upgrade para Premium para simulados ilimitados.");
      }
    }

    const { data: qs } = await supabase
      .from("questoes")
      .select("id")
      .eq("simulado_id", data.simuladoId);
    if (!qs?.length) throw new Error("Simulado sem questões");

    const { data: tent, error } = await supabase
      .from("tentativas_simulado")
      .insert({
        user_id: userId,
        simulado_id: data.simuladoId,
        total_questoes: qs.length,
        status: "em_andamento",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { tentativaId: tent.id as string };
  });

export const getTentativaQuestoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tentativaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tent } = await supabase
      .from("tentativas_simulado")
      .select("id, simulado_id, status, iniciado_em, finalizado_em, acertos, pontuacao, total_questoes, simulados(titulo, duracao_minutos, tipo, materia)")
      .eq("id", data.tentativaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!tent) throw new Error("Tentativa não encontrada");

    // Only include `correta`/`explicacao` after the attempt is finalized (review mode).
    const isFinalized = tent.status === "finalizada";
    let questoes: any[] = [];
    if (isFinalized) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: qs } = await supabaseAdmin
        .from("questoes")
        .select("id, ordem, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, materia, correta, explicacao")
        .eq("simulado_id", tent.simulado_id)
        .order("ordem");
      questoes = qs ?? [];
    } else {
      const { data: qs } = await supabase
        .from("questoes")
        .select("id, ordem, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, materia")
        .eq("simulado_id", tent.simulado_id)
        .order("ordem");
      questoes = qs ?? [];
    }

    const { data: respostas } = await supabase
      .from("respostas_questao")
      .select("questao_id, resposta, correta")
      .eq("tentativa_id", data.tentativaId);

    return { tentativa: tent, questoes, respostas: respostas ?? [] };
  });

export const responderQuestao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tentativaId: z.string().uuid(),
      questaoId: z.string().uuid(),
      resposta: z.enum(["A", "B", "C", "D", "E"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify tentativa belongs to the user and is still in progress.
    const { data: tent } = await supabase
      .from("tentativas_simulado")
      .select("id, status")
      .eq("id", data.tentativaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!tent) throw new Error("Tentativa não encontrada");
    if (tent.status !== "em_andamento") throw new Error("Tentativa já finalizada");

    // Read the correct answer with the service role so it is never exposed to the client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: q } = await supabaseAdmin
      .from("questoes")
      .select("correta")
      .eq("id", data.questaoId)
      .maybeSingle();
    if (!q) throw new Error("Questão não encontrada");

    const correta = q.correta === data.resposta;

    await supabase.from("respostas_questao").upsert(
      {
        tentativa_id: data.tentativaId,
        questao_id: data.questaoId,
        user_id: userId,
        resposta: data.resposta,
        correta,
      },
      { onConflict: "tentativa_id,questao_id" },
    );

    return { correta };
  });

export const finalizarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tentativaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: tent } = await supabase
      .from("tentativas_simulado")
      .select("iniciado_em, total_questoes")
      .eq("id", data.tentativaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!tent) throw new Error("Tentativa não encontrada");

    const { data: respostas } = await supabase
      .from("respostas_questao")
      .select("correta")
      .eq("tentativa_id", data.tentativaId);
    const acertos = (respostas ?? []).filter((r: any) => r.correta).length;
    const pontuacao = tent.total_questoes ? (acertos / tent.total_questoes) * 100 : 0;
    const tempo = Math.round((Date.now() - new Date(tent.iniciado_em).getTime()) / 1000);

    await supabase
      .from("tentativas_simulado")
      .update({
        acertos,
        pontuacao: Number(pontuacao.toFixed(2)),
        tempo_segundos: tempo,
        finalizado_em: new Date().toISOString(),
        status: "finalizada",
      })
      .eq("id", data.tentativaId);

    return { acertos, total: tent.total_questoes, pontuacao };
  });

export const listMinhasTentativas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("tentativas_simulado")
      .select("id, simulado_id, iniciado_em, finalizado_em, acertos, pontuacao, total_questoes, status, simulados(titulo, tipo, materia)")
      .eq("user_id", context.userId)
      .order("iniciado_em", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const getDesempenho = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: redacoes }, { data: tentativas }, { count: mensagens }] = await Promise.all([
      supabase
        .from("redacoes")
        .select("nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, created_at")
        .eq("user_id", userId)
        .eq("status", "corrigida")
        .order("created_at", { ascending: true }),
      supabase
        .from("tentativas_simulado")
        .select("pontuacao, acertos, total_questoes, finalizado_em, simulados(titulo, materia, tipo)")
        .eq("user_id", userId)
        .eq("status", "finalizada")
        .order("finalizado_em", { ascending: true }),
      supabase.from("mensagens_ia").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user"),
    ]);

    return { redacoes: redacoes ?? [], tentativas: tentativas ?? [], mensagensIA: mensagens ?? 0 };
  });
