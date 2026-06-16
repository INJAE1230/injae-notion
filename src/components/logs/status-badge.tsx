import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import type { Status } from "@/lib/types";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="secondary" className={STATUS_COLORS[status]}>
      {status}
    </Badge>
  );
}
