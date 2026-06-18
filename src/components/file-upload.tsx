"use client";

import { useState, useRef } from "react";
import { Paperclip, X, Loader2, FileText, Image, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { FileAttachment } from "@/lib/types";

export interface OcrResult {
  storeName: string;
  date: string | null;
  totalAmount: number | null;
  items: { name: string; quantity: number | null; amount: number | null }[];
  documentType: string;
  summary: string;
}

interface FileUploadProps {
  attachments: FileAttachment[];
  onChange: (attachments: FileAttachment[]) => void;
  onOcrResult?: (result: OcrResult) => void;
  maxFiles?: number;
}

function FileIcon({ type }: { type?: string }) {
  if (type?.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-orange-500" />;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileUpload({ attachments, onChange, onOcrResult, maxFiles = 5 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleOcr(index: number) {
    const file = attachments[index];
    if (!file?.type?.startsWith("image/")) return;
    setOcrLoading(index);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: file.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onOcrResult?.(data);
      toast.success("영수증 인식 완료");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "인식 실패");
    } finally {
      setOcrLoading(null);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxFiles - attachments.length;
    if (remaining <= 0) {
      toast.error(`최대 ${maxFiles}개까지 첨부할 수 있습니다.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const uploaded: FileAttachment[] = [];
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        uploaded.push(data);
      }
      onChange([...attachments, ...uploaded]);
      toast.success(`${uploaded.length}개 파일 업로드 완료`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    onChange(attachments.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">첨부파일</label>
        <span className="text-xs text-muted-foreground">
          ({attachments.length}/{maxFiles})
        </span>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <FileIcon type={file.type} />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate hover:text-blue-600 hover:underline"
              >
                {file.name}
              </a>
              {file.size && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </span>
              )}
              {onOcrResult && file.type?.startsWith("image/") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-blue-500"
                  onClick={() => handleOcr(idx)}
                  disabled={ocrLoading === idx}
                  title="AI 영수증 인식"
                >
                  {ocrLoading === idx ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ScanSearch className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                onClick={() => removeFile(idx)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {attachments.length < maxFiles && (
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.xlsx,.xls,.docx,.doc"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="mr-1 h-3.5 w-3.5" />
            )}
            {uploading ? "업로드 중..." : "파일 첨부"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            이미지, PDF, Excel, Word (최대 10MB)
          </p>
        </div>
      )}
    </div>
  );
}
