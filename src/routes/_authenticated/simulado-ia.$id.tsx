import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { obterSimuladoIA, finalizarSimuladoIA } from "@/lib/simulados-ia.functions";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/simulado-ia/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const obterFn = useServerFn(obterSimuladoIA);
  const finalizarFn = useServerFn(finalizarSimuladoIA);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sim-ia", id],
    queryFn: () => obterFn({ data: { id } }),
  });
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (data?.respostas) setRespostas(data.respostas as any);
  }, [data?.respostas]);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-20 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }
  if (!data) return <div className="container mx-auto px-4 py-20 text-center">Simulado não encontrado.</div>;

  const questoes = data.questoes as any[];
  const finalizado = !!data.finalizado_em;

  async function enviar() {
    const faltam = questoes.filter((q) => !respostas[String(q.n)]).length;
    if (faltam > 0 && !confirm(`Faltam ${faltam} questões em branco. Finalizar mesmo assim?`)) return;
    setEnviando(true);
    try {
      const r = await finalizarFn({ data: { id, respostas } });
      toast.success(`Você acertou ${r.acertos} de ${r.total} (${r.nota}%)`);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao finalizar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/simulado-ia"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button></Link>
        <div className="text-sm text-muted-foreground">ENEM {data.ano} · <span className="capitalize">{data.area}</span></div>
      </div>

      {finalizado && (
        <div className="mb-6 rounded-2xl border border-success/30 bg-success/5 p-5 text-center">
          <p className="text-sm text-muted-foreground">Resultado</p>
          <p className="text-3xl font-bold">{data.acertos}/{data.total} <span className="text-base font-normal text-muted-foreground">({data.nota}%)</span></p>
        </div>
      )}

      <div className="space-y-6">
        {questoes.map((q) => {
          const minha = respostas[String(q.n)];
          const correta = (q as any).correta;
          return (
            <div key={q.n} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Questão {q.n}{q.habilidade && ` · ${q.habilidade}`}</div>
              <p className="whitespace-pre-wrap text-sm">{q.enunciado}</p>
              <div className="mt-4 space-y-2">
                {(["A", "B", "C", "D", "E"] as const).map((letra) => {
                  const txt = q.alternativas[letra];
                  const isMinha = minha === letra;
                  const isCerta = finalizado && correta === letra;
                  const isErrada = finalizado && isMinha && correta !== letra;
                  return (
                    <button
                      key={letra}
                      disabled={finalizado}
                      onClick={() => setRespostas((r) => ({ ...r, [String(q.n)]: letra }))}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                        isCerta ? "border-success/50 bg-success/10" :
                        isErrada ? "border-destructive/50 bg-destructive/10" :
                        isMinha ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-bold">{letra}</span>
                      <span className="flex-1">{txt}</span>
                      {isCerta && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {isErrada && <XCircle className="h-4 w-4 text-destructive" />}
                    </button>
                  );
                })}
              </div>
              {finalizado && (q as any).explicacao && (
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs">
                  <span className="font-semibold">Explicação: </span>{(q as any).explicacao}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!finalizado && (
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <Button onClick={enviar} disabled={enviando} size="lg" className="bg-gradient-hero shadow-elegant">
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Finalizar simulado
          </Button>
        </div>
      )}
    </div>
  );
}
