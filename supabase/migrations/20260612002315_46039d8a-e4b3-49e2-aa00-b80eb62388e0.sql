
-- =========== LOGS DE EVENTOS ===========
CREATE TABLE public.logs_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem TEXT NOT NULL CHECK (origem IN ('stripe', 'ia', 'sistema')),
  tipo TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'erro', 'aviso')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mensagem TEXT,
  payload JSONB,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.logs_eventos TO authenticated;
GRANT ALL ON public.logs_eventos TO service_role;
ALTER TABLE public.logs_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem todos os logs"
ON public.logs_eventos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_logs_eventos_created_at ON public.logs_eventos (created_at DESC);
CREATE INDEX idx_logs_eventos_origem ON public.logs_eventos (origem, status, created_at DESC);

-- =========== SIMULADOS IA (DINÂMICOS) ===========
CREATE TABLE public.simulados_ia_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  area TEXT NOT NULL,
  questoes JSONB NOT NULL,
  respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
  nota NUMERIC,
  acertos INTEGER,
  total INTEGER NOT NULL,
  finalizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulados_ia_sessoes TO authenticated;
GRANT ALL ON public.simulados_ia_sessoes TO service_role;
ALTER TABLE public.simulados_ia_sessoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia suas sessões"
ON public.simulados_ia_sessoes FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin vê todas sessões"
ON public.simulados_ia_sessoes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER simulados_ia_sessoes_updated_at
BEFORE UPDATE ON public.simulados_ia_sessoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_simulados_ia_user ON public.simulados_ia_sessoes (user_id, created_at DESC);
