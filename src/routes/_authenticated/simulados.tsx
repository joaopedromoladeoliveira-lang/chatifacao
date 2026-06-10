import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSimulados, iniciarSimulado, listMinhasTentativas } from "@/lib/simulados.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ClipboardList, Play, Clock, BookOpen, Trophy, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/simulados")({
  head: () => ({ meta: [{ title: "Simulados – Chatifação" }] }),
  component: SimuladosPage,
});

function SimuladosPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listSimulados);
  const iniciarFn = useServerFn(iniciarSimulado);
  const tentFn = useServerFn(listMinhasTentativas);

  const { data: simulados } = useQuery({ queryKey: ["simulados"], queryFn: () => listFn() });
  const { data: tentativas } = useQuery({ queryKey: ["minhas-tentativas"], queryFn: () => tentFn() });

  const iniciar = useMutation({
    mutationFn: (id: string) => iniciarFn({ data: { simuladoId: id } }),
    onSuccess: ({ tentativaId }) => {
      navigate({ to: "/simulado/$id", params: { id: tentativaId } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Simulados</h1>
        <p className="text-muted-foreground">Pratique com simulados de ENEM, OBMEP, Prova Paulista e mais.</p>
      </div>

      <Tabs defaultValue="disponiveis">
        <TabsList>
          <TabsTrigger value="disponiveis">Disponíveis</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({tentativas?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="disponiveis" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {simulados?.map((s: any) => (
              <div key={s.id} className="rounded-2xl border bg-card p-5 shadow-card">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{s.tipo}</span>
                  {s.materia && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{s.materia}</span>}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{s.dificuldade}</span>
                </div>
                <h3 className="text-lg font-semibold">{s.titulo}</h3>
                {s.descricao && <p className="mt-1 text-sm text-muted-foreground">{s.descricao}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duracao_minutos} min</span>
                </div>
                <Button
                  className="mt-4 w-full bg-gradient-hero"
                  disabled={iniciar.isPending}
                  onClick={() => iniciar.mutate(s.id)}
                >
                  <Play className="mr-2 h-4 w-4" /> Iniciar simulado
                </Button>
              </div>
            ))}
            {!simulados?.length && (
              <div className="col-span-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-50" />
                Nenhum simulado disponível ainda.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          {!tentativas?.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Você ainda não fez nenhum simulado.
            </div>
          ) : (
            <div className="space-y-2">
              {tentativas.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
                  <div>
                    <p className="font-medium">{t.simulados?.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.iniciado_em).toLocaleDateString("pt-BR")} • {t.simulados?.tipo}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.status === "finalizada" ? (
                      <>
                        <div className="text-right">
                          <p className="text-sm font-bold">{t.acertos}/{t.total_questoes}</p>
                          <p className="text-xs text-muted-foreground">{Number(t.pontuacao).toFixed(0)}%</p>
                        </div>
                        <Trophy className="h-5 w-5 text-success" />
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => navigate({ to: "/simulado/$id", params: { id: t.id } })}>
                        Continuar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
