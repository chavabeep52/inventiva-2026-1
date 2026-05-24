
-- PROFILES
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "View own profile or privileged"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_organizer_or_admin(auth.uid()));

-- USER ROLES
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "View own roles or admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- PROYECTOS
DROP POLICY IF EXISTS "Authenticated can view proyectos" ON public.proyectos;
CREATE POLICY "Organizer/Admin view proyectos"
  ON public.proyectos FOR SELECT TO authenticated
  USING (public.is_organizer_or_admin(auth.uid()));

CREATE OR REPLACE VIEW public.proyectos_publicos
WITH (security_invoker = false) AS
SELECT id, nombre, descripcion, pregrado_id, event_day_id, estado, numero_integrantes, created_at, updated_at
FROM public.proyectos;
GRANT SELECT ON public.proyectos_publicos TO authenticated, anon;

-- VOTOS
DROP POLICY IF EXISTS "Authenticated can view votos" ON public.votos;
CREATE POLICY "Organizer/Admin view votos"
  ON public.votos FOR SELECT TO authenticated
  USING (public.is_organizer_or_admin(auth.uid()));

CREATE OR REPLACE VIEW public.votos_publicos
WITH (security_invoker = false) AS
SELECT id, proyecto_id, pregrado_id, event_day_id, tipo_votante, estado, created_at
FROM public.votos;
GRANT SELECT ON public.votos_publicos TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.check_voter_duplicate(_event_day_id uuid, _nombre_norm text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.votos
    WHERE event_day_id = _event_day_id
      AND nombre_votante_norm = _nombre_norm
      AND estado = 'valido'
  )
$$;
REVOKE ALL ON FUNCTION public.check_voter_duplicate(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_voter_duplicate(uuid, text) TO authenticated;

-- REALTIME: remove votos broadcast (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'votos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.votos';
  END IF;
END $$;
