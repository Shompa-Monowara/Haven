import type { PropertySummary } from "./property";

export interface PublicAgent {
  id: string;
  name: string;
  avatar: string | null;
  agency: string;
  bio: string | null;
  verified: boolean;
  responseTimeMinutes: number;
  serviceAreas: string[];
  listingCount: number;
}

export interface PublicAgentProfile {
  agent: PublicAgent;
  listings: PropertySummary[];
}

export type ContactTopic = "buying" | "renting" | "selling" | "valuation" | "other";

export type ContactMethod = "email" | "phone";

export const contactTopics: ContactTopic[] = [
  "buying",
  "renting",
  "selling",
  "valuation",
  "other",
];

export const contactTopicLabels: Record<ContactTopic, string> = {
  buying: "Buying a home",
  renting: "Renting a home",
  selling: "Selling or listing a property",
  valuation: "Valuation or market advice",
  other: "Something else",
};

export interface ContactAgentInput {
  name: string;
  email: string;
  phone?: string;
  topic: ContactTopic;
  contactMethod: ContactMethod;
  message: string;
  propertyId?: string;
  consent: boolean;
  website?: string;
}

export interface ContactAgentResult {
  id: string | null;
  status: "new" | "contacted" | "qualified" | "closed" | "spam";
  responseTimeMinutes: number;
}
