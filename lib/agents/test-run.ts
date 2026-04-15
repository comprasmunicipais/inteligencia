import { runContentFlow } from "./orchestrator";
import type { CampaignObjective } from "./types";

export function runAgentTest() {
  const objective: CampaignObjective = {
    objective:
      "Aquecer leads que já conhecem banco de dados e mostrar que o CM Pro organiza o processo após a oportunidade",
    target: "engagement",
  };

  return runContentFlow(objective);
}
