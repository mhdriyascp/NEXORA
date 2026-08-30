import type { Contact, Deal, Activity, Sentiment } from "./types";

// AI Lead Scoring: Computes a score 0-100 based on engagement and profile signals
export function computeLeadScore(contact: Contact): number {
  let score = 0;

  // Status weight
  const statusWeights: Record<string, number> = {
    customer: 90,
    prospect: 60,
    lead: 40,
    churned: 15,
  };
  score += statusWeights[contact.status] ?? 40;

  // Recency bonus: activity in last 7 days
  const daysSinceActivity =
    (Date.now() - new Date(contact.lastActivity).getTime()) /
    (1000 * 60 * 60 * 24);
  if (daysSinceActivity <= 7) score += 10;
  else if (daysSinceActivity <= 30) score += 5;

  // Sentiment weight
  if (contact.sentiment === "positive") score += 10;
  else if (contact.sentiment === "negative") score -= 10;

  // Tag bonuses
  if (contact.tags.includes("enterprise")) score += 5;
  if (contact.tags.includes("vip")) score += 5;

  return Math.min(100, Math.max(0, score));
}

// Sentiment analysis: simple keyword-based analysis of text
export function analyzeSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const positiveWords = [
    "great",
    "excellent",
    "happy",
    "interested",
    "love",
    "perfect",
    "fantastic",
    "confirmed",
    "excited",
    "satisfied",
    "yes",
    "agree",
    "wonderful",
    "positive",
    "receptive",
    "advocate",
    "renewal",
    "strong",
  ];
  const negativeWords = [
    "not interested",
    "budget",
    "cancel",
    "churned",
    "disappointed",
    "problem",
    "issue",
    "concerned",
    "risk",
    "stalling",
    "negative",
    "lost",
  ];

  const positiveCount = positiveWords.filter((w) => lower.includes(w)).length;
  const negativeCount = negativeWords.filter((w) => lower.includes(w)).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

// AI-predicted deal close probability based on stage and signals
export function predictDealProbability(deal: Deal): number {
  const stageProbabilities: Record<string, number> = {
    prospecting: 20,
    qualification: 40,
    proposal: 60,
    negotiation: 80,
    closed_won: 100,
    closed_lost: 0,
  };

  let base = stageProbabilities[deal.stage] ?? 50;

  // Adjust based on days to expected close
  const daysToClose =
    (new Date(deal.expectedCloseDate).getTime() - Date.now()) /
    (1000 * 60 * 60 * 24);
  if (daysToClose < 7 && deal.stage === "negotiation") base += 10;
  if (daysToClose < 0 && deal.stage !== "closed_won") base -= 15;

  // Adjust for deal value (larger deals take longer)
  if (deal.value > 100000) base -= 5;

  return Math.min(100, Math.max(0, Math.round(base)));
}

// Next-action recommendations based on contact data
export function getNextAction(contact: Contact, activities: Activity[]): string {
  const contactActivities = activities.filter(
    (a) => a.contactId === contact.id
  );
  const daysSinceActivity =
    (Date.now() - new Date(contact.lastActivity).getTime()) /
    (1000 * 60 * 60 * 24);

  if (contact.status === "churned") {
    return "Send re-engagement email with updated offer";
  }

  if (contact.status === "lead" && contactActivities.length === 0) {
    return "Schedule introductory discovery call";
  }

  if (contact.status === "lead" && daysSinceActivity > 14) {
    return "Send nurture content to keep contact warm";
  }

  if (contact.status === "prospect" && daysSinceActivity > 7) {
    return "Follow up on previous conversation";
  }

  if (contact.status === "customer" && daysSinceActivity > 30) {
    return "Schedule quarterly business review";
  }

  if (contact.leadScore >= 80) {
    return "Present premium upsell opportunity";
  }

  return "Continue regular engagement";
}

// Pipeline revenue forecast
export function forecastRevenue(
  deals: Deal[],
  months: number = 1
): { expected: number; optimistic: number; conservative: number } {
  const now = Date.now();
  const targetDate = now + months * 30 * 24 * 60 * 60 * 1000;

  const relevantDeals = deals.filter((d) => {
    const close = new Date(d.expectedCloseDate).getTime();
    return (
      close <= targetDate &&
      d.stage !== "closed_won" &&
      d.stage !== "closed_lost"
    );
  });

  const expected = relevantDeals.reduce(
    (sum, d) => sum + d.value * (d.aiProbability / 100),
    0
  );
  const optimistic = relevantDeals.reduce(
    (sum, d) =>
      sum + d.value * Math.min(1, (d.aiProbability / 100) * 1.2),
    0
  );
  const conservative = relevantDeals.reduce(
    (sum, d) => sum + d.value * (d.aiProbability / 100) * 0.7,
    0
  );

  return { expected, optimistic, conservative };
}
