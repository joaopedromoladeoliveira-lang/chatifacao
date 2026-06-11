
-- Fix 1: Prevent users from self-assigning premium via profile update.
-- Revoke UPDATE privilege on premium-related columns from authenticated users.
REVOKE UPDATE (plano, premium_ate, premium_vitalicio, premium_concedido_por) ON public.profiles FROM authenticated;

-- Fix 2: Prevent authenticated users from reading the correct answer / explanation
-- of quiz questions directly. Server functions will use the service role to fetch
-- these columns after an attempt is finalized.
REVOKE SELECT (correta, explicacao) ON public.questoes FROM authenticated;
REVOKE SELECT (correta, explicacao) ON public.questoes FROM anon;
GRANT SELECT (correta, explicacao) ON public.questoes TO service_role;
