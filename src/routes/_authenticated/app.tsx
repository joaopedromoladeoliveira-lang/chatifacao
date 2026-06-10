import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PenLine, MessageSquare, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", user.id],
    queryFn: async () => {
      const { data: red } = await supabase.from("redacoes").select("nota_total, created_at").eq("user_id", user.id);
      const corrigidas = red?.filter(r => r.nota_total != null) ?? [];
      const media = corrigidas.length ? Math.round(corrigidas.reduce((s, r) => s + (r.nota_total ?? 0), 0) / corrigidas.length) : 0;
      const thisMonth = (red ?? []).filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length;
      return { total: red?.length ?? 0, media, thisMonth };
    },
  });

  const nome = profile?.nome ?? "estudante";
  const isPremium = profile?.plano === "premium";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Olá, {nome.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-muted-foreground">Pronto para estudar hoje?</p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${isPremium ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground"}`}>
          {isPremium ? "✨ Premium" : "Plano Gratuito"}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Redações enviadas" value={stats?.total ?? 0} icon={PenLine} />
        <StatCard label="Média das notas" value={stats?.media ?? 0} suffix="/1000" icon={TrendingUp} />
        <StatCard label="Redações neste mês" value={stats?.thisMonth ?? 0} icon={Sparkles} hint={!isPremium ? `${Math.max(0, 3 - (stats?.thisMonth ?? 0))} restantes` : "ilimitadas"} />
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/app/redacao" className="group block rounded-2xl border bg-card p-6 shadow-card transition-all hover:shadow-elegant">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-elegant">
            <PenLine className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold">Corrigir uma Redação</h3>
          <p className="mt-2 text-sm text-muted-foreground">Receba nota de 0 a 1000 nas 5 competências do ENEM com feedback detalhado.</p>
          <Button className="mt-4 bg-gradient-hero">Começar redação</Button>
        </Link>

        <Link to="/app/ia" className="group block rounded-2xl border bg-card p-6 shadow-card transition-all hover:shadow-elegant">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-elegant">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold">Falar com a IA Professora</h3>
          <p className="mt-2 text-sm text-muted-foreground">Tire dúvidas, peça explicações passo a passo e exercícios personalizados.</p>
          <Button className="mt-4 bg-gradient-hero">Abrir chat</Button>
        </Link>
      </div>

      <div className="mt-10 rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
        <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
        <h4 className="font-semibold">Acompanhe sua evolução</h4>
        <p className="mt-1 text-sm text-muted-foreground">Faça simulados e veja gráficos completos do seu desempenho na aba <Link to="/desempenho" className="text-primary hover:underline">Desempenho</Link>.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, icon: Icon, hint }: { label: string; value: number; suffix?: string; icon: typeof PenLine; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
