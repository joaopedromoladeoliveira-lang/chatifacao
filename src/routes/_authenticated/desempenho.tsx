import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDesempenho } from "@/lib/simulados.functions";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Legend,
} from "recharts";
import { TrendingUp, Target, MessageSquare, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/desempenho")({
  head: () => ({ meta: [{ title: "Desempenho – Chatifação" }] }),
  component: DesempenhoPage,
});

function DesempenhoPage() {
  const fn = useServerFn(getDesempenho);
  const { data, isLoading } = useQuery({ queryKey: ["desempenho"], queryFn: () => fn() });

  if (isLoading) return <div className="container mx-auto px-4 py-10">Carregando...</div>;
  if (!data) return null;

  const redacoes = data.redacoes;
  const tentativas = data.tentativas;

  const mediaRedacao = redacoes.length
    ? Math.round(redacoes.reduce((s: number, r: any) => s + (r.nota_total ?? 0), 0) / redacoes.length)
    : 0;
  const mediaSimulado = tentativas.length
    ? Math.round(tentativas.reduce((s: number, t: any) => s + Number(t.pontuacao), 0) / tentativas.length)
    : 0;

  const evolucaoRedacao = redacoes.map((r: any, i: number) => ({
    name: `R${i+1}`,
    nota: r.nota_total,
    data: new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }));

  const competenciasMedia = redacoes.length ? [
    { competencia: "C1", media: avg(redacoes, "nota_c1") },
    { competencia: "C2", media: avg(redacoes, "nota_c2") },
    { competencia: "C3", media: avg(redacoes, "nota_c3") },
    { competencia: "C4", media: avg(redacoes, "nota_c4") },
    { competencia: "C5", media: avg(redacoes, "nota_c5") },
  ] : [];

  // Desempenho por matéria nos simulados
  const porMateria: Record<string, { acertos: number; total: number }> = {};
  tentativas.forEach((t: any) => {
    const m = t.simulados?.materia ?? "Outro";
    if (!porMateria[m]) porMateria[m] = { acertos: 0, total: 0 };
    porMateria[m].acertos += t.acertos;
    porMateria[m].total += t.total_questoes;
  });
  const materiasData = Object.entries(porMateria).map(([materia, v]) => ({
    materia,
    pct: v.total ? Math.round((v.acertos / v.total) * 100) : 0,
  }));

  // Estimativa de nota ENEM (redação) baseada em tendência
  const enemEstimado = enemEstimate(redacoes);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Seu Desempenho</h1>
        <p className="text-muted-foreground">Acompanhe sua evolução e identifique pontos para melhorar.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Média de redação" value={`${mediaRedacao}/1000`} hint={`${redacoes.length} corrigidas`} />
        <StatCard icon={Trophy} label="Média de simulados" value={`${mediaSimulado}%`} hint={`${tentativas.length} feitos`} />
        <StatCard icon={Target} label="Nota ENEM estimada" value={enemEstimado ? `${enemEstimado}` : "—"} hint={enemEstimado ? "Baseada em tendência" : "Faça mais redações"} />
        <StatCard icon={MessageSquare} label="Mensagens IA" value={String(data.mensagensIA)} hint="Total enviadas" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Evolução das notas de redação">
          {evolucaoRedacao.length >= 2 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolucaoRedacao}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" className="text-xs" />
                <YAxis domain={[0, 1000]} className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="nota" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty msg="Envie pelo menos 2 redações para ver a evolução." />}
        </Card>

        <Card title="Pontos fortes e fracos por competência (ENEM)">
          {competenciasMedia.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={competenciasMedia}>
                <PolarGrid />
                <PolarAngleAxis dataKey="competencia" className="text-xs" />
                <PolarRadiusAxis angle={90} domain={[0, 200]} />
                <Radar name="Média" dataKey="media" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <Empty msg="Corrija sua primeira redação para ver competências." />}
        </Card>

        <Card title="Desempenho por matéria (simulados)">
          {materiasData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={materiasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="materia" className="text-xs" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="pct" name="% acertos" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty msg="Faça um simulado para ver desempenho por matéria." />}
        </Card>

        <Card title="Análise inteligente">
          <Analise mediaRedacao={mediaRedacao} mediaSimulado={mediaSimulado} competencias={competenciasMedia} materias={materiasData} enem={enemEstimado} />
        </Card>
      </div>
    </div>
  );
}

function avg(arr: any[], key: string) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, r) => s + (r[key] ?? 0), 0) / arr.length);
}

function enemEstimate(redacoes: any[]): number | null {
  if (!redacoes.length) return null;
  // Pondera as 3 últimas com peso maior
  const last3 = redacoes.slice(-3);
  const media = last3.reduce((s, r) => s + (r.nota_total ?? 0), 0) / last3.length;
  return Math.round(media);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">{msg}</div>;
}

function Analise({ mediaRedacao, mediaSimulado, competencias, materias, enem }: any) {
  if (!mediaRedacao && !mediaSimulado) {
    return <p className="text-sm text-muted-foreground">Faça pelo menos uma redação ou simulado para receber uma análise personalizada.</p>;
  }
  const piorComp = competencias.length ? [...competencias].sort((a, b) => a.media - b.media)[0] : null;
  const melhorComp = competencias.length ? [...competencias].sort((a, b) => b.media - a.media)[0] : null;
  const piorMat = materias.length ? [...materias].sort((a: any, b: any) => a.pct - b.pct)[0] : null;

  return (
    <div className="space-y-3 text-sm">
      {enem && (
        <p>📊 Sua <b>nota ENEM de redação estimada</b> é <b className="text-primary">{enem}/1000</b>, baseada na média das suas redações mais recentes.</p>
      )}
      {melhorComp && piorComp && melhorComp.competencia !== piorComp.competencia && (
        <p>✅ Seu ponto forte é a <b>{melhorComp.competencia}</b> ({melhorComp.media}/200). Continue assim!</p>
      )}
      {piorComp && piorComp.media < 140 && (
        <p>⚠️ Foque na <b>{piorComp.competencia}</b> ({piorComp.media}/200) — é onde você pode ganhar mais pontos. Use a <b>IA Professora</b> para tirar dúvidas dessa competência.</p>
      )}
      {piorMat && piorMat.pct < 60 && (
        <p>📚 Em <b>{piorMat.materia}</b> você acerta {piorMat.pct}% — vale revisar conteúdo e praticar mais simulados dessa matéria.</p>
      )}
      {mediaRedacao >= 700 && <p>🚀 Sua média de redação já está acima de 700 — você está em um nível competitivo para vestibulares!</p>}
      <p className="text-xs text-muted-foreground">Análise calculada a partir dos seus dados reais armazenados na plataforma.</p>
    </div>
  );
}
