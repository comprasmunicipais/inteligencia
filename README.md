<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.teste

View your app in AI Studio: https://ai.studio/apps/d1191813-5595-4ea1-904c-bdd0e5ea636b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Atualizações recentes

- Billing: removida a liberação antecipada de acesso no cartão; ativação alinhada ao webhook.
- Oportunidades: card e lista de "Alta Aderência" alinhados ao score por empresa.
- Demo: liberado o recálculo de score para `/api/intel/recalculate-scores` sem abrir escrita para outras rotas.
- Scoring: recálculo executado para a empresa demo e `company_opportunity_scores` populada.
- Oportunidades demo: correção da ordem de aplicação do filtro para que a amostra respeite "Alta Aderência".
