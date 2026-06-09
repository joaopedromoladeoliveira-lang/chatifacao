
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  plano TEXT NOT NULL DEFAULT 'gratuito' CHECK (plano IN ('gratuito', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- REDAÇÕES
CREATE TABLE public.redacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tema TEXT NOT NULL,
  texto TEXT NOT NULL,
  nota_total INTEGER,
  nota_c1 INTEGER,
  nota_c2 INTEGER,
  nota_c3 INTEGER,
  nota_c4 INTEGER,
  nota_c5 INTEGER,
  feedback_geral TEXT,
  sugestoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','corrigida','erro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redacoes TO authenticated;
GRANT ALL ON public.redacoes TO service_role;
ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redacoes_select_own" ON public.redacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "redacoes_insert_own" ON public.redacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "redacoes_update_own" ON public.redacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "redacoes_delete_own" ON public.redacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER redacoes_set_updated_at BEFORE UPDATE ON public.redacoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_redacoes_user ON public.redacoes(user_id, created_at DESC);

-- CONVERSAS IA
CREATE TABLE public.conversas_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversas_ia TO authenticated;
GRANT ALL ON public.conversas_ia TO service_role;
ALTER TABLE public.conversas_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversas_select_own" ON public.conversas_ia FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conversas_insert_own" ON public.conversas_ia FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversas_update_own" ON public.conversas_ia FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversas_delete_own" ON public.conversas_ia FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER conversas_set_updated_at BEFORE UPDATE ON public.conversas_ia FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_conversas_user ON public.conversas_ia(user_id, updated_at DESC);

-- MENSAGENS IA
CREATE TABLE public.mensagens_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.conversas_ia(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_ia TO authenticated;
GRANT ALL ON public.mensagens_ia TO service_role;
ALTER TABLE public.mensagens_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensagens_select_own" ON public.mensagens_ia FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mensagens_insert_own" ON public.mensagens_ia FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mensagens_delete_own" ON public.mensagens_ia FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_mensagens_conversa ON public.mensagens_ia(conversa_id, created_at);
