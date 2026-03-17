-- Migração para a tabela de contratos
-- Cria a tabela contracts com os campos necessários para a gestão de contratos

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    title TEXT NOT NULL,
    value DECIMAL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
    department TEXT,
    secretariat TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Simplificadas para o protótipo)
CREATE POLICY "Leitura de contratos" ON contracts FOR SELECT USING (true);
CREATE POLICY "Inserção de contratos" ON contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização de contratos" ON contracts FOR UPDATE USING (true);
CREATE POLICY "Exclusão de contratos" ON contracts FOR DELETE USING (true);

-- Adicionar colunas individualmente caso a tabela já exista mas esteja incompleta
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS secretariat TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS value DECIMAL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
