import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { criarSimuladoIA, listarHistoricoSimuladosIA } from "@/lib/simulados-ia.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Calendar, BookOpen, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/simulado-ia")({
  component: Page,
});

const AREAS = [
  { id: "linguagens", label: "Linguagens", color: "from-amber-500 to-orange-500" },
  { id: "humanas", label: "Humanas", color: "from-blue-500 to-indigo-500" },
  { id: "natureza", label: "Natureza", color: "from-emerald-500 to-teal-500" },
  { id: "matematica", label: "Matemática", color: "from-fuchsia-500 to-purple-500" },
] as const;

const ANO_ATUAL = new Date().getFullYear();
const ANOS: number[] = [];
for (let a = ANO_ATUAL; a >= 1998; a--) ANOS.push(a);

function Page() {
  const nav = useNavigate();
  const criarFn = useServerFn(criarSimuladoIA);
  const histFn = useServerFn(listarHistoricoSimuladosIA);
  const { data: historico } = useQuery({ queryKey: ["sim-ia-hist"], queryFn: () => histFn() });
  const [loading, setLoading] = useState<string | null>(null);
  const [anoAtivo, setAnoAtivo] = useState<number | null>(null);

  async function comecar(ano: number, area: (typeof AREAS)[number]["id"]) {
    const key = `${ano}-${area}`;
    setLoading(key);
    try {
      const { id } = await criarFn({ data: { ano, area, qtd: 10 } });
      toast.success("Simulado pronto!");
      nav({ to: "/simulado-ia/$id", params: { id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar simulado");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-3 py-1 text-xs font-medium text-primary-foreground">
          <Sparkles className="h-3 w-3" /> Geradas por IA — questões inéditas a cada simulado
        </div>
        <h1 className="text-3xl font-bold">Simulados ENEM — todos os anos</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha o ano e a área. A IA monta 10 questões inéditas no estilo daquele ano — cada vez que você
          entra, vem um simulado diferente.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Calendar className="h-4 w-4" /> Escolha o ano
        </h2>
        <div className="flex flex-wrap gap-2">
          {ANOS.map((a) => (
            <Button
              key={a}
              size="sm"
              variant={anoAtivo === a ? "default" : "outline"}
              onClick={() => setAnoAtivo(a)}
            >
              {a}
            </Button>
          ))}
        </div>
      </div>

      {anoAtivo && (
        <div className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BookOpen className="h-4 w-4" /> Escolha a área (ENEM {anoAtivo})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AREAS.map((a) => {
              const key = `${anoAtivo}-${a.id}`;
              const busy = loading === key;
              return (
                <button
                  key={a.id}
                  onClick={() => comecar(anoAtivo, a.id)}
                  disabled={!!loading}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-card transition hover:shadow-elegant disabled:opacity-60`}
                >
                  <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${a.color} opacity-10 transition group-hover:opacity-20`} />
                  <div className="text-xs text-muted-foreground">ENEM {anoAtivo}</div>
                  <div className="mt-1 text-lg font-bold">{a.label}</div>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
                    {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando…</> : "Iniciar simulado →"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Trophy className="h-4 w-4" /> Seu histórico
        </h2>
        {!historico || historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum simulado ainda. Escolha um ano acima para começar.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Ano</th><th className="px-4 py-2">Área</th><th className="px-4 py-2">Resultado</th><th className="px-4 py-2"></th></tr>
              </thead>
              <tbody>
                {historico.map((h: any) => (
                  <tr key={h.id} className="border-t">
                    <td className="px-4 py-2 text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2">{h.ano}</td>
                    <td className="px-4 py-2 capitalize">{h.area}</td>
                    <td className="px-4 py-2">
                      {h.finalizado_em ? `${h.acertos}/${h.total} (${h.nota}%)` : <span className="text-muted-foreground">em andamento</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link to="/simulado-ia/$id" params={{ id: h.id }}>
                        <Button size="sm" variant="ghost">Abrir</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
