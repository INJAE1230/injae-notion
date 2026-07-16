import { Input } from "@/components/ui/input";
import { formatNumber } from "./payroll-utils";

export function Row({
  label,
  value,
  sub,
  bold,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <div className="text-right">
        <span
          className={`${bold ? "font-bold" : ""} ${highlight ? "text-emerald-500" : ""}`}
        >
          {formatNumber(value)}원
        </span>
        {sub && (
          <span className="text-xs text-muted-foreground ml-1">({sub})</span>
        )}
      </div>
    </div>
  );
}

export function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
    </div>
  );
}

export function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        step={step}
        className="mt-1"
      />
    </div>
  );
}
