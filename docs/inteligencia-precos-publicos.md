# Inteligência de Preços Públicos

## 1. Contexto

Empresas que vendem para o setor público frequentemente não têm uma referência objetiva sobre o preço praticado em compras governamentais recentes. Isso dificulta a formação de preço, a priorização comercial e a leitura de competitividade em novos processos.

O objetivo da funcionalidade Inteligência de Preços Públicos é fornecer referência de preço baseada em dados públicos, com foco inicial em consultas sob demanda e sem interferir nos fluxos já existentes do produto.

## 2. Fontes Validadas

- Compras.gov.br: fonte viável para materiais na fase atual de validação.
- PNCP: não se mostrou viável para preço direto nesta fase, considerando a tentativa de busca simples por descrição e os erros/limitações observados na consulta exploratória.

## 3. Escopo do MVP

O MVP deve cobrir apenas materiais.

Consulta prevista:

- entrada por produto
- retorno de preço mínimo
- retorno de preço médio
- retorno de preço máximo
- quantidade de registros
- data mais recente

## 4. Limitações

- Não cobre 100% das prefeituras.
- Serviços não entram no MVP inicial.
- A consulta depende de mapeamento CATMAT.

## 5. Arquitetura (Alto Nível)

- Nova camada isolada do restante do sistema.
- Sem acoplamento ao motor de oportunidades.
- Sem interferência no scoring.
- Sem interferência no CRM.
- Sem interferência no email marketing.

## 6. Modelo Conceitual (Sem Banco Ainda)

Na fase inicial, a consulta deve ser sob demanda, sem persistência obrigatória.

Fluxo conceitual:

- usuário informa um produto
- sistema resolve o código CATMAT correspondente
- sistema faz chamada direta à API pública
- sistema agrega os valores retornados
- sistema exibe a referência consolidada

## 7. Riscos

- Baixa cobertura para alguns produtos.
- Latência da API externa.
- Dependência de mapeamento CATMAT para materiais.

## 8. Roadmap

### Fase 1

- materiais + Compras.gov

### Fase 2

- melhorar match de produto

### Fase 3

- incluir PNCP para atas e contratos

### Fase 4

- incluir serviços via CATSER ou IA

## 9. Posicionamento

- Nome da funcionalidade: Inteligência de Preços Públicos
- Não tratar como banco de preços
- Comunicação recomendada: referência de mercado, não precisão absoluta
