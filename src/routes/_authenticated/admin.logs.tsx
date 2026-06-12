import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listarLogs, resumoLogs } from "@/lib/logs.functions";
import { checkIsAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, AlertCircle, CheckCircle2, CreditCard, Bot } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  beforeLoad: async () => {
    const { isAdmin } = await checkIsAdmin();
    if (!isAdmin) throw redirect({ to: "/app" });
  },
  component: AdminLogsPage,
});

function AdminLogsPage() {
  const listFn = useServerFn(listarLogs);
  const resumoFn = useServerFn(resumoLogs);
  const [origem, setOrigem] = useState<"todos" | "stripe" | "ia" | "sistema">("todos");
  const [status, setStatus] = useState<"todos" | "ok" | "erro">("todos");

  const { data: resumo } = useQuery({
    queryKey: ["logs-resumo"],
    queryFn: () => resumoFn(),
    refetchInterval: 30000,
  });
  const { data: logs, refetch, isFetching } = useQuery({
    queryKey: ["logs", origem, status],
    queryFn: () => listFn({ data: { origem, status, limite: 150 } }),
    refetchInterval: 15000,
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs de eventos</h1>
          <p className="text-sm text-muted-foreground">Stripe e IA — últimas 24h e histórico.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Card icon={<CreditCard />} label="Stripe OK (24h)" value={resumo?.stripe_ok ?? 0} tone="success" />
        <Card icon={<CreditCard />} label="Stripe erros (24h)" value={resumo?.stripe_erro ?? 0} tone="danger" />
        <Card icon={<Bot />} label="IA OK (24h)" value={resumo?.ia_ok ?? 0} tone="success" />
        <Card icon={<Bot />} label="IA erros (24h)" value={resumo?.ia_erro ?? 0} tone="danger" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["todos", "stripe", "ia", "sistema"] as const).map((o) => (
          <Button key={o} size="sm" variant={origem === o ? "default" : "outline"} onClick={() => setOrigem(o)}>
            {o}
          </Button>
        ))}
        <div className="mx-2 h-8 w-px bg-border" />
        {(["todos", "ok", "erro"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Quando</th>
              <th className="px-4 py-2">Origem</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Mensagem / Erro</th>
            </tr>
          </thead>
          <tbody>
            {logs?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sem eventos ainda.</td></tr>
            )}
            {logs?.map((l: any) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2"><Badge variant="outline">{l.origem}</Badge></td>
                <td className="px-4 py-2 font-mono text-xs">{l.tipo}</td>
                <td className="px-4 py-2">
                  {l.status === "ok" ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> ok</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> {l.status}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">{l.erro ?? l.mensagem ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "success" | "danger" }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={tone === "success" ? "text-success" : "text-destructive"}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
