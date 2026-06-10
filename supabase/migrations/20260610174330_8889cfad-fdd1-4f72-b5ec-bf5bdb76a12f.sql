
-- SIMULADOS
CREATE TABLE public.simulados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL, -- 'ENEM' | 'OBMEP' | 'PROVA_PAULISTA' | 'VESTIBULAR' | 'OUTRO'
  materia text, -- 'Matemática', 'Português', 'Multidisciplinar', etc
  dificuldade text NOT NULL DEFAULT 'medio', -- 'facil' | 'medio' | 'dificil'
  duracao_minutos integer NOT NULL DEFAULT 60,
  publicado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.simulados TO authenticated;
GRANT ALL ON public.simulados TO service_role;
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "simulados_select_publicados" ON public.simulados FOR SELECT TO authenticated USING (publicado = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "simulados_admin_all" ON public.simulados FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- QUESTOES
CREATE TABLE public.questoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id uuid NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  enunciado text NOT NULL,
  alternativa_a text NOT NULL,
  alternativa_b text NOT NULL,
  alternativa_c text NOT NULL,
  alternativa_d text NOT NULL,
  alternativa_e text,
  correta text NOT NULL CHECK (correta IN ('A','B','C','D','E')),
  explicacao text,
  materia text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questoes TO authenticated;
GRANT ALL ON public.questoes TO service_role;
ALTER TABLE public.questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questoes_select_all" ON public.questoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "questoes_admin_all" ON public.questoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TENTATIVAS
CREATE TABLE public.tentativas_simulado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulado_id uuid NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  total_questoes integer NOT NULL,
  acertos integer NOT NULL DEFAULT 0,
  pontuacao numeric(5,2) NOT NULL DEFAULT 0, -- 0-100
  tempo_segundos integer,
  status text NOT NULL DEFAULT 'em_andamento' -- 'em_andamento' | 'finalizada'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tentativas_simulado TO authenticated;
GRANT ALL ON public.tentativas_simulado TO service_role;
ALTER TABLE public.tentativas_simulado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tentativas_own" ON public.tentativas_simulado FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);

-- RESPOSTAS
CREATE TABLE public.respostas_questao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tentativa_id uuid NOT NULL REFERENCES public.tentativas_simulado(id) ON DELETE CASCADE,
  questao_id uuid NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  resposta text CHECK (resposta IN ('A','B','C','D','E')),
  correta boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tentativa_id, questao_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.respostas_questao TO authenticated;
GRANT ALL ON public.respostas_questao TO service_role;
ALTER TABLE public.respostas_questao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "respostas_own" ON public.respostas_questao FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = user_id);

-- NOTIFICACOES
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info', -- info | sucesso | aviso
  lida boolean NOT NULL DEFAULT false,
  criada_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own_or_broadcast" ON public.notificacoes FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "notif_update_own" ON public.notificacoes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_admin_insert" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "notif_admin_delete" ON public.notificacoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SEED: 3 simulados de exemplo
DO $$
DECLARE
  s_enem uuid := gen_random_uuid();
  s_obmep uuid := gen_random_uuid();
  s_paulista uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.simulados (id, titulo, descricao, tipo, materia, dificuldade, duracao_minutos) VALUES
    (s_enem, 'ENEM — Matemática Essencial', 'Mini-simulado com 5 questões de matemática básica do estilo ENEM.', 'ENEM', 'Matemática', 'medio', 30),
    (s_obmep, 'OBMEP — Raciocínio Lógico', '5 questões de raciocínio lógico no estilo OBMEP.', 'OBMEP', 'Matemática', 'medio', 30),
    (s_paulista, 'Prova Paulista — Português', '5 questões de interpretação de texto no estilo Prova Paulista.', 'PROVA_PAULISTA', 'Português', 'facil', 25);

  -- ENEM Matemática
  INSERT INTO public.questoes (simulado_id, ordem, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, correta, explicacao, materia) VALUES
  (s_enem, 1, 'Em uma loja, uma camisa que custava R$ 80 teve um desconto de 25%. Qual o novo preço?', 'R$ 55', 'R$ 60', 'R$ 65', 'R$ 70', 'R$ 75', 'B', '25% de 80 = 20. Novo preço: 80 - 20 = 60.', 'Matemática'),
  (s_enem, 2, 'Qual é o valor de 2³ + 3²?', '13', '17', '15', '11', '19', 'B', '2³ = 8 e 3² = 9. Soma: 8 + 9 = 17.', 'Matemática'),
  (s_enem, 3, 'Se f(x) = 2x + 3, qual o valor de f(5)?', '10', '11', '12', '13', '14', 'D', 'f(5) = 2·5 + 3 = 10 + 3 = 13.', 'Matemática'),
  (s_enem, 4, 'A média aritmética de 4, 8, 10 e 14 é:', '8', '9', '10', '11', '12', 'B', 'Soma = 36; média = 36/4 = 9.', 'Matemática'),
  (s_enem, 5, 'Um carro percorre 240 km em 3 horas. Qual a velocidade média?', '60 km/h', '70 km/h', '80 km/h', '90 km/h', '100 km/h', 'C', 'V = 240/3 = 80 km/h.', 'Matemática');

  -- OBMEP
  INSERT INTO public.questoes (simulado_id, ordem, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, correta, explicacao, materia) VALUES
  (s_obmep, 1, 'Quantos números de 2 dígitos são divisíveis por 7?', '12', '13', '14', '15', '16', 'B', 'Menor: 14. Maior: 98. Quantidade: (98-14)/7 + 1 = 13.', 'Matemática'),
  (s_obmep, 2, 'Se hoje é quarta-feira, que dia será daqui a 100 dias?', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Sexta', 'E', '100 mod 7 = 2. Quarta + 2 dias = Sexta.', 'Matemática'),
  (s_obmep, 3, 'A soma dos ângulos internos de um pentágono é:', '360°', '450°', '540°', '630°', '720°', 'C', '(n-2)·180 = 3·180 = 540°.', 'Matemática'),
  (s_obmep, 4, 'Qual o próximo número da sequência: 2, 6, 12, 20, 30, ...?', '36', '40', '42', '44', '48', 'C', 'Diferenças: 4, 6, 8, 10, 12 → próximo = 30+12 = 42.', 'Matemática'),
  (s_obmep, 5, 'Em um grupo de 30 pessoas, 18 gostam de café e 15 de chá. Se 8 gostam de ambos, quantas não gostam de nenhum?', '3', '4', '5', '6', '7', 'C', 'Gostam de pelo menos um: 18+15-8 = 25. Nenhum: 30-25 = 5.', 'Matemática');

  -- Prova Paulista — Português
  INSERT INTO public.questoes (simulado_id, ordem, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, correta, explicacao, materia) VALUES
  (s_paulista, 1, 'Assinale a alternativa em que TODAS as palavras estão grafadas corretamente:', 'excessão, paralisar, beneficiente', 'exceção, paralisar, beneficente', 'exceção, paralizar, beneficiente', 'excessão, paralizar, beneficente', 'eseção, paralisar, beneficente', 'B', 'A grafia correta é: exceção, paralisar, beneficente.', 'Português'),
  (s_paulista, 2, 'Qual o plural de "cidadão"?', 'cidadões', 'cidadãos', 'cidadães', 'cidadans', 'cidadons', 'B', 'O plural correto é cidadãos.', 'Português'),
  (s_paulista, 3, 'A figura de linguagem em "Seus olhos são duas estrelas" é:', 'Metonímia', 'Hipérbole', 'Metáfora', 'Antítese', 'Ironia', 'C', 'É uma comparação implícita: metáfora.', 'Português'),
  (s_paulista, 4, 'Identifique o sujeito em "Choveu muito ontem":', 'Choveu', 'muito', 'ontem', 'Sujeito oculto', 'Oração sem sujeito', 'E', 'Verbos que indicam fenômeno natural formam oração sem sujeito.', 'Português'),
  (s_paulista, 5, 'Qual a função sintática de "ao parque" em "Fui ao parque ontem"?', 'Sujeito', 'Objeto direto', 'Objeto indireto', 'Adjunto adverbial de lugar', 'Predicativo', 'D', 'Indica lugar, é adjunto adverbial de lugar.', 'Português');
END $$;
