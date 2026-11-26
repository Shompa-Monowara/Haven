export type NotificationType =
  | "listing_decision"
  | "inquiry"
  | "message"
  | "saved_search"
  | "account"
  | "system";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: NotificationItem[];
  unreadCount: number;
}