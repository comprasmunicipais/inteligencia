import type { ContentBrief, SocialPost } from "./types";

export function generatePost(brief: ContentBrief): SocialPost {
  const type = brief.channel === "instagram" ? "carrossel" : "texto";

  const angleContentMap: Record<ContentBrief["angle"], string> = {
    dor: `${brief.theme} expõe um problema operacional comum: a equipe até identifica a oportunidade, mas se perde entre prioridades, prazos e próximos passos do processo.`,
    processo: `${brief.theme} pede uma rotina mais organizada, com etapas claras, responsáveis definidos e consistência na execução para o time avançar com segurança.`,
    prova: `${brief.theme} mostra um ganho prático de ter processo: menos retrabalho, mais clareza na operação e uma condução mais estável ao longo das etapas.`,
  };

  return {
    channel: brief.channel,
    type,
    content: angleContentMap[brief.angle],
    cta: brief.cta,
  };
}
