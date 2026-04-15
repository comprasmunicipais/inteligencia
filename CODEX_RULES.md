REGRA OBRIGATÓRIA:

Altere APENAS o que for pedido.
Não refatore nenhum outro arquivo.
Não toque em middleware.ts, CompanyProvider.tsx nem lógica de autenticação.

CONTEXTO DE USO:

Este projeto utiliza dois agentes:

1. ChatGPT (estratégia, direcionamento, prompts)
2. Codex / Claude Code (implementação técnica)

O Codex deve:

- Ler o projeto antes de qualquer alteração
- Alterar apenas arquivos explicitamente solicitados
- Não melhorar, otimizar ou reorganizar código fora do escopo
- Não criar abstrações adicionais sem solicitação
- Não alterar autenticação, middleware ou estrutura base
- Não modificar fluxos existentes sem instrução direta

Se houver dúvida:
→ perguntar antes de alterar

Objetivo:
Preservar estabilidade do MVP enquanto evoluímos de forma controlada.