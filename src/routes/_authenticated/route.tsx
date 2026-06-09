import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, MessageSquare, PenLine, LayoutDashboard, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    router.navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/app", label: "Painel", icon: LayoutDashboard },
    { to: "/ia", label: "IA Professora", icon: MessageSquare },
    { to: "/redacao", label: "Redação", icon: PenLine },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/app" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Chatifação</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(item => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Sair</span>
          </Button>
        </div>
        {/* Mobile nav */}
        <div className="border-t border-border/60 px-2 py-2 md:hidden">
          <div className="flex justify-around">
            {nav.map(item => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className="flex-1">
                  <Button variant={active ? "secondary" : "ghost"} size="sm" className="w-full gap-2 text-xs">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}


