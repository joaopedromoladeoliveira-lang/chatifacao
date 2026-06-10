import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha – Chatifação" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessao, setSessao] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase trata o token do hash automaticamente; basta termos sessão
    supabase.auth.getSession().then(({ data }) => setSessao(!!data.session));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (senha !== confirma) return toast.error("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada! Redirecionando...");
    setTimeout(() => navigate({ to: "/app" }), 1200);
  }

  return (
    <div className="min-h-screen bg-gradient-card flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Chatifação</span>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-elegant">
          <h1 className="text-xl font-bold">Definir nova senha</h1>

          {sessao === false ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Link inválido ou expirado. Solicite um novo em <a href="/forgot-password" className="text-primary hover:underline">esqueci minha senha</a>.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirma">Confirmar senha</Label>
                <Input id="confirma" type="password" required value={confirma} onChange={(e) => setConfirma(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-hero">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
