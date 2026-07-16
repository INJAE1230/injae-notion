"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-utils";

export function DeleteLogButton({ logId, title }: { logId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs/${logId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("업무가 삭제되었습니다");
      router.push("/logs");
      router.refresh();
    } catch {
      toastError("삭제에 실패했습니다", handleDelete);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        삭제
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>업무 삭제</DialogTitle>
            <DialogDescription>
              &quot;{title}&quot;을(를) 삭제하시겠습니까? 첨부파일도 함께 영구 삭제되며, 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
