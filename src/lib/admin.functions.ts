import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Falha ao verificar permissão");
  if (!data) throw new Error("Acesso negado");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

export const getPremiumStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_premium", { _user_id: context.userId });
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("premium_ate, premium_vitalicio")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return {
      isPremium: !!data,
      isAdmin: !!isAdmin,
      premiumAte: profile?.premium_ate ?? null,
      vitalicio: !!profile?.premium_vitalicio,
    };
  });

export const listUsersAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ search: z.string().max(200).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("profiles")
      .select("id, nome, email, premium_ate, premium_vitalicio, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) {
      q = q.or(`email.ilike.%${data.search}%,nome.ilike.%${data.search}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;

    const ids = (rows ?? []).map((r: any) => r.id);
    let admins = new Set<string>();
    if (ids.length) {
      const { data: roles } = await context.supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids)
        .eq("role", "admin");
      admins = new Set((roles ?? []).map((r: any) => r.user_id));
    }

    const now = Date.now();
    return (rows ?? []).map((r: any) => ({
      ...r,
      isAdmin: admins.has(r.id),
      isPremiumAtivo:
        admins.has(r.id) ||
        !!r.premium_vitalicio ||
        (!!r.premium_ate && new Date(r.premium_ate).getTime() > now),
    }));
  });

export const concederPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        dias: z.number().int().min(1).max(3650).nullable(),
        vitalicio: z.boolean(),
        observacao: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: before } = await context.supabase
      .from("profiles")
      .select("premium_ate, premium_vitalicio")
      .eq("id", data.userId)
      .maybeSingle();
    if (!before) throw new Error("Usuário não encontrado");

    let novoAte: string | null = before.premium_ate;
    let novoVitalicio = before.premium_vitalicio;

    if (data.vitalicio) {
      novoVitalicio = true;
    } else if (data.dias) {
      const base = before.premium_ate && new Date(before.premium_ate).getTime() > Date.now()
        ? new Date(before.premium_ate)
        : new Date();
      base.setDate(base.getDate() + data.dias);
      novoAte = base.toISOString();
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({
        premium_ate: novoAte,
        premium_vitalicio: novoVitalicio,
        premium_concedido_por: context.userId,
        plano: "premium",
      })
      .eq("id", data.userId);
    if (error) throw error;

    await context.supabase.from("historico_premium").insert({
      user_id: data.userId,
      admin_id: context.userId,
      acao: data.vitalicio ? "vitalicio" : "conceder",
      premium_ate_antes: before.premium_ate,
      premium_ate_depois: novoAte,
      vitalicio_antes: before.premium_vitalicio,
      vitalicio_depois: novoVitalicio,
      observacao: data.observacao ?? null,
    });

    return { ok: true };
  });

export const removerPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), observacao: z.string().max(500).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: before } = await context.supabase
      .from("profiles")
      .select("premium_ate, premium_vitalicio")
      .eq("id", data.userId)
      .maybeSingle();
    if (!before) throw new Error("Usuário não encontrado");

    const { error } = await context.supabase
      .from("profiles")
      .update({ premium_ate: null, premium_vitalicio: false, plano: "gratuito" })
      .eq("id", data.userId);
    if (error) throw error;

    await context.supabase.from("historico_premium").insert({
      user_id: data.userId,
      admin_id: context.userId,
      acao: "remover",
      premium_ate_antes: before.premium_ate,
      premium_ate_depois: null,
      vitalicio_antes: before.premium_vitalicio,
      vitalicio_depois: false,
      observacao: data.observacao ?? null,
    });

    return { ok: true };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [{ count: usuarios }, { count: redacoes }, { count: conversas }, { count: mensagens }] = await Promise.all([
      context.supabase.from("profiles").select("id", { count: "exact", head: true }),
      context.supabase.from("redacoes").select("id", { count: "exact", head: true }),
      context.supabase.from("conversas_ia").select("id", { count: "exact", head: true }),
      context.supabase.from("mensagens_ia").select("id", { count: "exact", head: true }),
    ]);
    const { count: premiumAtivos } = await context.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .or(`premium_vitalicio.eq.true,premium_ate.gt.${new Date().toISOString()}`);
    return {
      usuarios: usuarios ?? 0,
      redacoes: redacoes ?? 0,
      conversas: conversas ?? 0,
      mensagens: mensagens ?? 0,
      premiumAtivos: premiumAtivos ?? 0,
    };
  });

export const getHistoricoUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows } = await context.supabase
      .from("historico_premium")
      .select("*")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return rows ?? [];
  });
