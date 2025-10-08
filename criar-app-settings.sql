-- Criar tabela app_settings no Neon PostgreSQL

-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  logo_url TEXT,
  company_name TEXT NOT NULL DEFAULT 'X Produçoes e Eventos',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Inserir registro padrão
INSERT INTO public.app_settings (id, company_name, logo_url)
VALUES (
  'default',
  'X Produçoes e Eventos',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- 3. Criar trigger para updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Aplicar trigger na tabela
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Verificar se foi criado
SELECT * FROM public.app_settings;
