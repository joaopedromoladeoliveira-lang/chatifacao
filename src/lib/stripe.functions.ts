import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";

export const PLANOS = {
  mensal: { label: "Mensal", valor: 2990, intervalo: "month" as const, intervaloCount: 1 },
  trimestral: { label: "Trimestral", valor: 7490, intervalo: "month" as const, intervaloCount: 3 },
  anual: { label: "Anual", valor: 23990, intervalo: "year" as const, intervaloCount: 1 },
};
export type PlanoId = keyof typeof PLANOS;

export const criarCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ plano: z.enum(["mensal", "trimestral", "anual"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe não configurado");

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);

    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email as string | undefined;

    // Reutiliza customer existente.
    const { data: anterior } = await supabase
      .from("assinaturas")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId = anterior?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const cust = await stripe.customers.create({
        email,
        metadata: { user_id: userId },
      });
      customerId = cust.id;
    }

    const plano = PLANOS[data.plano];
    const host = getRequestHost();
    const origin = `https://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${origin}/planos?status=success`,
      cancel_url: `${origin}/planos?status=cancel`,
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: { user_id: userId, plano: data.plano },
      subscription_data: { metadata: { user_id: userId, plano: data.plano } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: plano.valor,
            product_data: { name: `Chatifação Premium — ${plano.label}` },
            recurring: { interval: plano.intervalo, interval_count: plano.intervaloCount },
          },
        },
      ],
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("assinaturas").insert({
      user_id: userId,
      plano: data.plano,
      status: "pending",
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
    });

    return { url: session.url as string };
  });

export const abrirPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe não configurado");

    const { data: ass } = await context.supabase
      .from("assinaturas")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ass?.stripe_customer_id) throw new Error("Nenhuma assinatura encontrada");

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);
    const host = getRequestHost();
    const portal = await stripe.billingPortal.sessions.create({
      customer: ass.stripe_customer_id,
      return_url: `https://${host}/planos`,
    });
    return { url: portal.url };
  });

export const listarMinhasAssinaturas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("assinaturas")
      .select("id, plano, status, current_period_end, cancel_at_period_end, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });
