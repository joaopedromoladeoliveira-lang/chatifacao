# Fase 2 – Pagamentos, Admin e Análise de Desempenho

Vou implementar em **3 blocos** para manter cada entrega testável. Antes de começar, preciso confirmar 2 pontos importantes.

---

## ⚠️ Decisões necessárias antes de codar

### 1. Stripe – PIX não suporta cartões internacionais juntos da forma que você pediu
Você escolheu antes **"Stripe sem PIX"**, mas agora pediu **PIX + Cartão**. Stripe oficial **suporta PIX no Brasil**, porém:
- Exige conta Stripe **brasileira** (CNPJ/CPF BR) com Pix ativado.
- A integração nativa do Lovable (Stripe seamless) **não habilita PIX** — só cartão internacional.

**Opções:**
- **(A) Stripe seamless do Lovable** → só cartão (crédito/débito internacional). Mais rápido, sem conta própria. *Sem PIX.*
- **(B) Stripe BYOK** (sua chave Stripe BR) → cartão + PIX + boleto. Você precisa criar conta Stripe BR e me passar a `STRIPE_SECRET_KEY`.
- **(C) Mercado Pago / Asaas** (BYOK) → PIX + cartão nativos do Brasil, melhor UX para alunos brasileiros.

### 2. Preços dos planos
Preciso dos valores para criar os produtos. Sugestão:
- Mensal: R$ 29,90
- Trimestral: R$ 74,90 (R$ 24,97/mês)
- Anual: R$ 239,90 (R$ 19,99/mês)

Confirma esses ou me passa os seus?

---

## Bloco A – Sistema de Roles e Admin (faço primeiro, sem depender de pagamento)

**Banco:**
- Enum `app_role` (`admin`, `user`).
- Tabela `user_roles` (user_id, role) com RLS e função `has_role()` SECURITY DEFINER.
- Trigger: ao criar usuário com email `joaopedromoladeoliveira@gmail.com`, atribui role `admin` automaticamente.
- Adicionar em `profiles`: `premium_ate` (timestamp, null = sem premium), `premium_vitalicio` (bool), `premium_concedido_por` (uuid admin).
- Função `is_premium(user_id)` → true se admin OR vitalício OR `premium_ate > now()`.

**Painel `/admin` (só admins):**
- Lista de usuários com busca (nome/email), plano atual, status premium.
- Ações por usuário: Conceder Premium (30/90/365 dias ou Vitalício), Remover Premium, Ver histórico.
- Estatísticas gerais: total de usuários, redações corrigidas, conversas IA, assinaturas ativas.
- Tabela `historico_premium` para auditoria das concessões manuais.

**Gates de plano gratuito** (aplicados em redação e chat IA):
- Free: 3 redações/mês, 20 mensagens IA/dia.
- Premium/Admin: ilimitado.
- Server functions checam `is_premium()` antes de chamar OpenAI.

---

## Bloco B – Pagamentos (depende da resposta da decisão 1)

Se **(A) Stripe seamless**: habilito via `enable_stripe_payments`, crio 3 produtos (mensal/trimestral/anual), checkout + webhook que atualiza `premium_ate` no profile. Sem PIX.

Se **(B) Stripe BYOK** ou **(C) MP/Asaas**: te peço a secret key, monto edge function de checkout com PIX + cartão e webhook que escuta eventos de pagamento aprovado e estende `premium_ate`.

Página `/planos`:
- 3 cards (Mensal/Trimestral/Anual) com preços e benefícios.
- Botão "Assinar" → checkout do provedor escolhido.
- Se já é premium: mostra "Plano ativo até DD/MM/AAAA" + botão cancelar.

---

## Bloco C – Dashboard de Desempenho com IA real

**Banco:**
- Tabela `desempenho_eventos` (user_id, tipo: `redacao`/`simulado`/`exercicio`, materia, nota, nota_maxima, tempo_segundos, created_at). Alimentada automaticamente quando aluno corrige redação ou (futuramente) faz simulado.

**Página `/dashboard` reformulada:**
- **Cards no topo:** Média geral, Total de redações, Total de mensagens IA, Tempo estudando (estimado).
- **Gráfico de evolução** (Recharts): notas de redação ao longo do tempo.
- **Gráfico por competência** (C1–C5): radar mostrando pontos fortes/fracos do ENEM.
- **Análise IA personalizada** (botão "Gerar análise"): server function que envia o histórico real (notas, competências, evolução) para OpenAI e retorna:
  - O que está indo bem.
  - O que precisa melhorar (com matéria/competência específica).
  - 3 ações concretas para próxima semana.
  - **Nota estimada no ENEM** baseada na média + tendência das últimas redações.
- **Importante:** prompt da IA é instruído a **nunca inventar dados** — só comenta o que está no contexto enviado. Se aluno tem 0 redações, retorna mensagem pedindo para fazer a primeira.

---

## Detalhes técnicos

- **Roles:** tabela separada `user_roles` + `has_role()` SECURITY DEFINER (nunca em `profiles` — evita escalation).
- **Admin gate:** rota `/_authenticated/admin/` + server fn `requireAdmin` (middleware que checa `has_role(uid, 'admin')`).
- **Webhook de pagamento:** rota pública `/api/public/webhooks/<provedor>` com verificação de assinatura HMAC.
- **Limites de uso:** contador via SQL `count(*) where user_id = uid and created_at > date_trunc('month', now())` dentro das server fns existentes; bloqueia com erro amigável + CTA para `/planos`.
- **IA de análise:** usa `openai/gpt-5-mini` (sua chave OPENAI_API_KEY já configurada) com `response_format: json_object` para estruturar a saída.

---

## Ordem de execução

1. Responde as 2 decisões acima.
2. Eu faço **Bloco A** (roles + admin + limites) — pode testar imediatamente.
3. Eu faço **Bloco B** (pagamentos) com o provedor escolhido.
4. Eu faço **Bloco C** (dashboard + IA de análise).

Cada bloco gera uma entrega funcional e testável antes do próximo.
