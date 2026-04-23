# PLANO CONSULTORIA — REGRAS ABSOLUTAS DO PROJETO
## PRINCÍPIO INEGOCIÁVEL (CRÍTICO)
O Plano Consultoria deve ser desenvolvido em CAMADA TOTALMENTE PARALELA ao MVP atual.
É PROIBIDO:
- Alterar qualquer comportamento dos planos:
  - Essencial
  - Profissional
  - Elite
- Reutilizar lógica existente de forma acoplada
- Adaptar código existente para "servir também" ao Plano Consultoria
- Inserir condicionais dentro de fluxos atuais para suportar consultoria
- Refatorar código existente com o objetivo de acomodar o Plano Consultoria
REGRA CLARA:
👉 O que já funciona HOJE deve permanecer 100% intocado.
👉 O Plano Consultoria deve nascer como um sistema paralelo, não como extensão do atual.
Qualquer violação disso é considerada erro crítico.
---
## REGRA DE ALTERAÇÃO DE CÓDIGO
- Altere APENAS o que for explicitamente solicitado
- NÃO refatore nenhum outro arquivo
- NÃO "aproveite" para melhorar código existente
- NÃO reorganize estrutura
- NÃO crie abstrações novas sem solicitação
---
## ARQUIVOS PROIBIDOS (NUNCA TOCAR)
Sob nenhuma circunstância alterar:
- middleware.ts
- CompanyProvider.tsx
- Qualquer lógica de autenticação
- Fluxos atuais de planos ativos
Se precisar alterar algo relacionado a isso:
👉 PARAR e perguntar antes
---
## REGRA DE VERSIONAMENTO (CRÍTICA)
Nos commits:
- NUNCA usar: git add .
- Adicionar APENAS os arquivos alterados nesta tarefa
- NÃO incluir arquivos já modificados anteriormente
- NÃO misturar escopos no mesmo commit
O commit deve conter:
👉 EXCLUSIVAMENTE o que foi pedido na tarefa atual
Se houver dúvida:
👉 NÃO commitar
👉 Perguntar antes
---
## ARQUITETURA DO PLANO CONSULTORIA
O Plano Consultoria deve seguir estes princípios:
- Estrutura própria (ex: consultant_profiles)
- Dados isolados por cliente/CNPJ
- Configuração de match independente
- Oportunidades independentes por perfil
- Nenhuma dependência direta do fluxo atual
---
## FLUXO DE TRABALHO DOS AGENTES
Este projeto utiliza dois agentes:
1. ChatGPT
   - Responsável por estratégia
   - Define arquitetura
   - Define escopo
   - Gera prompts
2. Codex / Claude Code
   - Responsável por implementação
   - NÃO decide arquitetura
   - NÃO altera escopo
   - NÃO toma decisões sozinho
---
## REGRA DE EXECUÇÃO
Antes de qualquer implementação:
1. Ler este arquivo completamente
2. Validar escopo da tarefa
3. Confirmar arquivos que podem ser alterados
Durante a execução:
- Fazer a menor alteração possível
- Não expandir escopo
- Não antecipar melhorias
---
## REGRA DE DÚVIDA
Se existir QUALQUER dúvida:
👉 NÃO implementar
👉 NÃO assumir
👉 Perguntar antes
---
## OBJETIVO DO PROJETO
Garantir evolução do produto com:
- Risco ZERO ao MVP atual
- Crescimento controlado
- Arquitetura escalável
- Separação total entre modos de uso
---
## DEFINIÇÃO FINAL
Este não é um projeto de melhoria do sistema atual.
👉 É a criação de uma NOVA CAMADA dentro do produto.
E deve ser tratado como tal em todas as decisões técnicas.
