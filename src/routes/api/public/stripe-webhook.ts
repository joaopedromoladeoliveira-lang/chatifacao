import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !webhookSecret) {
          return new Response("Stripe não configurado", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secret);

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        } catch (e: any) {
          return new Response(`Webhook signature error: ${e.message}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as import("stripe").Stripe.Checkout.Session;
              const userId = (s.metadata?.user_id as string) || (s.client_reference_id as string);
              const plano = s.metadata?.plano as string | undefined;
              if (!userId) break;

              const subscriptionId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
              const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;

              await supabaseAdmin
                .from("assinaturas")
                .update({
                  status: "active",
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: customerId,
                })
                .eq("stripe_checkout_session_id", s.id);

              if (subscriptionId) {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const periodEnd = new Date(sub.items.data[0].current_period_end * 1000).toISOString();
                await supabaseAdmin
                  .from("assinaturas")
                  .update({
                    current_period_end: periodEnd,
                    cancel_at_period_end: sub.cancel_at_period_end ?? false,
                  })
                  .eq("stripe_subscription_id", subscriptionId);

                await supabaseAdmin
                  .from("profiles")
                  .update({ plano: "premium", premium_ate: periodEnd })
                  .eq("id", userId);

                await supabaseAdmin.from("historico_premium").insert({
                  user_id: userId,
                  acao: "concedido",
                  premium_ate_depois: periodEnd,
                  observacao: `Stripe checkout (${plano ?? "?"})`,
                });
              }
              break;
            }
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as import("stripe").Stripe.Subscription;
              const userId = sub.metadata?.user_id as string | undefined;
              const isActive = sub.status === "active" || sub.status === "trialing";
              const periodEnd = sub.items.data[0]?.current_period_end
                ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
                : null;

              await supabaseAdmin
                .from("assinaturas")
                .update({
                  status: sub.status,
                  current_period_end: periodEnd,
                  cancel_at_period_end: sub.cancel_at_period_end ?? false,
                })
                .eq("stripe_subscription_id", sub.id);

              if (userId) {
                await supabaseAdmin
                  .from("profiles")
                  .update({
                    plano: isActive ? "premium" : "gratuito",
                    premium_ate: isActive ? periodEnd : null,
                  })
                  .eq("id", userId);

                if (!isActive) {
                  await supabaseAdmin.from("historico_premium").insert({
                    user_id: userId,
                    acao: "removido",
                    observacao: `Stripe: ${sub.status}`,
                  });
                }
              }
              break;
            }
            case "invoice.payment_failed": {
              const inv = event.data.object as import("stripe").Stripe.Invoice;
              const subId = typeof (inv as any).subscription === "string" ? (inv as any).subscription : null;
              if (subId) {
                await supabaseAdmin
                  .from("assinaturas")
                  .update({ status: "past_due" })
                  .eq("stripe_subscription_id", subId);
              }
              break;
            }
          }
        } catch (err: any) {
          console.error("Webhook handler error", err);
          return new Response(`Handler error: ${err.message}`, { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
