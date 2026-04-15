import { generateWeeklyPlan, validateContent } from "./manager";
import { generatePost } from "./social";
import type { ApprovalStatus, CampaignObjective, SocialPost } from "./types";

export function runContentFlow(
  objective: CampaignObjective,
): Array<{ post: SocialPost; status: ApprovalStatus }> {
  const briefs = generateWeeklyPlan(objective);

  return briefs.map((brief) => {
    const post = generatePost(brief);
    const status = validateContent(post);

    return {
      post,
      status,
    };
  });
}
