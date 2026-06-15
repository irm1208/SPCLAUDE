import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Paperclip, X, Loader2, Download, ImageIcon, FileText } from "lucide-react";

export interface OrderMessage {
  id: string;
  orderId: string;
  senderRole: "admin" | "customer";
  senderUsername: string;
  body: string;
  hasAttachment: boolean;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  readByAdmin: boolean;
  readByCustomer: boolean;
  createdAt: string;
}

interface Props {
  orderId: string;
  orderCode: string;
  viewerRole: "admin" | "customer";
  /** customer telegram username — required when viewerRole = "customer" */
  viewerUsername?: string;
  onUnreadChange?: (count: number) => void;
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function AttachmentPreview({
  orderId,
  msgId,
  name,
  mime,
  viewerRole,
}: {
  orderId: string;
  msgId: string;
  name: string | null | undefined;
  mime: string | null | undefined;
  viewerRole: "admin" | "customer";
}) {
  const [loading, setLoading] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isImage = mime?.startsWith("image/");
  const base = viewerRole === "admin" ? "/api/admin" : "/api/account";

  const load = async () => {
    if (dataUrl || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${base}/orders/${orderId}/messages/${msgId}/attachment`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load attachment");
      setDataUrl(j.attachmentData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = name || "attachment";
    a.click();
  };

  if (loading) return (
    <div className="flex items-center gap-1.5 text-xs mt-2 opacity-60">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
    </div>
  );

  if (error) return (
    <p className="text-xs mt-2 text-red-400">{error}</p>
  );

  if (dataUrl && isImage) return (
    <div className="mt-2">
      <img src={dataUrl} alt={name ?? "attachment"} className="max-w-[220px] max-h-[200px] rounded-lg object-cover cursor-pointer border border-white/10" onClick={download} />
      <button onClick={download} className="flex items-center gap-1 text-xs mt-1 opacity-70 hover:opacity-100">
        <Download className="w-3 h-3" /> {name}
      </button>
    </div>
  );

  if (dataUrl) return (
    <button onClick={download} className="flex items-center gap-1.5 text-xs mt-2 rounded-lg px-2 py-1.5 border border-white/15 hover:bg-white/10">
      <FileText className="w-3.5 h-3.5" /> <span className="truncate max-w-[180px]">{name}</span> <Download className="w-3 h-3 ml-auto shrink-0" />
    </button>
  );

  return (
    <button onClick={load} className="flex items-center gap-1.5 text-xs mt-2 rounded-lg px-2 py-1.5 border border-white/15 hover:bg-white/10 opacity-80">
      {isImage ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
      <span className="truncate max-w-[180px]">{name || "attachment"}</span>
      <Download className="w-3 h-3 ml-auto shrink-0" />
    </button>
  );
}

export default function OrderMessageThread({ orderId, orderCode, viewerRole, viewerUsername, onUnreadChange }: Props) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ data: string; name: string; mime: string } | null>(null);
  const [attachErr, setAttachErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const base = viewerRole === "admin" ? "/api/admin" : "/api/account";

  const markRead = useCallback(async () => {
    try {
      await fetch(`${base}/orders/${orderId}/messages/read`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch {}
  }, [base, orderId]);

  const fetchMessages = useCallback(async () => {
    try {
      const r = await fetch(`${base}/orders/${orderId}/messages`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load messages");
      const msgs: OrderMessage[] = j.messages;
      setMessages(msgs);
      const unread = msgs.filter(m =>
        viewerRole === "admin" ? !m.readByAdmin : !m.readByCustomer
      ).length;
      onUnreadChange?.(unread);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [base, orderId, viewerRole, onUnreadChange]);

  useEffect(() => {
    fetchMessages().then(() => markRead());
  }, [fetchMessages, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setAttachErr("File must be 10 MB or less");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({ data: reader.result as string, name: file.name, mime: file.type || "application/octet-stream" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const send = async () => {
    if (!body.trim() && !attachment) return;
    setSending(true);
    setSendError(null);
    try {
      const r = await fetch(`${base}/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          body: body.trim(),
          attachmentData: attachment?.data ?? undefined,
          attachmentName: attachment?.name ?? undefined,
          attachmentMime: attachment?.mime ?? undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to send");
      // Add to local list
      setMessages(prev => [{
        ...j,
        attachmentName: attachment?.name ?? null,
        attachmentMime: attachment?.mime ?? null,
      } as OrderMessage, ...prev]);
      setBody("");
      setAttachment(null);
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  const isMine = (msg: OrderMessage) => msg.senderRole === viewerRole;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
        <MessageCircle className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
          Messages — #{orderCode}
        </p>
        {messages.filter(m => viewerRole === "admin" ? !m.readByAdmin : !m.readByCustomer).length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
            {messages.filter(m => viewerRole === "admin" ? !m.readByAdmin : !m.readByCustomer).length} new
          </span>
        )}
      </div>

      {/* Thread */}
      <div className="flex flex-col-reverse gap-3 p-4 max-h-80 overflow-y-auto">
        <div ref={bottomRef} />
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-muted)" }} />
          </div>
        )}
        {!loading && error && (
          <p className="text-xs text-center py-4" style={{ color: "var(--t-muted)" }}>Failed to load messages.</p>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="text-center py-8 space-y-1">
            <MessageCircle className="w-8 h-8 mx-auto" style={{ color: "var(--t-border)" }} />
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = isMine(msg);
          return (
            <div key={msg.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={mine
                  ? { background: "var(--t-blue)", color: "#fff" }
                  : { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }
                }
              >
                <p className="text-[10px] font-semibold mb-1 opacity-70">
                  {msg.senderRole === "admin" ? "Admin" : `@${msg.senderUsername}`}
                </p>
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                {msg.hasAttachment && (
                  <AttachmentPreview
                    orderId={orderId}
                    msgId={msg.id}
                    name={msg.attachmentName}
                    mime={msg.attachmentMime}
                    viewerRole={viewerRole}
                  />
                )}
              </div>
              <p className="text-[10px] mt-0.5 px-1" style={{ color: "var(--t-muted)" }}>
                {formatTs(msg.createdAt)}
                {!mine && viewerRole === "admin" && !msg.readByAdmin && (
                  <span className="ml-1 text-blue-500 font-bold">● new</span>
                )}
                {!mine && viewerRole === "customer" && !msg.readByCustomer && (
                  <span className="ml-1 text-blue-500 font-bold">● new</span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Compose */}
      <div className="border-t px-4 pt-3 pb-4 space-y-2" style={{ borderColor: "var(--t-border)" }}>
        {attachment && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <Paperclip className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-blue)" }} />
            <span className="truncate flex-1" style={{ color: "var(--t-subtle)" }}>{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="shrink-0 hover:opacity-70" style={{ color: "var(--t-muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {attachErr && <p className="text-xs text-red-500">{attachErr}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder="Write a message… (Shift+Enter for new line)"
            className="flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none focus:ring-1"
            style={{
              background: "var(--t-surface2)",
              color: "var(--t-text)",
              border: "1px solid var(--t-border)",
              caretColor: "var(--t-blue)",
            }}
          />
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}
              title="Attach file (max 10 MB)"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending || (!body.trim() && !attachment)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40 hover:brightness-110"
              style={{ background: "var(--t-blue)" }}
              title="Send message"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {sendError && <p className="text-xs text-red-500">{sendError}</p>}
        <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf,.pdf,.doc,.docx,.txt" onChange={handleFileChange} />
      </div>
    </div>
  );
}
