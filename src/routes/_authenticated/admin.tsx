import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  checkIsAdmin,
  listUsersAdmin,
  getAdminStats,
  concederPremium,
  removerPremium,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, Search, Users, FileText, MessageSquare, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { isAdmin } = await checkIsAdmin();
    if (!isAdmin) throw redirect({ to: "/app" });
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const statsFn = useServerFn(getAdminStats);
  const listFn = useServerFn(listUsersAdmin);
  const concederFn = useServerFn(concederPremium);
  const removerFn = useServerFn(removerPremium);

  const [search, setSearch] = useState("");

  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn() });
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });

  const conceder = useMutation({
    mutationFn: (v: { userId: string; dias: number | null; vitalicio: boolean }) =>
      concederFn({ data: v }),
    onSuccess: () => {
      toast.success("Premium concedido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (userId: string) => removerFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Premium removido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero">
          <Crown className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, planos e estatísticas</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="Usuários" value={stats?.usuarios ?? 0} />
        <StatCard icon={Crown} label="Premium ativos" value={stats?.premiumAtivos ?? 0} />
        <StatCard icon={FileText} label="Redações" value={stats?.redacoes ?? 0} />
        <StatCard icon={MessageSquare} label="Conversas IA" value={stats?.conversas ?? 0} />
        <StatCard icon={Sparkles} label="Mensagens IA" value={stats?.mensagens ?? 0} />
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Usuário</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Premium até</th>
                <th className="py-3 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {users?.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{u.nome || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    {u.isAdmin ? (
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Admin
                      </span>
                    ) : u.isPremiumAtivo ? (
                      <span className="inline-flex rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Premium
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Gratuito
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {u.premium_vitalicio
                      ? "Vitalício"
                      : u.premium_ate
                        ? new Date(u.premium_ate).toLocaleDateString("pt-BR")
                        : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={u.isAdmin || conceder.isPending}
                        onClick={() => conceder.mutate({ userId: u.id, dias: 30, vitalicio: false })}
                      >
                        +30d
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={u.isAdmin || conceder.isPending}
                        onClick={() => conceder.mutate({ userId: u.id, dias: 90, vitalicio: false })}
                      >
                        +90d
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={u.isAdmin || conceder.isPending}
                        onClick={() => conceder.mutate({ userId: u.id, dias: 365, vitalicio: false })}
                      >
                        +1 ano
                      </Button>
                      <Button
                        size="sm"
                        disabled={u.isAdmin || conceder.isPending}
                        onClick={() => conceder.mutate({ userId: u.id, dias: null, vitalicio: true })}
                      >
                        <Crown className="mr-1 h-3 w-3" /> Vitalício
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={u.isAdmin || !u.isPremiumAtivo || remover.isPending}
                        onClick={() => remover.mutate(u.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !users?.length && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}
