-- Migration for Deals and Tasks
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    title TEXT NOT NULL,
    estimated_value DECIMAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'lead', -- lead, proposta, ganho, perdido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, concluído
    priority TEXT NOT NULL DEFAULT 'média', -- baixa, média, alta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Simplificadas para o protótipo)
CREATE POLICY "Acesso total deals" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
