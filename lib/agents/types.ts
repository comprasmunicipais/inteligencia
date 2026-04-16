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
  slides?: {
    slide1: string;
    slide2: string;
    slide3: string;
    slide4: string;
  };
}

export interface ApprovalStatus {
  status: "approved" | "rejected";
  reason?: string;
}

export interface VisualBrief {
  channel: "instagram" | "linkedin" | "facebook";
  angle: "dor" | "processo" | "prova";
  theme: string;
  content: string;
  cta: string;
}

export interface VisualOutput {
  visualObjective: string;
  style: string;
  composition: string;
  imagePrompt: string;
  notes: string[];
}
