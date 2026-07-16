"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-utils";
import type { WorkLog } from "@/lib/types";

export function DeleteDialog({
  log,
  onClose,
  onDeleted,
}: {
  log: WorkLog | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!log) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/logs/${log.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("업무가 삭제되었습니다");
      onDeleted();
    } catch {
      toastError("삭제에 실패했습니다", handleDelete);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>업무 삭제</DialogTitle>
          <DialogDescription>
            &quot;{log?.title}&quot;을(를) 삭제하시겠습니까? 첨부파일도 함께 영구
            삭제되며, 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
