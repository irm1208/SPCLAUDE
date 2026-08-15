import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link2, Link2Off,
  Heading2, Heading3, Undo2, Redo2, Minus, Loader2, Save, Send,
  Eye, EyeOff, Type, Palette,
} from "lucide-react";
import { cn } from "@/components/ui";

// ─── Client-side email layout builder (mirrors server email.ts) ───────────────
function buildPreviewHtml(opts: {
  title: string;
  bodyHtml: string;
  primaryColor?: string;
  logoUrl?: string | null;
  footerText?: string | null;
  fromName?: string;
}) {
  const { title, bodyHtml, primaryColor = "#1B3A7A", logoUrl, footerText, fromName } = opts;
  const brand = fromName || "Salt & Peps";
  const year = new Date().getFullYear();
  const footer = footerText || `© ${year} ${brand}. All rights reserved.`;
  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${brand}" style="max-height:40px;max-width:160px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto">`
    : "";

  // Highlight {{vars}} in preview
  const highlightedBody = bodyHtml.replace(
    /\{\{(\w+)\}\}/g,
    `<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 4px;font-family:monospace;font-size:13px">{{$1}}</span>`,
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10)">
        <tr><td style="background:linear-gradient(135deg,${primaryColor}ee,${primaryColor});padding:24px 28px;text-align:center">
          ${logoSection}
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${brand}</p>
          <p style="margin:5px 0 0;color:#ffffff;font-size:18px;font-weight:700">${title}</p>
        </td></tr>
        <tr><td style="padding:28px 28px;color:#374151;font-size:15px;line-height:1.65">
          ${highlightedBody}
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Toolbar button ────────────────────────────────────────────────────────────
function ToolBtn({
  onClick, active = false, disabled = false, title, children,
}: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors text-sm",
        active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
        disabled && "opacity-40 pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}

// ─── Toolbar ───────────────────────────────────────────────────────────────────
function Toolbar({ editor }: { editor: Editor | null }) {
  const colorRef = useRef<HTMLInputElement>(null);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
      {/* Undo/redo */}
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo2 className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo2 className="w-3.5 h-3.5" />
      </ToolBtn>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Headings */}
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
        <Heading2 className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
        <Heading3 className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragraph">
        <Type className="w-3.5 h-3.5" />
      </ToolBtn>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Inline marks */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (⌘B)">
        <Bold className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (⌘I)">
        <Italic className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolBtn>

      {/* Color */}
      <button
        type="button"
        title="Text colour"
        onMouseDown={e => { e.preventDefault(); colorRef.current?.click(); }}
        className="relative p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Palette className="w-3.5 h-3.5" />
        <input
          ref={colorRef}
          type="color"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          onChange={e => editor.chain().focus().setColor(e.target.value).run()}
        />
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Alignment */}
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
        <AlignRight className="w-3.5 h-3.5" />
      </ToolBtn>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Lists */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
        <List className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
        <Minus className="w-3.5 h-3.5" />
      </ToolBtn>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Link */}
      <ToolBtn onClick={setLink} active={editor.isActive("link")} title="Add link">
        <Link2 className="w-3.5 h-3.5" />
      </ToolBtn>
      {editor.isActive("link") && (
        <ToolBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
          <Link2Off className="w-3.5 h-3.5" />
        </ToolBtn>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function EmailTemplatesTab({ secret }: { secret: string }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewEmail, setPreviewEmail] = useState("");
  const [sendingPreview, setSendingPreview] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // ── editor ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: "Write your email body here…" }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setEditing(ed => ({ ...ed, bodyHtml: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[220px] px-4 py-3",
      },
    },
  });

  // ── load templates ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/email-templates", { headers: { "x-admin-secret": secret } })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [secret]);

  // ── select template ────────────────────────────────────────────────────────
  function selectTemplate(t: any) {
    setSelected(t);
    const init = {
      subject: t.subject,
      bodyHtml: t.bodyHtml,
      fromName: t.fromName,
      primaryColor: t.primaryColor ?? "#1B3A7A",
      logoUrl: t.logoUrl ?? "",
      footerText: t.footerText ?? "",
      isActive: t.isActive,
    };
    setEditing(init);
    // Push HTML into editor
    editor?.commands.setContent(t.bodyHtml ?? "", false);
    setMsg(null);
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selected) return;
    setSaving(true); setMsg(null);
    try {
      const payload = { ...editing, bodyHtml: editor?.getHTML() ?? editing.bodyHtml };
      const r = await fetch(`/api/admin/email-templates/${selected.eventKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg({ ok: true, text: "Saved successfully" });
        setTemplates(prev => prev.map(t => t.eventKey === selected.eventKey ? { ...t, ...payload } : t));
        setSelected((prev: any) => ({ ...prev, ...payload }));
      } else {
        setMsg({ ok: false, text: d.error ?? "Save failed" });
      }
    } catch { setMsg({ ok: false, text: "Network error" }); }
    setSaving(false);
  }

  // ── send preview ───────────────────────────────────────────────────────────
  async function handlePreview() {
    if (!selected || !previewEmail.includes("@")) return;
    setSendingPreview(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/email-templates/${selected.eventKey}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ previewEmail }),
      });
      const d = await r.json();
      setMsg({ ok: r.ok, text: r.ok ? (d.message ?? "Preview sent!") : (d.error ?? "Failed") });
    } catch { setMsg({ ok: false, text: "Network error" }); }
    setSendingPreview(false);
  }

  // ── variable insertion ─────────────────────────────────────────────────────
  function insertVar(key: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(`{{${key}}}`).run();
  }

  // ── live preview HTML ──────────────────────────────────────────────────────
  const previewSrcdoc = selected
    ? buildPreviewHtml({
        title: selected.name,
        bodyHtml: editing.bodyHtml ?? "",
        primaryColor: editing.primaryColor,
        logoUrl: editing.logoUrl || null,
        footerText: editing.footerText || null,
        fromName: editing.fromName,
      })
    : "";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-[680px] gap-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">

      {/* ── Left: template list ── */}
      <div className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Templates</p>
          <p className="text-xs text-gray-400 mt-0.5">{templates.length} events</p>
        </div>
        {loading ? (
          <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" /></div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 flex-1 overflow-y-auto">
            {templates.map(t => (
              <button key={t.eventKey} onClick={() => selectTemplate(t)}
                className={cn(
                  "w-full text-left px-3 py-2.5 transition-colors",
                  selected?.eventKey === t.eventKey
                    ? "bg-blue-50 dark:bg-blue-950 border-r-2 border-blue-500"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800",
                )}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.name}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                    t.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-gray-100 text-gray-400 dark:bg-gray-800",
                  )}>
                    {t.isActive ? "On" : "Off"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{t.eventKey}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Center: editor ── */}
      {selected ? (
        <div className="flex flex-1 min-w-0 overflow-hidden">

          {/* Editor panel */}
          <div className="flex flex-col flex-1 min-w-0 overflow-y-auto bg-white dark:bg-gray-950">

            {/* Header row */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{selected.name}</h3>
                <p className="text-[11px] text-gray-400 font-mono">{selected.eventKey}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Active toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
                  <div
                    onClick={() => setEditing(e => ({ ...e, isActive: !e.isActive }))}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors cursor-pointer",
                      editing.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600",
                    )}>
                    <div className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", editing.isActive ? "translate-x-4" : "")} />
                  </div>
                </label>
                {/* Preview toggle */}
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors font-medium",
                    showPreview
                      ? "border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800",
                  )}>
                  {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  Preview
                </button>
              </div>
            </div>

            {/* Form fields */}
            <div className="flex flex-col gap-3 px-4 py-3 shrink-0">

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Subject line</label>
                <input
                  value={editing.subject ?? ""}
                  onChange={e => setEditing(ed => ({ ...ed, subject: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Subject…"
                />
              </div>

              {/* Available vars */}
              {selected.availableVars?.length > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Click to insert variable</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.availableVars.map((v: { key: string; description: string }) => (
                      <button
                        key={v.key}
                        type="button"
                        title={v.description}
                        onClick={() => insertVar(v.key)}
                        className="inline-flex items-center bg-white dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 rounded px-2 py-0.5 text-[11px] font-mono text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors cursor-pointer"
                      >
                        {`{{${v.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rich text editor */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Body</label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <Toolbar editor={editor} />
                  <EditorContent editor={editor} />
                </div>
              </div>

              {/* Style row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">From name</label>
                  <input
                    value={editing.fromName ?? ""}
                    onChange={e => setEditing(ed => ({ ...ed, fromName: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Brand colour</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={editing.primaryColor ?? "#1B3A7A"}
                      onChange={e => setEditing(ed => ({ ...ed, primaryColor: e.target.value }))}
                      className="h-9 w-10 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5"
                    />
                    <input
                      value={editing.primaryColor ?? ""}
                      onChange={e => setEditing(ed => ({ ...ed, primaryColor: e.target.value }))}
                      className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="#1B3A7A"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Logo URL <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  value={editing.logoUrl ?? ""}
                  onChange={e => setEditing(ed => ({ ...ed, logoUrl: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Footer text <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  rows={2}
                  value={editing.footerText ?? ""}
                  onChange={e => setEditing(ed => ({ ...ed, footerText: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
                  placeholder="© 2025 Salt & Peps. All rights reserved."
                />
              </div>

              {/* Status message */}
              {msg && (
                <div className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  msg.ok
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
                )}>{msg.text}</div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex-wrap pb-4">
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save changes
                </button>
                <div className="flex-1" />
                <input
                  type="email"
                  value={previewEmail}
                  onChange={e => setPreviewEmail(e.target.value)}
                  placeholder="Send preview to…"
                  className="w-44 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={handlePreview} disabled={sendingPreview || !previewEmail.includes("@")}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
                  {sendingPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send preview
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: live preview ── */}
          {showPreview && (
            <div className="w-[380px] shrink-0 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-100 dark:bg-gray-900">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Live preview</p>
                <p className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">{editing.subject || "—"}</p>
              </div>
              <iframe
                key={selected.eventKey}
                srcDoc={previewSrcdoc}
                sandbox="allow-same-origin"
                className="flex-1 w-full border-0"
                title="Email preview"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-white dark:bg-gray-950">
          Select a template on the left to edit it
        </div>
      )}
    </div>
  );
}
