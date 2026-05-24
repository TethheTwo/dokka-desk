
-- ===== Enum addiuva =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='addiuva' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'addiuva';
  END IF;
END $$;

-- ===== Profile avatar =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- ===== Role permissions =====
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rp_read_all" ON public.role_permissions;
CREATE POLICY "rp_read_all" ON public.role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rp_admin_write" ON public.role_permissions;
CREATE POLICY "rp_admin_write" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador'))
  WITH CHECK (public.has_role(auth.uid(),'administrador'));

-- Trigger: admin role always keeps all permissions allowed
CREATE OR REPLACE FUNCTION public.protect_admin_permissions()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.role = 'administrador' AND NEW.allowed = false THEN
    NEW.allowed := true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_admin_perms ON public.role_permissions;
CREATE TRIGGER trg_protect_admin_perms BEFORE INSERT OR UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_permissions();

-- Seed
INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  ('administrador','view_tickets',true),('administrador','view_asistencias',true),
  ('administrador','view_reporte',true),('administrador','view_administracion',true),
  ('administrador','view_dashboard',true),('administrador','view_auditoria',true),
  ('administrador','view_listas',true),('administrador','delete_tickets',true),
  ('supervisor','view_tickets',true),('supervisor','view_asistencias',true),
  ('supervisor','view_reporte',true),('supervisor','view_administracion',false),
  ('supervisor','view_dashboard',true),('supervisor','view_auditoria',true),
  ('supervisor','view_listas',false),('supervisor','delete_tickets',false),
  ('operador','view_tickets',true),('operador','view_asistencias',true),
  ('operador','view_reporte',true),('operador','view_administracion',false),
  ('operador','view_dashboard',false),('operador','view_auditoria',false),
  ('operador','view_listas',false),('operador','delete_tickets',false),
  ('addiuva','view_tickets',true),('addiuva','view_asistencias',false),
  ('addiuva','view_reporte',false),('addiuva','view_administracion',false),
  ('addiuva','view_dashboard',false),('addiuva','view_auditoria',false),
  ('addiuva','view_listas',false),('addiuva','delete_tickets',false)
ON CONFLICT (role, permission) DO NOTHING;

-- ===== Master lists =====
CREATE TABLE IF NOT EXISTS public.master_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_key text NOT NULL,
  label text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_master_lists_key ON public.master_lists(list_key, sort_order);
ALTER TABLE public.master_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ml_read_all" ON public.master_lists;
CREATE POLICY "ml_read_all" ON public.master_lists FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ml_admin_write" ON public.master_lists;
CREATE POLICY "ml_admin_write" ON public.master_lists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador'))
  WITH CHECK (public.has_role(auth.uid(),'administrador'));

DROP TRIGGER IF EXISTS trg_master_lists_updated ON public.master_lists;
CREATE TRIGGER trg_master_lists_updated BEFORE UPDATE ON public.master_lists
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed ejecutivos
INSERT INTO public.master_lists (list_key, label, value, sort_order) VALUES
  ('ejecutivos','Alex Glummer Oyola Roca','{"celular":"75015069"}'::jsonb,1),
  ('ejecutivos','Andres Alejandro Barroso Barbeito','{"celular":"77051633"}'::jsonb,2),
  ('ejecutivos','Andres Canaviri Alanoca','{"celular":"69067998"}'::jsonb,3),
  ('ejecutivos','Carla Noemi Maldonado','{"celular":"69420054"}'::jsonb,4),
  ('ejecutivos','Cyntia Lilibet Martinez','{"celular":"69420038"}'::jsonb,5),
  ('ejecutivos','Daniel Ricardo Chavez','{"celular":"69365206"}'::jsonb,6),
  ('ejecutivos','Jackelin Rios Teodovich','{"celular":"69197951"}'::jsonb,7),
  ('ejecutivos','Jorge Angelo Baluarte Vargas','{"celular":"69019595"}'::jsonb,8),
  ('ejecutivos','Luis Fernando Mercado Encinas','{"celular":"69665961"}'::jsonb,9),
  ('ejecutivos','Luis Gabriel Ortiz Garron','{"celular":"77360677"}'::jsonb,10),
  ('ejecutivos','Marco Antonio Verduguez Menacho','{"celular":"69405186"}'::jsonb,11),
  ('ejecutivos','Narda Gabriela Oña Vargas','{"celular":"69852230"}'::jsonb,12),
  ('ejecutivos','Nathalie Santeyana','{"celular":"69006408"}'::jsonb,13),
  ('ejecutivos','Nicol Taboada','{"celular":"69067998"}'::jsonb,14),
  ('ejecutivos','Orlando Viamont','{"celular":"69410056"}'::jsonb,15),
  ('ejecutivos','Rolando Bolivar','{"celular":"69207243"}'::jsonb,16),
  ('ejecutivos','Samael Andrés García Ayaviri','{"celular":"69111289"}'::jsonb,17),
  ('ejecutivos','Sayli Eunice Gabriel Mercado','{"celular":"69300055"}'::jsonb,18),
  ('ejecutivos','Wilson Manuel Suarez Nogales','{"celular":"69066527"}'::jsonb,19),
  ('ejecutivos','Yuli Quispe Seas','{"celular":"69199328"}'::jsonb,20)
ON CONFLICT DO NOTHING;

-- Seed correos
INSERT INTO public.master_lists (list_key, label, value, sort_order) VALUES
  ('correos','GrupoAtcLaPaz@nacionalseguros.com.bo','{"department":"La Paz"}'::jsonb,1),
  ('correos','GrupoAtcSantaCruz@nacionalseguros.com.bo','{"department":"Santa Cruz"}'::jsonb,2),
  ('correos','GrupoAtcCochabamba@nacionalseguros.com.bo','{"department":"Cochabamba"}'::jsonb,3),
  ('correos','GrupoAtcOruro@nacionalseguros.com.bo','{"department":"Oruro"}'::jsonb,4),
  ('correos','GrupoAtcPotosi@nacionalseguros.com.bo','{"department":"Potosí"}'::jsonb,5),
  ('correos','GrupoAtcChuquisaca@nacionalseguros.com.bo','{"department":"Chuquisaca"}'::jsonb,6),
  ('correos','GrupoAtcTarija@nacionalseguros.com.bo','{"department":"Tarija"}'::jsonb,7),
  ('correos','GrupoAtcBeni@nacionalseguros.com.bo','{"department":"Beni"}'::jsonb,8),
  ('correos','GrupoAtcPando@nacionalseguros.com.bo','{"department":"Pando"}'::jsonb,9)
ON CONFLICT DO NOTHING;

-- Seed asistencias
INSERT INTO public.master_lists (list_key, label, sort_order) VALUES
  ('asist_mascotas','Veterinario en línea',1),('asist_mascotas','Descuento en vacunas del 25%',2),
  ('asist_mascotas','Descuento en desparasitación del 25%',3),('asist_mascotas','Servicio de traslado',4),
  ('asist_mascotas','Hotel para mascotas',5),('asist_mascotas','Referencia y coordinación de pet shop',6),
  ('asist_mascotas','Adiestramiento',7),('asist_mascotas','Veterinario a domicilio',8),
  ('asist_mascotas','Servicio de cremación',9),('asist_mascotas','Baño y peluquería',10),
  ('asist_mascotas','Asistencia médica (Por ingestión de cuerpos extraños)',11),
  ('asist_bici','Reparación',1),('asist_bici','Remolque de bicicleta',2),('asist_bici','Engrase',3),
  ('asist_bici','Referencias',4),('asist_bici','Cotización',5),('asist_bici','Coordinación',6),
  ('asist_bici','Orientación legal',7),
  ('asist_automotor','Grúa',1),('asist_automotor','Cambio de llanta',2),('asist_automotor','Recargo de batería',3),
  ('asist_automotor','Cerrajería',4),('asist_automotor','Chofer designado',5),('asist_automotor','Auxilio mecánico',6),
  ('asist_automotor','Peluqueria',7),('asist_automotor','Asistencia veterinaria',8),
  ('asist_automotor','Churrasquería',9),('asist_automotor','Lavado de vehículo',10),
  ('asist_hogar','Plomería',1),('asist_hogar','Electricista',2),
  ('asist_hogar','Reparación de electrodomésticos',3),('asist_hogar','Albañilería',4)
ON CONFLICT DO NOTHING;

-- ===== Reportes AP / CG =====
CREATE SEQUENCE IF NOT EXISTS public.reportes_ap_nro_seq;
CREATE SEQUENCE IF NOT EXISTS public.reportes_cg_nro_seq;

CREATE TABLE IF NOT EXISTS public.reportes_ap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nro int NOT NULL DEFAULT nextval('public.reportes_ap_nro_seq'),
  colaborador text NOT NULL DEFAULT '',
  fecha_solicitud date,
  fecha_siniestro date,
  nombre_accidentado text,
  carnet_accidentado text,
  solicitante text,
  celular text,
  departamento text,
  poliza text,
  direccion text,
  descripcion text,
  ejecutivo_nombre text,
  ejecutivo_celular text,
  intentos_llamada text,
  observaciones text,
  hubo_tripartita text,
  hora_contacto text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reportes_ap ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ap_read" ON public.reportes_ap;
CREATE POLICY "ap_read" ON public.reportes_ap FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ap_write" ON public.reportes_ap;
CREATE POLICY "ap_write" ON public.reportes_ap FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ap_update" ON public.reportes_ap;
CREATE POLICY "ap_update" ON public.reportes_ap FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ap_delete" ON public.reportes_ap;
CREATE POLICY "ap_delete" ON public.reportes_ap FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));
DROP TRIGGER IF EXISTS trg_ap_updated ON public.reportes_ap;
CREATE TRIGGER trg_ap_updated BEFORE UPDATE ON public.reportes_ap FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.reportes_cg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nro int NOT NULL DEFAULT nextval('public.reportes_cg_nro_seq'),
  colaborador text NOT NULL DEFAULT '',
  fecha_solicitud date,
  fecha_siniestro date,
  danos_personales text,
  asegurado text,
  solicitante text,
  celular text,
  departamento text,
  poliza text,
  direccion text,
  descripcion text,
  ejecutivo_nombre text,
  ejecutivo_celular text,
  intentos_llamada text,
  observaciones text,
  hubo_tripartita text,
  hora_contacto text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reportes_cg ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cg_read" ON public.reportes_cg;
CREATE POLICY "cg_read" ON public.reportes_cg FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cg_write" ON public.reportes_cg;
CREATE POLICY "cg_write" ON public.reportes_cg FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cg_update" ON public.reportes_cg;
CREATE POLICY "cg_update" ON public.reportes_cg FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cg_delete" ON public.reportes_cg;
CREATE POLICY "cg_delete" ON public.reportes_cg FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));
DROP TRIGGER IF EXISTS trg_cg_updated ON public.reportes_cg;
CREATE TRIGGER trg_cg_updated BEFORE UPDATE ON public.reportes_cg FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Avatars storage bucket =====
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true)
ON CONFLICT (id) DO UPDATE SET public=true;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
DROP POLICY IF EXISTS "avatars_user_write" ON storage.objects;
CREATE POLICY "avatars_user_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
