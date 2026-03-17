-- Migração para a tabela de contatos
-- Adiciona colunas faltantes identificadas na UI e nos tipos

-- Primeiro, garantir que a tabela existe (caso não exista por algum motivo)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    name TEXT NOT NULL,
    role TEXT DEFAULT '-',
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    bio TEXT,
    department TEXT,
    secretariat TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas individualmente caso a tabela já exista mas esteja incompleta
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS secretariat TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location TEXT;

-- Habilitar RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários podem ver contatos da sua empresa" ON contacts
    FOR SELECT USING (true); -- Ajustar conforme lógica de tenant se necessário

CREATE POLICY "Usuários podem inserir contatos" ON contacts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar contatos" ON contacts
    FOR UPDATE USING (true);

CREATE POLICY "Usuários podem excluir contatos" ON contacts
    FOR DELETE USING (true);
