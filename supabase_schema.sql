-- Tabela de Perfis (Profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('platform_admin', 'company_admin', 'user')),
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Municípios (Base Oficial)
CREATE TABLE IF NOT EXISTS municipalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mayor_name TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    address TEXT,
    ddd TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    population INTEGER,
    region TEXT CHECK (region IN ('NORTE', 'NORDESTE', 'CENTRO-OESTE', 'SUDESTE', 'SUL')),
    area_km2 DECIMAL,
    installation_year INTEGER,
    population_range TEXT CHECK (population_range IN (
        'Menor que 15.000',
        'Entre 15.001 e 30.000',
        'Entre 30.001 e 50.000',
        'Entre 50.001 e 100.000',
        'Entre 100.001 e 200.000',
        'Entre 200.001 e 300.000',
        'Entre 300.001 e 500.000',
        'Entre 500.001 e 1.000.000',
        'Maior que Um Milhão'
    )),
    status TEXT DEFAULT 'prospect' CHECK (status IN ('active', 'inactive', 'prospect')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice de deduplicação
CREATE UNIQUE INDEX IF NOT EXISTS idx_municipalities_city_state ON municipalities (city, state);

-- Tabela de Log de Importação
CREATE TABLE IF NOT EXISTS municipalities_import_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    records_total INTEGER NOT NULL,
    records_inserted INTEGER NOT NULL,
    records_updated INTEGER NOT NULL,
    records_errors INTEGER NOT NULL,
    imported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities_import_log ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Leitura pública ou para usuários autenticados)
CREATE POLICY "Leitura pública de perfis" ON profiles FOR SELECT USING (true);
CREATE POLICY "Leitura pública de municípios" ON municipalities FOR SELECT USING (true);

-- Políticas para administradores (Escrita)
-- Assumindo que temos uma forma de identificar platform_admin via metadata ou tabela de perfis
CREATE POLICY "Apenas administradores podem inserir municípios" ON municipalities FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Apenas administradores podem atualizar municípios" ON municipalities FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Apenas administradores podem ver logs" ON municipalities_import_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Apenas administradores podem inserir logs" ON municipalities_import_log FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
);

-- Tabela de Contatos
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

-- Tabela de Contratos
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

-- Tabela de Negócios (Deals)
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    title TEXT NOT NULL,
    estimated_value DECIMAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'lead', -- lead, proposta, ganho, perdido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Tarefas (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, concluído
    priority TEXT NOT NULL DEFAULT 'média', -- baixa, média, alta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Propostas (Proposals)
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    title TEXT NOT NULL,
    value DECIMAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'rascunho', -- rascunho, enviada, aceita, recusada
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Linha do Tempo (Timeline Events)
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    contact_id UUID REFERENCES contacts(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- reunião, ligação, email, outro
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Documentos de Municípios
CREATE TABLE IF NOT EXISTS municipality_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    municipality_id UUID REFERENCES municipalities(id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para novas tabelas
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipality_documents ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas para o protótipo
CREATE POLICY "Acesso total contatos" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total contratos" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total deals" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total timeline_events" ON timeline_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total municipality_documents" ON municipality_documents FOR ALL USING (true) WITH CHECK (true);
