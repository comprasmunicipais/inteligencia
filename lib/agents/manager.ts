import type {
  ApprovalStatus,
  CampaignObjective,
  ContentBrief,
  SocialPost,
} from "./types";

export function generateWeeklyPlan(
  objective: CampaignObjective,
): ContentBrief[] {
  const ctaByTarget: Record<CampaignObjective["target"], string[]> = {
    awareness: ["Saiba mais", "Entenda melhor", "Veja como funciona"],
    engagement: ["Comente sua opinião", "Veja como isso funciona", "Vale refletir sobre isso"],
    conversion: ["Fale com o time", "Peça uma demonstração", "Comece agora"],
  };

  const [dorCta, processoCta, provaCta] = ctaByTarget[objective.target];
  const normalizedObjective = objective.objective.toLowerCase();
  const isAdvancedAudience =
    normalizedObjective.includes("já comprou banco de dados") ||
    normalizedObjective.includes("já conhecem banco de dados") ||
    normalizedObjective.includes("já é estruturado") ||
    normalizedObjective.includes("ja e estruturado") ||
    normalizedObjective.includes("estruturado") ||
    normalizedObjective.includes("mais estratégico") ||
    normalizedObjective.includes("mais estrategico");

  const themes = isAdvancedAudience
    ? {
        dor: "Banco de dados sem processo vira acúmulo operacional",
        processo: "Como dar previsibilidade ao fluxo depois da oportunidade",
        prova: "O que muda quando a operação comercial ganha estrutura",
      }
    : {
        dor: "A oportunidade entra, mas o time se perde na execução",
        processo: "Como organizar os próximos passos sem depender de improviso",
        prova: "O que acontece quando cada etapa do processo fica clara",
      };

  return [
    {
      theme: themes.dor,
      angle: "dor",
      channel: "instagram",
      cta: dorCta,
    },
    {
      theme: themes.processo,
      angle: "processo",
      channel: "linkedin",
      cta: processoCta,
    },
    {
      theme: themes.prova,
      angle: "prova",
      channel: "facebook",
      cta: provaCta,
    },
  ];
}

export function validateContent(post: SocialPost): ApprovalStatus {
  const normalizedContent = post.content.toLowerCase();

  if (normalizedContent.includes("alerta de licitação")) {
    return {
      status: "rejected",
      reason: 'Conteúdo reprovado por mencionar "alerta de licitação".',
    };
  }

  if (normalizedContent.includes("pncp")) {
    return {
      status: "rejected",
      reason: 'Conteúdo reprovado por mencionar "PNCP".',
    };
  }

  const processKeywords = [
    "processo",
    "etapa",
    "execução",
    "execucao",
    "proposta",
    "documentação",
    "documentacao",
    "habilitação",
    "habilitacao",
    "contrato",
    "pós-oportunidade",
    "pos-oportunidade",
    "pos oportunidade",
    "após a oportunidade",
    "apos a oportunidade",
  ];

  const hasProcessFocus = processKeywords.some((keyword) =>
    normalizedContent.includes(keyword),
  );

  if (!hasProcessFocus) {
    return {
      status: "rejected",
      reason:
        "Conteúdo reprovado por não manter foco no processo após a oportunidade.",
    };
  }

  return {
    status: "approved",
  };
}
