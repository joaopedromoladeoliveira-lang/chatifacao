import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { getTentativaQuestoes, responderQuestao, finalizarSimulado } from "@/lib/simulados.functions";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/simulado/$id")({
  head: () => ({ meta: [{ title: "Simulado – Chatifação" }] }),
  component: SimuladoPage,
});

const LETRAS = ["A", "B", "C", "D", "E"] as const;

function SimuladoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getTentativaQuestoes);
  const responderFn = useServerFn(responderQuestao);
  const finalizarFn = useServerFn(finalizarSimulado);

  const [idx, setIdx] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tentativa", id],
    queryFn: () => fetchFn({ data: { tentativaId: id } }),
  });

  const responder = useMutation({
    mutationFn: (v: { questaoId: string; resposta: "A"|"B"|"C"|"D"|"E" }) =>
      responderFn({ data: { tentativaId: id, ...v } }),
    onSuccess: () => refetch(),
  });

  const finalizar = useMutation({
    mutationFn: () => finalizarFn({ data: { tentativaId: id } }),
    onSuccess: (res) => {
      toast.success(`Simulado finalizado! Você acertou ${res.acertos}/${res.total}`);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const respostasMap = useMemo(() => {
    const m = new Map<string, { resposta: string; correta: boolean | null }>();
    (data?.respostas ?? []).forEach((r: any) => m.set(r.questao_id, { resposta: r.resposta, correta: r.correta }));
    return m;
  }, [data?.respostas]);

  if (isLoading || !data) {
    return <div className="container mx-auto max-w-3xl px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  const finalizada = data.tentativa.status === "finalizada";
  const questoes = data.questoes;
  const respondidas = respostasMap.size;

  if (finalizada) {
    const acertos = data.tentativa.acertos;
    const total = data.tentativa.total_questoes;
    const pct = Math.round(Number(data.tentativa.pontuacao));
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-elegant">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-success" />
          <h1 className="text-3xl font-bold">Simulado finalizado!</h1>
          <p className="mt-2 text-muted-foreground">{(data.tentativa as any).simulados?.titulo}</p>
          <div className="my-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Acertos" value={`${acertos}/${total}`} />
            <Stat label="Pontuação" value={`${pct}%`} />
            <Stat label="Tempo" value={`${Math.round((data.tentativa.finalizado_em ? (new Date(data.tentativa.finalizado_em).getTime() - new Date(data.tentativa.iniciado_em).getTime()) / 60000 : 0))} min`} />
          </div>

          <h3 className="mt-8 mb-3 text-left text-lg font-semibold">Revisão das questões</h3>
          <div className="space-y-3 text-left">
            {questoes.map((q: any, i: number) => {
              const r = respostasMap.get(q.id);
              return (
                <div key={q.id} className="rounded-xl border p-4">
                  <p className="text-sm font-medium">{i+1}. {q.enunciado}</p>
                  <div className="mt-2 grid gap-1 text-sm">
                    {LETRAS.map(l => {
                      const text = (q as any)[`alternativa_${l.toLowerCase()}`];
                      if (!text) return null;
                      const isCorreta = q.correta === l;
                      const isMinha = r?.resposta === l;
                      return (
                        <div key={l} className={cn("rounded px-2 py-1", isCorreta && "bg-success/15 text-success", !isCorreta && isMinha && "bg-destructive/15 text-destructive")}>
                          <b>{l})</b> {text} {isCorreta && "✓"} {!isCorreta && isMinha && "✗"}
                        </div>
                      );
                    })}
                  </div>
                  {q.explicacao && <p className="mt-2 text-xs text-muted-foreground"><b>Explicação:</b> {q.explicacao}</p>}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => navigate({ to: "/simulados" })}>Voltar aos simulados</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/desempenho" })}>Ver desempenho</Button>
          </div>
        </div>
      </div>
    );
  }

  const q = questoes[idx];
  const respAtual = respostasMap.get(q?.id);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{(data.tentativa as any).simulados?.titulo}</h1>
        <span className="text-sm text-muted-foreground">{respondidas}/{questoes.length} respondidas</span>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <p className="mb-1 text-xs text-muted-foreground">Questão {idx+1} de {questoes.length}</p>
        <p className="text-base font-medium leading-relaxed">{q.enunciado}</p>

        <div className="mt-5 space-y-2">
          {LETRAS.map(l => {
            const text = (q as any)[`alternativa_${l.toLowerCase()}`];
            if (!text) return null;
            const selecionada = respAtual?.resposta === l;
            return (
              <button
                key={l}
                onClick={() => responder.mutate({ questaoId: q.id, resposta: l })}
                disabled={responder.isPending}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-all hover:border-primary/50",
                  selecionada && "border-primary bg-primary/5",
                )}
              >
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", selecionada && "border-primary bg-primary text-primary-foreground")}>
                  {l}
                </span>
                <span className="flex-1">{text}</span>
                {selecionada && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>
        {idx < questoes.length - 1 ? (
          <Button onClick={() => setIdx(i => Math.min(questoes.length-1, i+1))}>
            Próxima <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => finalizar.mutate()} disabled={finalizar.isPending} className="bg-gradient-hero">
            {finalizar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
            Finalizar simulado
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
