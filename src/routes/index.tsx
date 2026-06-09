import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, Sparkles, PenLine, Brain, Trophy, Zap, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chatifação – Estude para o ENEM com IA" },
      { name: "description", content: "Correção de redação ENEM, IA Professora e simulados. A plataforma brasileira de estudos com inteligência artificial." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-elegant">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Chatifação</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-gradient-hero shadow-elegant">Começar grátis</Button></Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto max-w-6xl px-4 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> IA real treinada para o ENEM
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            Estude com a IA <span className="text-gradient">mais inteligente</span> do Brasil
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Correção de redação nota 1000, professora particular 24h e simulados oficiais.
            Tudo numa plataforma criada para estudantes brasileiros.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-hero shadow-elegant hover:shadow-glow">
                Começar grátis <Zap className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#recursos">
              <Button size="lg" variant="outline">Ver recursos</Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão de crédito • 3 redações grátis por mês
          </p>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="container mx-auto max-w-6xl px-4 py-20">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Tudo que você precisa para passar</h2>
          <p className="mt-3 text-muted-foreground">Ferramentas reais, IA real, resultados reais.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: PenLine, title: "Redação ENEM", desc: "Correção automática com as 5 competências. Nota de 0 a 1000 e feedback detalhado em segundos." , color: "from-blue-500 to-cyan-500"},
            { icon: Brain, title: "IA Professora", desc: "Tire dúvidas, peça explicações passo a passo e gere exercícios personalizados a qualquer hora.", color: "from-violet-500 to-purple-500"},
            { icon: Trophy, title: "Simulados oficiais", desc: "Banco de questões do ENEM, OBMEP e vestibulares. Em breve com ranking nacional." , color: "from-emerald-500 to-teal-500"},
          ].map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-all hover:shadow-elegant">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-elegant`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section className="container mx-auto max-w-5xl px-4 py-20">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Planos para todo bolso</h2>
          <p className="mt-3 text-muted-foreground">Comece grátis. Faça upgrade quando quiser ir mais longe.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-8 shadow-card">
            <h3 className="text-xl font-semibold">Gratuito</h3>
            <p className="mt-1 text-sm text-muted-foreground">Para começar agora</p>
            <p className="mt-6 text-4xl font-extrabold">R$ 0<span className="text-base font-normal text-muted-foreground">/mês</span></p>
            <ul className="mt-6 space-y-3 text-sm">
              {["3 redações por mês","20 perguntas para a IA por dia","1 simulado por semana","Histórico básico"].map(i => (
                <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {i}</li>
              ))}
            </ul>
            <Link to="/auth" className="mt-8 block"><Button variant="outline" className="w-full">Começar grátis</Button></Link>
          </div>
          <div className="relative rounded-2xl border-2 border-primary bg-gradient-card p-8 shadow-elegant">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-hero px-3 py-1 text-xs font-semibold text-primary-foreground">
              Mais popular
            </div>
            <h3 className="text-xl font-semibold">Premium</h3>
            <p className="mt-1 text-sm text-muted-foreground">Para quem quer passar</p>
            <p className="mt-6 text-4xl font-extrabold">R$ 29,90<span className="text-base font-normal text-muted-foreground">/mês</span></p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Redações ilimitadas","IA Professora ilimitada","Simulados ilimitados","Plano de estudos personalizado","Relatórios avançados","Ranking nacional"].map(i => (
                <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {i}</li>
              ))}
            </ul>
            <Link to="/auth" className="mt-8 block"><Button className="w-full bg-gradient-hero shadow-elegant">Assinar Premium</Button></Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">Pagamento em breve</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-10">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Chatifação. Feito com IA para estudantes brasileiros.
        </div>
      </footer>
    </div>
  );
}
