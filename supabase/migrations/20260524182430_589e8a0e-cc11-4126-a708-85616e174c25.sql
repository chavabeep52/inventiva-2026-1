
-- ============================================================
-- INVENTIVA EAFIT 2026-1 — Voting System Schema
-- ============================================================

-- Roles enum
CREATE TYPE public.app_role AS ENUM ('operator', 'organizer', 'admin', 'public_viewer');

-- Project status
CREATE TYPE public.proyecto_estado AS ENUM ('habilitado', 'deshabilitado');

-- Vote status
CREATE TYPE public.voto_estado AS ENUM ('valido', 'anulado');

-- Voter type
CREATE TYPE public.tipo_votante AS ENUM ('popular', 'profesor', 'jurado');

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- user_roles (security-critical: separate table)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- helper: current user role check by minimum tier
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_organizer_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'organizer')
$$;

CREATE OR REPLACE FUNCTION public.can_vote(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'organizer')
      OR public.has_role(_user_id, 'operator')
$$;

-- Trigger: create profile + default operator role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profiles RLS
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "User can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- user_roles RLS
CREATE POLICY "Authenticated can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- pregrados
-- ============================================================
CREATE TABLE public.pregrados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pregrados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view pregrados" ON public.pregrados
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages pregrados" ON public.pregrados
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- event_days
-- ============================================================
CREATE TABLE public.event_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  fecha DATE NOT NULL,
  orden INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view event_days" ON public.event_days
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages event_days" ON public.event_days
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- proyectos
-- ============================================================
CREATE TABLE public.proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_day_id UUID NOT NULL REFERENCES public.event_days(id),
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  pregrado_id UUID NOT NULL REFERENCES public.pregrados(id),
  correo_representante TEXT NOT NULL,
  telefono_representante TEXT NOT NULL,
  numero_integrantes INT NOT NULL CHECK (numero_integrantes > 0),
  estado public.proyecto_estado NOT NULL DEFAULT 'habilitado',
  creado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proyectos_day_pregrado ON public.proyectos(event_day_id, pregrado_id, estado);
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view proyectos" ON public.proyectos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizer/Admin can insert proyectos" ON public.proyectos
  FOR INSERT TO authenticated WITH CHECK (public.is_organizer_or_admin(auth.uid()));
CREATE POLICY "Organizer/Admin can update proyectos" ON public.proyectos
  FOR UPDATE TO authenticated USING (public.is_organizer_or_admin(auth.uid()));
CREATE POLICY "Admin can delete proyectos" ON public.proyectos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_proyectos_updated BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- votos
-- ============================================================
CREATE TABLE public.votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_day_id UUID NOT NULL REFERENCES public.event_days(id),
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id),
  pregrado_id UUID NOT NULL REFERENCES public.pregrados(id),
  nombre_votante TEXT NOT NULL,
  nombre_votante_norm TEXT GENERATED ALWAYS AS (LOWER(TRIM(nombre_votante))) STORED,
  tipo_votante public.tipo_votante NOT NULL,
  registrado_por UUID REFERENCES auth.users(id),
  observacion TEXT,
  estado public.voto_estado NOT NULL DEFAULT 'valido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_votos_day_pregrado_proj ON public.votos(event_day_id, pregrado_id, proyecto_id, estado);
CREATE INDEX idx_votos_voter_lookup ON public.votos(event_day_id, nombre_votante_norm);

ALTER TABLE public.votos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view votos" ON public.votos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Voting roles can insert votos" ON public.votos
  FOR INSERT TO authenticated WITH CHECK (public.can_vote(auth.uid()));
CREATE POLICY "Admin can update votos" ON public.votos
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_votos_updated BEFORE UPDATE ON public.votos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- configuracion (single row)
-- ============================================================
CREATE TABLE public.configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  votacion_abierta BOOLEAN NOT NULL DEFAULT true,
  nombre_evento TEXT NOT NULL DEFAULT 'Votaciones INVENTIVA EAFIT',
  periodo TEXT NOT NULL DEFAULT '2026-1',
  titulo_pestana TEXT NOT NULL DEFAULT 'Votaciones INVENTIVA EAFIT',
  dia_activo_id UUID REFERENCES public.event_days(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view configuracion" ON public.configuracion
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages configuracion" ON public.configuracion
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.configuracion
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  accion TEXT NOT NULL,
  tabla_afectada TEXT,
  registro_id UUID,
  descripcion TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.votos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proyectos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracion;
