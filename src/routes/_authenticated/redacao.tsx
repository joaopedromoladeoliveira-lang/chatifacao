import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { corrigirRedacao } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PenLine, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/redacao")({
  head: () => ({ meta: [{ title: "Redação – Chatifação" }] }),
  component: RedacaoPage,
});

function RedacaoPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const corrigirFn = useServerFn(corrigirRedacao);
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: redacoes } = useQuery({
    queryKey: ["redacoes", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("redacoes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const wordCount = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (texto.trim().length < 50) return toast.error("A redação precisa ter ao menos 50 caracteres");
    setLoading(true);
    try {
      const { id } = await corrigirFn({ data: { tema, texto } });
      toast.success("Redação corrigida!");
      setTema(""); setTexto("");
      await qc.invalidateQueries({ queryKey: ["redacoes", user.id] });
      await qc.invalidateQueries({ queryKey: ["stats", user.id] });
      setOpenId(id);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao corrigir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Redação ENEM</h1>
        <p className="text-muted-foreground">Envie sua redação e receba a correção nas 5 competências em segundos.</p>
      </div>

      <Tabs defaultValue="nova">
        <TabsList>
          <TabsTrigger value="nova">Nova redação</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({redacoes?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="nova" className="mt-6">
          <form onSubmit={submit} className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="space-y-2">
              <Label htmlFor="tema">Tema da redação</Label>
              <Input id="tema" required value={tema} onChange={(e) => setTema(e.target.value)} placeholder='Ex: "Desafios da educação digital no Brasil"' />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="texto">Sua redação</Label>
                <span className="text-xs text-muted-foreground">{wordCount} palavras</span>
              </div>
              <Textarea id="texto" required rows={16} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva ou cole sua redação aqui (dissertativo-argumentativo)..." className="resize-y" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">A correção segue os critérios oficiais do ENEM.</p>
              <Button type="submit" disabled={loading || !tema.trim() || texto.trim().length < 50} className="bg-gradient-hero shadow-elegant">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Corrigindo...</> : <><Sparkles className="mr-2 h-4 w-4" /> Corrigir redação</>}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          {(!redacoes || redacoes.length === 0) ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <PenLine className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Você ainda não enviou nenhuma redação.
            </div>
          ) : (
            <div className="space-y-3">
              {redacoes.map((r: any) => (
                <RedacaoItem key={r.id} r={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RedacaoItem({ r, open, onToggle }: { r: any; open: boolean; onToggle: () => void }) {
  const total = r.nota_total as number | null;
  const corrigida = r.status === "corrigida";
  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <button onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{r.tema}</p>
          <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-3">
          {r.status === "pendente" && <span className="text-xs text-muted-foreground">Pendente</span>}
          {r.status === "erro" && <span className="text-xs text-destructive">Erro</span>}
          {corrigida && (
            <div className={cn("rounded-full px-3 py-1 text-sm font-bold", scoreColor(total ?? 0))}>
              {total}/1000
            </div>
          )}
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-90")} />
        </div>
      </button>

      {open && corrigida && (
        <div className="border-t p-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-5">
            {(["c1","c2","c3","c4","c5"] as const).map((c, i) => {
              const v = r[`nota_${c}`] as number;
              return (
                <div key={c} className="rounded-xl border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Competência {i+1}</p>
                  <p className="mt-1 text-xl font-bold">{v}<span className="text-xs font-normal text-muted-foreground">/200</span></p>
                  <Progress value={(v/200)*100} className="mt-2 h-1.5" />
                </div>
              );
            })}
          </div>
          {r.feedback_geral && (
            <div>
              <h4 className="mb-1 font-semibold">Feedback</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.feedback_geral}</p>
            </div>
          )}
          {r.sugestoes && (
            <div>
              <h4 className="mb-1 font-semibold">Sugestões de melhoria</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.sugestoes}</p>
            </div>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Ver redação enviada</summary>
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{r.texto}</p>
          </details>
        </div>
      )}
    </div>
  );
}

function scoreColor(n: number) {
  if (n >= 800) return "bg-success/15 text-success";
  if (n >= 600) return "bg-warning/15 text-warning-foreground";
  return "bg-destructive/15 text-destructive";
}
