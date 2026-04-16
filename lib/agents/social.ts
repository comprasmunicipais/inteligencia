import type { ContentBrief, SocialPost } from "./types";

export function generatePost(brief: ContentBrief): SocialPost {
  const type = brief.channel === "instagram" ? "carrossel" : "texto";

  const strategicCtaByAngle: Record<ContentBrief["angle"], string> = {
    dor: "Sem processo, a oportunidade vira ruído.",
    processo: "Processo claro reduz ruído e aumenta consistência.",
    prova: "Operação estruturada gera mais previsibilidade.",
  };

  const cta =
    brief.cta.toLowerCase().includes("comente") ||
    brief.cta.toLowerCase().includes("marque") ||
    brief.cta.toLowerCase().includes("salve")
      ? strategicCtaByAngle[brief.angle]
      : brief.cta;

  const angleContentMap: Record<ContentBrief["angle"], string> = {
    dor: `A oportunidade até aparece, mas sem processo ela vira acúmulo, prioridade confusa e execução quebrada. É aqui que muita empresa perde tração no mercado público.`,
    processo: `Quando o fluxo depois da oportunidade é claro, o time sabe o que fazer, quem conduz cada etapa e onde a operação costuma travar. Isso reduz improviso e melhora a consistência.`,
    prova: `Na prática, processo bem estruturado não faz milagre. Ele reduz retrabalho, organiza a operação e dá mais previsibilidade para conduzir cada oportunidade com critério.`,
  };

  const slides =
    brief.channel === "instagram" && type === "carrossel"
      ? {
          slide1: brief.theme,
          slide2:
            brief.angle === "dor"
              ? "A oportunidade entra, mas a execução se perde entre urgências."
              : "Sem clareza de etapas, cada oportunidade segue um caminho diferente.",
          slide3:
            brief.angle === "prova"
              ? "Com processo, a operação ganha estabilidade e menos retrabalho."
              : "Quando o fluxo fica claro, o time executa com mais consistência.",
          slide4: cta,
        }
      : undefined;

  return {
    channel: brief.channel,
    type,
    content: angleContentMap[brief.angle],
    cta,
    slides,
  };
}
