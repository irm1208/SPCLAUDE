import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

export const MAX_TICKET_IMAGE_FILES = 5;
export const MAX_TICKET_IMAGE_BYTES = 20 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface TicketAttachmentMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export function validateTicketFiles(files: File[]): string | null {
  if (files.length > MAX_TICKET_IMAGE_FILES) {
    return `Attach no more than ${MAX_TICKET_IMAGE_FILES} images at a time.`;
  }

  for (const file of files) {
    if (file.size <= 0) return "Empty images cannot be attached.";
    if (file.size > MAX_TICKET_IMAGE_BYTES) return "Each image must be 20 MB or smaller.";
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      return "Choose a supported image (JPEG, PNG, WebP, or GIF).";
    }
  }
  return null;
}

export function buildTicketMessageFormData(
  textField: "body" | "description" | "message",
  text: string,
  files: File[],
): FormData {
  const form = new FormData();
  form.append(textField, text);
  for (const file of files) form.append("files", file);
  return form;
}

interface TicketAttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  uploading?: boolean;
}

function formatImageSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.ceil(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function TicketAttachmentPicker({
  files,
  onChange,
  disabled = false,
  uploading = false,
}: TicketAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const addFiles = (selection: FileList | null) => {
    if (!selection) return;
    const next = [...files, ...Array.from(selection)];
    const validationError = validateTicketFiles(next);
    if (validationError) {
      setError(validationError);
    } else {
      onChange(next);
      setError("");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, currentIndex) => currentIndex !== index));
    setError("");
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        aria-label="Choose ticket images"
        disabled={disabled}
        onChange={event => addFiles(event.currentTarget.files)}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || files.length >= MAX_TICKET_IMAGE_FILES}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
          style={{ borderColor: "#D0DAE4", color: "#1B3A7A", background: "transparent" }}
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ImagePlus className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Add images"}
        </button>
        <span className="text-[10px]" style={{ color: "#8A9AAA" }}>
          Up to 5 images · 20 MB each · JPEG, PNG, WebP or GIF
        </span>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected images">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px]"
              style={{ borderColor: "rgba(27,58,122,0.2)", color: "#374151", background: "#F8FAFC" }}
            >
              <span className="max-w-[180px] truncate">{file.name}</span>
              <span className="shrink-0" style={{ color: "#8A9AAA" }}>{formatImageSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => removeFile(index)}
                className="shrink-0 rounded p-0.5 disabled:opacity-40"
                style={{ color: "#6B7280" }}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}

interface TicketMessageAttachmentsProps {
  attachments?: TicketAttachmentMetadata[];
  attachmentUrl: (attachmentId: string) => string;
  headers?: Record<string, string>;
}

function TicketAttachmentPreview({
  attachment,
  url,
  headers,
}: {
  attachment: TicketAttachmentMetadata;
  url: string;
  headers: Record<string, string>;
}) {
  const [objectUrl, setObjectUrl] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const headersKey = JSON.stringify(headers);

  useEffect(() => {
    let active = true;
    let createdUrl: string | undefined;
    setObjectUrl("");
    setUnavailable(false);

    fetch(url, {
      credentials: "include",
      headers: JSON.parse(headersKey) as Record<string, string>,
    })
      .then(response => {
        if (!response.ok) throw new Error("Attachment request failed");
        return response.blob();
      })
      .then(blob => {
        if (!blob.type.startsWith("image/")) throw new Error("Unexpected attachment type");
        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setObjectUrl(createdUrl);
        } else {
          URL.revokeObjectURL(createdUrl);
        }
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url, headersKey]);

  if (unavailable) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-2 text-[10px]" style={{ borderColor: "#D0DAE4", color: "#6B7280" }}>
        Image unavailable · {attachment.fileName}
      </div>
    );
  }
  if (!objectUrl) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px]" style={{ borderColor: "#D0DAE4", color: "#6B7280" }}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading {attachment.fileName}…
      </div>
    );
  }
  return (
    <figure className="space-y-1">
      <img
        src={objectUrl}
        alt={attachment.fileName}
        loading="lazy"
        className="max-h-72 max-w-full rounded-lg object-contain"
      />
      <figcaption className="text-[9px] break-all" style={{ opacity: 0.7 }}>
        {attachment.fileName}
      </figcaption>
    </figure>
  );
}

export function TicketMessageAttachments({
  attachments,
  attachmentUrl,
  headers = {},
}: TicketMessageAttachmentsProps) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {attachments.map(attachment => (
        SUPPORTED_IMAGE_TYPES.has(attachment.mimeType) ? (
          <TicketAttachmentPreview
            key={attachment.id}
            attachment={attachment}
            url={attachmentUrl(attachment.id)}
            headers={headers}
          />
        ) : (
          <div key={attachment.id} className="text-[10px] text-red-500" role="status">
            Unsupported image · {attachment.fileName}
          </div>
        )
      ))}
    </div>
  );
}