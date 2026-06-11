import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { criarCheckout, abrirPortal, listarMinhasAssinaturas, PLANOS } from "@/lib/stripe.functions";
import { z } from "zod";

const search = z.object({ status: z.enum(["success", "cancel"]).optional() });

export const Route = createFileRoute("/_authenticated/planos")({
  validateSearch: (s) => search.parse(s),
  component: PlanosPage,
});

const PLAN_FEATURES = [
  "Redações ilimitadas com correção ENEM",
  "IA Professora sem limite de mensagens",
  "Simulados ilimitados (ENEM, OBMEP, etc)",
  "Relatórios completos de desempenho",
  "Suporte prioritário",
];

const PLAN_BADGES: Record<string, string | undefined> = {
  trimestral: "Mais popular",
  anual: "Economize 33%",
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PlanosPage() {
  const { status } = useSearch({ from: "/_authenticated/planos" });
  const checkout = useServerFn(criarCheckout);
  const portal = useServerFn(abrirPortal);
  const [loading, setLoading] = useState<string | null>(null);

  const { data: assinaturas, refetch } = useQuery({
    queryKey: ["minhas-assinaturas"],
    queryFn: () => listarMinhasAssinaturas(),
  });

  const ativa = assinaturas?.find((a) => a.status === "active" || a.status === "trialing");

  useEffect(() => {
    if (status === "success") {
      toast.success("Pagamento confirmado! Seu plano premium está ativo.");
      refetch();
    } else if (status === "cancel") {
      toast.info("Checkout cancelado.");
    }
  }, [status, refetch]);

  async function comprar(plano: "mensal" | "trimestral" | "anual") {
    setLoading(plano);
    try {
      const { url } = await checkout({ data: { plano } });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao iniciar checkout");
      setLoading(null);
    }
  }

  async function gerenciar() {
    setLoading("portal");
    try {
      const { url } = await portal();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao abrir portal");
      setLoading(null);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-elegant">
          <Crown className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">Escolha seu plano Premium</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Estude sem limites: redações ilimitadas, IA Professora 24/7 e simulados completos.
        </p>
      </div>

      {ativa && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/5 p-5">
          <div>
            <p className="text-sm text-muted-foreground">Plano ativo</p>
            <p className="text-lg font-semibold capitalize">{ativa.plano}</p>
            {ativa.current_period_end && (
              <p className="text-xs text-muted-foreground">
                {ativa.cancel_at_period_end ? "Termina em " : "Renova em "}
                {new Date(ativa.current_period_end).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={gerenciar} disabled={loading === "portal"}>
            {loading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerenciar assinatura
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {(Object.keys(PLANOS) as Array<keyof typeof PLANOS>).map((id) => {
          const p = PLANOS[id];
          const isAtivo = ativa?.plano === id;
          const badge = PLAN_BADGES[id];
          const meses = id === "trimestral" ? 3 : id === "anual" ? 12 : 1;
          const porMes = p.valor / meses;

          return (
            <div
              key={id}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-card ${
                id === "trimestral" ? "border-primary/50 shadow-elegant" : ""
              }`}
            >
              {badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-hero px-3 py-1 text-xs font-medium text-primary-foreground">
                  {badge}
                </span>
              )}
              <h3 className="text-xl font-bold capitalize">{p.label}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{formatBRL(p.valor)}</span>
                <span className="text-sm text-muted-foreground">
                  /{id === "anual" ? "ano" : id === "trimestral" ? "trimestre" : "mês"}
                </span>
              </div>
              {meses > 1 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Equivale a {formatBRL(porMes)}/mês
                </p>
              )}

              <ul className="my-6 space-y-2 text-sm">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-auto ${id === "trimestral" ? "bg-gradient-hero" : ""}`}
                variant={id === "trimestral" ? "default" : "outline"}
                disabled={!!loading || isAtivo}
                onClick={() => comprar(id)}
              >
                {loading === id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isAtivo ? "Plano atual" : "Assinar"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Pagamento seguro processado pela Stripe. Cancele quando quiser.
      </p>
    </div>
  );
}
