import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage, createConversa } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [{ title: "IA Professora – Chatifação" }] }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };

function ChatPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendFn = useServerFn(sendChatMessage);
  const createFn = useServerFn(createConversa);

  const { data: conversas } = useQuery({
    queryKey: ["conversas", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("conversas_ia").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["mensagens", activeId],
    queryFn: async () => {
      if (!activeId) return [] as Msg[];
      const { data } = await supabase.from("mensagens_ia").select("id,role,content").eq("conversa_id", activeId).order("created_at", { ascending: true });
      return (data ?? []) as Msg[];
    },
    enabled: !!activeId,
  });

  useEffect(() => {
    if (!activeId && conversas && conversas.length > 0) setActiveId(conversas[0].id);
  }, [conversas, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function newConversa() {
    try {
      const { id } = await createFn();
      await qc.invalidateQueries({ queryKey: ["conversas", user.id] });
      setActiveId(id);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar conversa");
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;
    let convId = activeId;
    if (!convId) {
      try {
        const { id } = await createFn();
        convId = id;
        setActiveId(id);
        await qc.invalidateQueries({ queryKey: ["conversas", user.id] });
      } catch { toast.error("Erro ao iniciar conversa"); return; }
    }
    setInput("");
    setSending(true);
    // Optimistic
    const optimistic: Msg = { id: "tmp-" + Date.now(), role: "user", content: msg };
    qc.setQueryData<Msg[]>(["mensagens", convId], (old) => [...(old ?? []), optimistic]);
    try {
      await sendFn({ data: { conversaId: convId!, message: msg } });
      await refetchMessages();
      await qc.invalidateQueries({ queryKey: ["conversas", user.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar mensagem");
      await refetchMessages();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="hidden md:block">
          <Button onClick={newConversa} className="w-full bg-gradient-hero"><Plus className="mr-2 h-4 w-4" /> Nova conversa</Button>
          <div className="mt-4 space-y-1">
            {(conversas ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                  activeId === c.id ? "bg-secondary font-medium" : "hover:bg-muted"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.titulo}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <section className="flex h-[calc(100vh-180px)] flex-col rounded-2xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">IA Professora</h2>
                <p className="text-xs text-muted-foreground">Pronta para tirar suas dúvidas</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={newConversa} className="md:hidden"><Plus className="h-4 w-4" /></Button>
          </div>

          <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef as any}>
            <div className="mx-auto max-w-2xl space-y-4">
              {(!messages || messages.length === 0) && !sending && (
                <EmptyState onPick={(q) => { setInput(q); setTimeout(() => handleSend(), 50); }} />
              )}
              {(messages ?? []).map((m) => <MessageBubble key={m.id} msg={m} />)}
              {sending && (
                <div className="flex gap-3">
                  <Avatar role="assistant" />
                  <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                    <Dot /><Dot delay="150ms" /><Dot delay="300ms" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSend} className="border-t p-4">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Pergunte qualquer coisa sobre seus estudos..."
                rows={2}
                className="resize-none"
                disabled={sending}
              />
              <Button type="submit" disabled={sending || !input.trim()} className="bg-gradient-hero">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const suggestions = [
    "Me explique a Revolução Industrial em 5 pontos",
    "Resolva passo a passo: integral de x² dx",
    "Crie 5 questões de função quadrática nível ENEM",
    "Como melhorar minha redação em 30 dias?",
  ];
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero shadow-elegant">
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <h3 className="text-xl font-semibold">Olá! Como posso te ajudar hoje?</h3>
      <p className="mt-1 text-sm text-muted-foreground">Escolha uma sugestão ou faça sua própria pergunta.</p>
      <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => onPick(s)} className="rounded-xl border bg-card p-3 text-left text-sm hover:border-primary hover:shadow-card">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={msg.role} />
      <div
        className={cn(
          "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm",
          isUser ? "bg-gradient-hero text-primary-foreground" : "bg-muted"
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}

function Avatar({ role }: { role: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", isUser ? "bg-secondary" : "bg-gradient-hero text-primary-foreground")}>
      {isUser ? "Eu" : "IA"}
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: delay }} />;
}
