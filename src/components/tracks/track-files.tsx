"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, Upload, Trash2, FileText, ImageIcon, Loader2, FileSpreadsheet, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);
const IMAGE_MAX_WIDTH = 1200;
const IMAGE_QUALITY = 0.8;

interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string | Date;
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > IMAGE_MAX_WIDTH) {
        height = Math.round((height * IMAGE_MAX_WIDTH) / width);
        width = IMAGE_MAX_WIDTH;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("압축 실패"))),
        "image/jpeg",
        IMAGE_QUALITY
      );
    };
    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = objectUrl;
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getDisplayName(pathname: string): string {
  const name = pathname.split("/").pop() ?? pathname;
  return name.replace(/^\d+-/, "");
}

function FileIcon({ pathname }: { pathname: string }) {
  const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />;
  if (["xlsx", "xls", "csv"].includes(ext))
    return <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />;
  if (["pdf"].includes(ext))
    return <FileType className="h-4 w-4 text-red-500 shrink-0" />;
  return <FileText className="h-4 w-4 text-amber-500 shrink-0" />;
}

interface TrackFilesProps {
  trackId: string;
}

export function TrackFiles({ trackId }: TrackFilesProps) {
  const [files, setFiles] = useState<BlobFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracks/${trackId}/files`);
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      // silent — 파일 목록 조회 실패는 UI에 표시하지 않음
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isImage = IMAGE_MIME_TYPES.has(file.type);

    if (!isImage && file.size > MAX_DOC_SIZE) {
      toast.error("10MB 이하의 파일만 업로드 가능합니다");
      return;
    }

    setUploading(true);
    try {
      let uploadBlob: Blob = file;
      let filename = file.name;

      if (isImage) {
        uploadBlob = await compressImage(file);
        filename = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      }

      const formData = new FormData();
      formData.append("file", uploadBlob, filename);

      const res = await fetch(`/api/tracks/${trackId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success("파일이 업로드됐습니다");
      await fetchFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(url: string) {
    setDeletingUrl(url);
    try {
      const res = await fetch(`/api/tracks/${trackId}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.url !== url));
      toast.success("파일이 삭제됐습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeletingUrl(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            첨부 파일
            {files.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({files.length})</span>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "업로드 중..." : "파일 추가"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileChange}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          이미지 자동 압축 · 문서 10MB 이하
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">첨부된 파일이 없습니다</p>
        ) : (
          <div className="divide-y">
            {files.map((file) => (
              <div
                key={file.url}
                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
              >
                <FileIcon pathname={file.pathname} />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  <p className="text-sm truncate">{getDisplayName(file.pathname)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatSize(file.size)} · {new Date(file.uploadedAt).toLocaleDateString("ko-KR")}
                  </p>
                </a>
                <button
                  onClick={() => handleDelete(file.url)}
                  disabled={deletingUrl === file.url}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shrink-0"
                >
                  {deletingUrl === file.url
                    ? <Loader2 className="h-3.5 w-3.5 text-red-500 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5 text-red-500" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
