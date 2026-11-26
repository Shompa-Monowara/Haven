import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useRealtime } from "@/components/realtime/RealtimeProvider";
import { Seo } from "@/components/seo/Seo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import {
  engagementKeys,
  useConversationThread,
  useConversations,
} from "@/lib/queries/engagement";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { ChatAttachment, ChatMessageDto, ConversationDto } from "@/types/engagement";

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ConversationItem({
  item,
  active,
  base,
}: {
  item: ConversationDto;
  active: boolean;
  base: string;
}) {
  const counterpart = item.counterpart;
  return (
    <li>
      <Link
        to={`${base}/${item.id}`}
        className={cn(
          "flex gap-3 rounded-md p-3 transition-colors",
          active ? "bg-brand-soft" : "hover:bg-canvas",
        )}
      >
        <Avatar name={counterpart?.name ?? "Haven"} src={counterpart?.avatar ?? undefined} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-heading">
              {counterpart?.name ?? "Haven member"}
            </span>
            <span className="shrink-0 text-[11px] text-muted">
              {formatRelativeDate(item.lastMessageAt)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-body">
            {item.property?.title ?? "Property conversation"}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted">
              {item.lastMessagePreview || "No messages yet"}
            </span>
            {item.unread > 0 ? (
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pill bg-brand-strong px-1.5 text-[10px] font-bold text-white tabular">
                {item.unread > 9 ? "9+" : item.unread}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { socket, onlineUsers } = useRealtime();
  const conversations = useConversations();
  const thread = useConversationThread(conversationId);

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const typingTimeout = useRef<number | null>(null);
  const typingIdle = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const base = location.pathname.startsWith("/account")
    ? "/account/messages"
    : location.pathname.startsWith("/agent")
      ? "/agent/messages"
      : "/messages";

  const messages = thread.data?.messages ?? [];
  const conversation = thread.data?.conversation ?? null;
  const counterpartId = conversation?.counterpart?.id;

  useEffect(() => {
    if (!thread.data?.conversation.id) return;
    void queryClient.invalidateQueries({ queryKey: engagementKeys.unread });
    void queryClient.invalidateQueries({ queryKey: engagementKeys.conversations, exact: true });
  }, [thread.data?.conversation.id, queryClient]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = conversations.data ?? [];
    if (!term) return list;
    return list.filter((item) => {
      const haystack = [item.counterpart?.name, item.property?.title, item.property?.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [conversations.data, search]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit("conversation:join", { conversationId });
  }, [socket, conversationId]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (payload: { conversationId: string; message: ChatMessageDto }) => {
      if (payload.conversationId !== conversationId) return;
      void queryClient.invalidateQueries({ queryKey: engagementKeys.thread(payload.conversationId) });
      void queryClient.invalidateQueries({ queryKey: engagementKeys.conversations, exact: true });
      void queryClient.invalidateQueries({ queryKey: engagementKeys.unread });
    };

    const onTyping = (payload: {
      conversationId: string;
      userId: string;
      name: string;
      isTyping: boolean;
    }) => {
      if (payload.conversationId !== conversationId || payload.userId === user?.id) return;
      if (!payload.isTyping) {
        setTypingName(null);
        return;
      }
      setTypingName(payload.name);
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
      typingTimeout.current = window.setTimeout(() => setTypingName(null), 3500);
    };

    const onRead = (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId !== conversationId || payload.userId === user?.id) return;
      void queryClient.invalidateQueries({ queryKey: engagementKeys.thread(payload.conversationId) });
    };

    socket.on("message:new", onMessage);
    socket.on("typing", onTyping);
    socket.on("conversation:read", onRead);

    return () => {
      socket.off("message:new", onMessage);
      socket.off("typing", onTyping);
      socket.off("conversation:read", onRead);
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    };
  }, [socket, conversationId, queryClient, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typingName, conversationId]);

  const send = useMutation({
    mutationFn: (input: { body: string; attachments: ChatAttachment[] }) =>
      api.post<ChatMessageDto>(`/conversations/${conversationId}/messages`, input),
    onSuccess: () => {
      setDraft("");
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      if (socket && conversationId && typingIdle.current) window.clearTimeout(typingIdle.current);
      socket?.emit("typing", { conversationId, isTyping: false });
      void queryClient.invalidateQueries({ queryKey: engagementKeys.thread(conversationId ?? "") });
      void queryClient.invalidateQueries({ queryKey: engagementKeys.conversations, exact: true });
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : "Your message could not be sent");
    },
  });

  async function uploadFiles(files: FileList | File[]) {
    const remaining = 3 - attachments.length;
    if (remaining <= 0) {
      toast.error("Attach up to 3 files per message");
      return;
    }

    const selected = Array.from(files).slice(0, remaining).filter((file) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type);
      if (!allowed) {
        toast.error(`${file.name} is not a supported file type`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 10MB`);
        return false;
      }
      return true;
    });

    if (!selected.length) return;

    const formData = new FormData();
    selected.forEach((file) => formData.append("files", file));
    setUploading(true);

    try {
      const result = await api.upload<{ files: ChatAttachment[] }>("/uploads/chat", formData);
      setAttachments((current) => [...current, ...result.files].slice(0, 3));
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "The file could not be uploaded");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateDraft(value: string) {
    setDraft(value);

    if (!socket || !conversationId) return;
    socket.emit("typing", { conversationId, isTyping: true });
    if (typingIdle.current) window.clearTimeout(typingIdle.current);
    typingIdle.current = window.setTimeout(() => {
      socket.emit("typing", { conversationId, isTyping: false });
    }, 1400);
  }

  function sendMessage() {
    const body = draft.trim();
    if ((!body && !attachments.length) || send.isPending || uploading) return;
    send.mutate({ body, attachments });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <Seo title="Messages — Haven" description="Your conversations with Haven agents." noIndex />
      <div className="grid h-[calc(100vh-13rem)] min-h-[520px] md:grid-cols-[340px_minmax(0,1fr)]">
        <section
          className={cn(
            "flex min-h-0 flex-col border-r border-line",
            conversationId ? "hidden md:flex" : "flex",
          )}
          aria-label="Conversations"
        >
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="h-10 pl-9"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {conversations.isPending ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : filtered.length ? (
              <ul className="space-y-1">
              {filtered.map((item) => (
                <ConversationItem
                  key={item.id}
                  item={item}
                  active={item.id === conversationId}
                  base={base}
                />
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center">
                <MessageCircle className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-heading">
                  {conversations.data?.length ? "No matches" : "No conversations yet"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-body">
                  {conversations.data?.length
                    ? "Try a different name or property."
                    : "Message an agent from any listing to start a conversation."}
                </p>
                {!conversations.data?.length ? (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/properties">Browse homes</Link>
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section
          className={cn(
            "flex min-h-0 flex-col",
            conversationId ? "flex" : "hidden md:flex",
          )}
          aria-label="Conversation"
        >
          {!conversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-brand-strong">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 font-medium text-heading">Select a conversation</p>
              <p className="mt-1 max-w-xs text-sm text-body">
                Ask about a home, schedule a tour, or request more photos.
              </p>
            </div>
          ) : thread.isPending ? (
            <div className="flex-1 space-y-4 p-5">
              <Skeleton className="h-12 w-56" />
              <Skeleton className="h-16 w-2/3" />
              <Skeleton className="ml-auto h-16 w-1/2" />
            </div>
          ) : thread.isError || !conversation ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <p className="font-medium text-heading">This conversation could not be opened</p>
              <p className="mt-1 text-sm text-body">
                {thread.error instanceof ApiClientError
                  ? thread.error.message
                  : "Return to your inbox and try again."}
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to={base}>Back to messages</Link>
              </Button>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Link
                  to={base}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-body hover:bg-canvas md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
                <span className="relative shrink-0">
                  <Avatar
                    name={conversation.counterpart?.name ?? "Haven"}
                    src={conversation.counterpart?.avatar ?? undefined}
                    size="md"
                  />
                  {counterpartId && onlineUsers.has(counterpartId) ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-success" aria-label="Online" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-heading">
                    {conversation.counterpart?.name ?? "Haven member"}
                  </p>
                  <p className="text-xs text-muted">
                    {typingName ? `${typingName} is typing…` : counterpartId && onlineUsers.has(counterpartId) ? "Online" : "Offline"}
                  </p>
                </div>
                {conversation.property ? (
                  <Link
                    to={`/properties/${conversation.property.slug}`}
                    className="hidden max-w-[220px] truncate rounded-pill border border-line px-3 py-1.5 text-xs font-medium text-body hover:border-brand hover:text-heading sm:block"
                  >
                    {conversation.property.title}
                  </Link>
                ) : null}
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-canvas/50 px-4 py-4" aria-live="polite" aria-relevant="additions">
                <p className="mx-auto w-fit max-w-full rounded-pill border border-line bg-surface/90 px-3 py-1.5 text-center text-[11px] text-muted">
                  Conversation started {formatRelativeDate(conversation.createdAt)}
                  {conversation.property ? ` about ${conversation.property.title}` : ""}
                </p>
                {messages.length === 0 ? (
                  <div className="mx-auto mt-10 max-w-sm text-center text-sm text-body">
                    <MessageCircle className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
                    <p className="mt-2 font-medium text-heading">Start the conversation</p>
                    <p className="mt-1">
                      Ask about this home, schedule a tour, or request more photos.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const outgoing = message.senderId === user?.id;
                    const read = Boolean(
                      counterpartId && message.readBy.includes(counterpartId),
                    );
                    return (
                      <div
                        key={message.id}
                        className={cn("flex", outgoing ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                            outgoing
                              ? "bg-brand-soft text-ink"
                              : "border border-line bg-surface text-heading",
                          )}
                        >
                          {(message.attachments ?? []).length ? (
                            <div className="mb-1.5 space-y-1.5">
                              {(message.attachments ?? []).map((attachment) =>
                                attachment.type.startsWith("image/") ? (
                                  <a
                                    key={attachment.url}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-md"
                                  >
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name}
                                      loading="lazy"
                                      className="max-h-52 w-full max-w-[260px] object-cover"
                                    />
                                    <span className="sr-only">{attachment.name}</span>
                                  </a>
                                ) : (
                                  <a
                                    key={attachment.url}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex max-w-[260px] items-center gap-2 rounded-md border border-line/60 bg-surface/70 px-2.5 py-2 text-xs text-heading hover:border-brand"
                                  >
                                    <FileText className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                                    <span className="shrink-0 text-[10px] text-muted">
                                      {fileSize(attachment.size)}
                                    </span>
                                  </a>
                                ),
                              )}
                            </div>
                          ) : null}
                          {message.body ? (
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          ) : null}
                          <p
                            className={cn(
                              "mt-1 flex items-center justify-end gap-1 text-[10px]",
                              outgoing ? "text-ink/60" : "text-muted",
                            )}
                          >
                            {messageTime(message.createdAt)}
                            {outgoing ? (
                              read ? (
                                <CheckCheck className="h-3.5 w-3.5" aria-label="Read" />
                              ) : (
                                <Check className="h-3.5 w-3.5" aria-label="Sent" />
                              )
                            ) : null}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

<div className="border-t border-line p-3">
                {attachments.length ? (
                  <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Attachments ready to send">
                    {attachments.map((attachment) => (
                      <li
                        key={attachment.url}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-pill bg-canvas px-2.5 py-1 text-xs text-body"
                      >
                        {attachment.type.startsWith("image/") ? (
                          <span className="truncate">{attachment.name}</span>
                        ) : (
                          <>
                            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{attachment.name}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((current) =>
                              current.filter((item) => item.url !== attachment.url),
                            )
                          }
                          className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-line hover:text-heading"
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    multiple
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                    onChange={(event) => {
                      if (event.target.files?.length) void uploadFiles(event.target.files);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || attachments.length >= 3}
                    aria-label="Attach files"
                    className="h-11 shrink-0 px-3"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Paperclip className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={draft}
                    onChange={(event) => {
                      updateDraft(event.target.value);
                      const element = event.target;
                      element.style.height = "auto";
                      element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Write a message..."
                    aria-label="Message"
                    className="max-h-[140px] min-h-[44px] w-full resize-none rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <Button
                    type="button"
                    onClick={sendMessage}
                    disabled={(!draft.trim() && attachments.length === 0) || send.isPending || uploading}
                    aria-label="Send message"
                    className="h-11 shrink-0 px-3.5"
                  >
                    {send.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  Enter to send · Shift + Enter for a new line · up to 3 files, 10MB each
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}