import nodemailer, { type Transporter } from "nodemailer";

import { env } from "../config/env";
import { logger } from "./logger";

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

let cachedTransport: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;

  if (!env.SMTP_HOST) {
    cachedTransport = null;
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  });

  logger.info({ host: env.SMTP_HOST, port: env.SMTP_PORT }, "SMTP email transport configured");
  return cachedTransport;
}

export async function sendMail(input: MailInput): Promise<void> {
  const transport = getTransport();

  if (!transport) {
    logger.info(
      {
        email: {
          to: input.to,
          subject: input.subject,
          preview: input.text.slice(0, 240),
          transport: "console",
        },
      },
      "Email logged (SMTP not configured)",
    );
    return;
  }

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });
    logger.info({ to: input.to, subject: input.subject }, "Email sent");
  } catch (error) {
    logger.error({ err: error, to: input.to, subject: input.subject }, "Email delivery failed");
  }
}

export async function sendSavedSearchDigest(input: {
  to: string;
  userName: string;
  searchName: string;
  count: number;
  matches: Array<{ title: string; city: string | null; slug: string; price: number }>;
  searchUrl: string;
}): Promise<void> {
  const lines = input.matches
    .map((match) => `- ${match.title}${match.city ? ` in ${match.city}` : ""} — ${match.slug}`)
    .join("\n");

  await sendMail({
    to: input.to,
    subject: `${input.count} new ${input.count === 1 ? "home" : "homes"} for "${input.searchName}"`,
    text: [
      `Hi ${input.userName},`,
      "",
      `Your saved search "${input.searchName}" has ${input.count} new ${input.count === 1 ? "match" : "matches"}.`,
      "",
      lines,
      "",
      `See all matches: ${input.searchUrl}`,
      "",
      `Manage alerts: ${env.CORS_ORIGIN}/account/saved-searches`,
    ].join("\n"),
  });
}

export async function sendListingDecisionEmail(input: {
  to: string;
  agentName: string;
  listingTitle: string;
  decision: "approved" | "rejected" | "changes_requested";
  reason?: string;
  note?: string;
  listingUrl: string;
  dashboardUrl: string;
}): Promise<void> {
  const headline =
    input.decision === "approved"
      ? "Your listing is live"
      : input.decision === "changes_requested"
        ? "Changes requested on your listing"
        : "Your listing was not approved";

  await sendMail({
    to: input.to,
    subject: `${headline}: ${input.listingTitle}`,
    text: [
      `Hi ${input.agentName},`,
      "",
      `"${input.listingTitle}" has a review decision: ${input.decision.replace("_", " ")}.`,
      input.reason ? `Reason category: ${input.reason.replace(/_/g, " ")}` : "",
      input.note ? `Note from the reviewer: ${input.note}` : "",
      "",
      input.decision === "approved" ? `View the listing: ${input.listingUrl}` : "",
      `Open your listings: ${input.dashboardUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function sendOfflineMessageEmail(input: {
  to: string;
  recipientName: string;
  senderName: string;
  propertyTitle: string;
  preview: string;
  conversationUrl: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: `New message from ${input.senderName} about ${input.propertyTitle}`,
    text: [
      `Hi ${input.recipientName},`,
      "",
      `${input.senderName} sent you a message about "${input.propertyTitle}":`,
      "",
      `"${input.preview}"`,
      "",
      `Reply: ${input.conversationUrl}`,
    ].join("\n"),
  });
}

export async function sendAgentContactEmail(input: {
  to: string;
  agentName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  topicLabel: string;
  contactMethod: "email" | "phone";
  propertyTitle?: string;
  message: string;
  leadsUrl: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    replyTo: input.senderEmail,
    subject: `New enquiry from ${input.senderName} — ${input.topicLabel}`,
    text: [
      `Hi ${input.agentName},`,
      "",
      `You have a new enquiry from ${input.senderName}.`,
      "",
      `Topic: ${input.topicLabel}`,
      input.propertyTitle ? `Related listing: ${input.propertyTitle}` : "",
      `Preferred contact: ${input.contactMethod === "phone" ? "Phone" : "Email"}`,
      `Email: ${input.senderEmail}`,
      input.senderPhone ? `Phone: ${input.senderPhone}` : "",
      "",
      "Message:",
      input.message,
      "",
      `Open your leads: ${input.leadsUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function sendContactConfirmationEmail(input: {
  to: string;
  senderName: string;
  agentName: string;
  firstName: string;
  responseTimeMinutes: number;
  profileUrl: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: `Your message to ${input.agentName}`,
    text: [
      `Hi ${input.senderName},`,
      "",
      `We sent ${input.firstName} your message. ${input.firstName} usually replies in about ${input.responseTimeMinutes} minutes.`,
      "",
      `View ${input.firstName}'s profile: ${input.profileUrl}`,
      "",
      `Browse homes: ${env.CORS_ORIGIN}/properties`,
    ].join("\n"),
  });
}