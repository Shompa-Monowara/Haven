import type { ContactMethod, ContactTopic } from "./agent";
import type { ListingType, RentPeriod } from "./property";

export type InquiryStatus = "new" | "contacted" | "qualified" | "closed" | "spam";

export interface InquiryBuyer {
  /** Null for guest enquiries submitted without an account. */
  id: string | null;
  name: string;
  email: string;
  phone: string | null;
}

export interface InquiryProperty {
  id: string;
  slug: string;
  title: string;
  price: number;
  listingType: ListingType;
  rentPeriod: RentPeriod | null;
  city: string | null;
  coverUrl: string | null;
}

export interface InquiryDto {
  id: string;
  status: InquiryStatus;
  message: string;
  consent: boolean;
  tourDate: string | null;
  notes: string[];
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: InquiryBuyer | null;
  property: InquiryProperty | null;
  topic: ContactTopic | null;
  contactMethod: ContactMethod | null;
  source: "property" | "agent_profile";
}

export type AlertFrequency = "off" | "instant" | "daily" | "weekly";

export interface SavedSearchDto {
  id: string;
  name: string;
  criteria: string;
  frequency: AlertFrequency;
  emailAlerts: boolean;
  inAppAlerts: boolean;
  matchCount: number;
  newMatches: number;
  lastRunAt: string | null;
  lastDigestAt: string | null;
  createdAt: string;
}

export interface ConversationProperty {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  price: number;
  listingType: ListingType;
  rentPeriod: RentPeriod | null;
  coverUrl: string | null;
}

export interface ConversationCounterpart {
  id: string;
  name: string;
  avatar: string | null;
  role: "buyer" | "agent" | "admin";
}

export interface ConversationDto {
  id: string;
  property: ConversationProperty | null;
  counterpart: ConversationCounterpart | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  lastMessageSenderId: string | null;
  unread: number;
  createdAt: string;
}

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments: ChatAttachment[];
  readBy: string[];
  createdAt: string;
}

export interface ConversationThread {
  conversation: ConversationDto;
  messages: ChatMessageDto[];
}

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
  spam: "Spam",
};

export const inquiryStatusTones: Record<
  InquiryStatus,
  "pending" | "approved" | "neutral" | "outline" | "rejected"
> = {
  new: "pending",
  contacted: "approved",
  qualified: "approved",
  closed: "neutral",
  spam: "rejected",
};

export const frequencyLabels: Record<AlertFrequency, string> = {
  off: "Alerts off",
  instant: "Instant",
  daily: "Daily",
  weekly: "Weekly",
};