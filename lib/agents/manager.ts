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

  void objective.objective;

  return [
    {
      theme: "Erros depois que a oportunidade aparece",
      angle: "dor",
      channel: "instagram",
      cta: dorCta,
    },
    {
      theme: "Como organizar o processo comercial",
      angle: "processo",
      channel: "linkedin",
      cta: processoCta,
    },
    {
      theme: "O que muda quando existe processo",
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
