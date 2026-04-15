export interface CampaignObjective {
  objective: string;
  target: "awareness" | "engagement" | "conversion";
}

export interface ContentBrief {
  theme: string;
  angle: "dor" | "processo" | "prova";
  channel: "instagram" | "linkedin" | "facebook";
  cta: string;
}

export interface SocialPost {
  channel: string;
  type: "carrossel" | "texto" | "video";
  content: string;
  cta: string;
}

export interface ApprovalStatus {
  status: "approved" | "rejected";
  reason?: string;
}
