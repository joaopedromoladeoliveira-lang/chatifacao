import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listarLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        origem: z.enum(["stripe", "ia", "sistema", "todos"]).default("todos"),
        status: z.enum(["ok", "erro", "aviso", "todos"]).default("todos"),
        limite: z.number().int().min(1).max(200).default(100),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");

    let q = context.supabase
      .from("logs_eventos")
      .select("id, origem, tipo, status, user_id, mensagem, erro, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limite);
    if (data.origem !== "todos") q = q.eq("origem", data.origem);
    if (data.status !== "todos") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const resumoLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await context.supabase
      .from("logs_eventos")
      .select("origem, status")
      .gte("created_at", desde);

    const r = { stripe_ok: 0, stripe_erro: 0, ia_ok: 0, ia_erro: 0, total: rows?.length ?? 0 };
    for (const x of rows ?? []) {
      if (x.origem === "stripe") x.status === "erro" ? r.stripe_erro++ : r.stripe_ok++;
      if (x.origem === "ia") x.status === "erro" ? r.ia_erro++ : r.ia_ok++;
    }
    return r;
  });
