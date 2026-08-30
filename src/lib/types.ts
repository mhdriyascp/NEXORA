export type ContactStatus = "lead" | "prospect" | "customer" | "churned";
export type DealStage =
  | "prospecting"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";
export type ActivityType = "call" | "email" | "meeting" | "task" | "note";
export type Sentiment = "positive" | "neutral" | "negative";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  status: ContactStatus;
  leadScore: number; // 0-100
  sentiment: Sentiment;
  tags: string[];
  lastActivity: string; // ISO date
  createdAt: string; // ISO date
  notes: string;
  avatar?: string;
}

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  contactName: string;
  company: string;
  value: number;
  stage: DealStage;
  probability: number; // 0-100
  aiProbability: number; // AI-estimated close probability
  expectedCloseDate: string; // ISO date
  createdAt: string; // ISO date
  notes: string;
  tags: string[];
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  contactId: string;
  contactName: string;
  dealId?: string;
  dealTitle?: string;
  date: string; // ISO date
  completed: boolean;
  sentiment?: Sentiment;
  aiSummary?: string;
}

export interface AIInsight {
  id: string;
  type: "alert" | "recommendation" | "prediction";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  relatedContactId?: string;
  relatedDealId?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalContacts: number;
  newLeadsThisMonth: number;
  totalDealsValue: number;
  wonDealsValue: number;
  openDeals: number;
  conversionRate: number;
  avgDealSize: number;
  activitiesThisWeek: number;
}
