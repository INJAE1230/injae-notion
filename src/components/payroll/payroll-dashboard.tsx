"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { PayrollRecord, PayrollFormData } from "@/lib/payroll-types";

function formatKRW(n: number) {
  if (n === 0) return "0원";
  const abs = Math.abs(n);
  const formatted = abs >= 10000
    ? `${Math.floor(abs / 10000).toLocaleString()}만 ${abs % 10000 > 0 ? (abs % 10000).toLocaleString() : ""}`.trim() + "원"
    : abs.toLocaleString() + "원";
  return n < 0 ? `-${formatted}` : formatted;
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

function diffBadge(curr: number, prev: number) {
  const diff = curr - prev;
  if (diff === 0) return null;
  const isUp = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-emerald-500" : "text-red-500"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatKRW(Math.abs(diff))}
    </span>
  );
}

const EMPTY_FORM: PayrollFormData = {
  month: "",
  payDate: "",
  basePay: 2166000,
  overtimePay: 684000,
  overtimeHours: 44,
  holidayPay: 0,
  nightPay: 0,
  annualLeavePay: 0,
  positionPay: 0,
  mealAllowance: 0,
  vehicleAllowance: 0,
  otherPay: 0,
  incomeTax: 71580,
  residentTax: 7150,
  healthInsurance: 102450,
  longTermCare: 13460,
  nationalPension: 133000,
  employmentInsurance: 25650,
  yearEndSettlement: 0,
  otherDeduction: 0,
  totalWorkHours: 253,
  workDays: 21,
  hourlyWage: 10363.64,
  note: "",
};

export function PayrollDashboard({
  initialRecords,
}: {
  initialRecords: PayrollRecord[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PayrollFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...records].sort((a, b) => a.month.localeCompare(b.month)),
    [records]
  );

  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const chartData = useMemo(
    () =>
      sorted.map((r) => ({
        month: r.month.replace(/^\d{4}-/, "").replace(/^0/, "") + "월",
        실수령액: r.netPay,
        지급액: r.totalPay,
        공제: r.totalDeduction,
      })),
    [sorted]
  );

  const overtimeChart = useMemo(
    () =>
      sorted.map((r) => ({
        month: r.month.replace(/^\d{4}-/, "").replace(/^0/, "") + "월",
        연장시간: r.overtimeHours,
        연장수당: r.overtimePay,
      })),
    [sorted]
  );

  const handleSave = async () => {
    if (!formData.month || !formData.payDate) {
      toast.error("귀속월과 지급일을 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("등록 실패");
      toast.success("급여명세서가 등록되었습니다");
      setShowForm(false);
      setFormData({ ...EMPTY_FORM });
      const listRes = await fetch("/api/payroll");
      if (listRes.ok) setRecords(await listRes.json());
    } catch {
      toast.error("등록에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/payroll/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("삭제되었습니다");
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  const totalPay = formData.basePay + formData.overtimePay + formData.holidayPay + formData.nightPay + formData.annualLeavePay + formData.positionPay + formData.mealAllowance + formData.vehicleAllowance + formData.otherPay;
  const totalDeduction = formData.incomeTax + formData.residentTax + formData.healthInsurance + formData.longTermCare + formData.nationalPension + formData.employmentInsurance + formData.yearEndSettlement + formData.otherDeduction;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">급여 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            월별 급여명세서 기록 및 변동 분석
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" /> 명세서 등록
        </Button>
      </div>

      {/* Summary Cards */}
      {latest && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium">실수령액</span>
              </div>
              <p className="text-lg font-bold">{formatNumber(latest.netPay)}원</p>
              {prev && diffBadge(latest.netPay, prev.netPay)}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">지급액 합계</span>
              </div>
              <p className="text-lg font-bold">{formatNumber(latest.totalPay)}원</p>
              {prev && diffBadge(latest.totalPay, prev.totalPay)}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium">공제 합계</span>
              </div>
              <p className="text-lg font-bold">{formatNumber(latest.totalDeduction)}원</p>
              {prev && diffBadge(latest.totalDeduction, prev.totalDeduction)}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">연장근무</span>
              </div>
              <p className="text-lg font-bold">{latest.overtimeHours}시간</p>
              {prev && diffBadge(latest.overtimeHours, prev.overtimeHours)}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {sorted.length >= 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">월별 급여 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="netPayGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} className="fill-muted-foreground" />
                  <Tooltip formatter={(v) => formatNumber(Number(v)) + "원"} />
                  <Legend />
                  <Area type="monotone" dataKey="실수령액" stroke="var(--chart-1)" fill="url(#netPayGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="지급액" stroke="var(--chart-2)" fill="transparent" strokeWidth={1.5} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">연장근무 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={overtimeChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="hours" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} className="fill-muted-foreground" />
                  <YAxis yAxisId="pay" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} className="fill-muted-foreground" />
                  <Tooltip formatter={(v, name) => name === "연장시간" ? `${v}시간` : formatNumber(Number(v)) + "원"} />
                  <Legend />
                  <Bar yAxisId="hours" dataKey="연장시간" fill="var(--chart-3)" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar yAxisId="pay" dataKey="연장수당" fill="var(--chart-4)" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Month comparison */}
      {latest && prev && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              전월 비교 ({prev.month.replace(/^\d{4}-0?/, "")}월 → {latest.month.replace(/^\d{4}-0?/, "")}월)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 text-sm">
              {([
                ["기본급", latest.basePay, prev.basePay],
                ["연장수당", latest.overtimePay, prev.overtimePay],
                ["연장시간", latest.overtimeHours, prev.overtimeHours],
                ["지급액합계", latest.totalPay, prev.totalPay],
                ["공제합계", latest.totalDeduction, prev.totalDeduction],
                ["실수령액", latest.netPay, prev.netPay],
                ["근무일수", latest.workDays, prev.workDays],
                ["총근무시간", latest.totalWorkHours, prev.totalWorkHours],
                ["연말정산", latest.yearEndSettlement, prev.yearEndSettlement],
              ] as [string, number, number][]).map(([label, curr, prev]) => (
                <div key={label} className="flex items-center justify-between rounded-md bg-accent/50 px-3 py-2">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="text-right">
                    <span className="font-medium">{formatNumber(curr)}</span>
                    {diffBadge(curr, prev)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">급여 내역</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              등록된 급여명세서가 없습니다
            </p>
          ) : (
            [...sorted].reverse().map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <div key={r.id} className="rounded-lg border">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs font-mono">
                        {r.month}
                      </Badge>
                      <span className="font-medium">
                        실수령 {formatNumber(r.netPay)}원
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        연장 {r.overtimeHours}h · 근무 {r.workDays}일
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <Separator />
                      <div className="grid gap-4 md:grid-cols-2 text-sm">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground mb-2">지급 항목</p>
                          <Row label="기본급" value={r.basePay} />
                          <Row label="연장수당" value={r.overtimePay} sub={`${r.overtimeHours}시간`} />
                          {r.holidayPay > 0 && <Row label="휴일수당" value={r.holidayPay} />}
                          {r.nightPay > 0 && <Row label="야간수당" value={r.nightPay} />}
                          {r.annualLeavePay > 0 && <Row label="연차수당" value={r.annualLeavePay} />}
                          {r.positionPay > 0 && <Row label="직책수당" value={r.positionPay} />}
                          {r.mealAllowance > 0 && <Row label="식대" value={r.mealAllowance} />}
                          {r.vehicleAllowance > 0 && <Row label="차량지원비" value={r.vehicleAllowance} />}
                          {r.otherPay > 0 && <Row label="기타수당" value={r.otherPay} />}
                          <Separator className="my-1" />
                          <Row label="지급액 합계" value={r.totalPay} bold />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground mb-2">공제 항목</p>
                          <Row label="근로소득세" value={r.incomeTax} />
                          <Row label="주민세" value={r.residentTax} />
                          <Row label="건강보험" value={r.healthInsurance} />
                          <Row label="요양보험" value={r.longTermCare} />
                          <Row label="국민연금" value={r.nationalPension} />
                          <Row label="고용보험" value={r.employmentInsurance} />
                          {r.yearEndSettlement !== 0 && (
                            <Row
                              label="연말정산"
                              value={r.yearEndSettlement}
                              highlight={r.yearEndSettlement < 0}
                            />
                          )}
                          {r.otherDeduction > 0 && <Row label="기타공제" value={r.otherDeduction} />}
                          <Separator className="my-1" />
                          <Row label="공제 합계" value={r.totalDeduction} bold />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold">
                            실수령액: {formatNumber(r.netPay)}원
                          </span>
                          <span className="text-xs text-muted-foreground ml-3">
                            지급일 {r.payDate} · 총 {r.totalWorkHours}시간 · {r.workDays}일
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {r.note && (
                        <p className="text-xs text-muted-foreground bg-accent/50 rounded-md px-3 py-2">
                          {r.note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>급여명세서 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="귀속월" value={formData.month} onChange={(v) => setFormData({ ...formData, month: v })} type="month" />
              <FormField label="지급일" value={formData.payDate} onChange={(v) => setFormData({ ...formData, payDate: v })} type="date" />
            </div>

            <p className="text-xs font-medium text-muted-foreground">지급 항목</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumField label="기본급" value={formData.basePay} onChange={(v) => setFormData({ ...formData, basePay: v })} />
              <NumField label="연장수당" value={formData.overtimePay} onChange={(v) => setFormData({ ...formData, overtimePay: v })} />
              <NumField label="연장시간" value={formData.overtimeHours} onChange={(v) => setFormData({ ...formData, overtimeHours: v })} />
              <NumField label="휴일수당" value={formData.holidayPay} onChange={(v) => setFormData({ ...formData, holidayPay: v })} />
              <NumField label="야간수당" value={formData.nightPay} onChange={(v) => setFormData({ ...formData, nightPay: v })} />
              <NumField label="연차수당" value={formData.annualLeavePay} onChange={(v) => setFormData({ ...formData, annualLeavePay: v })} />
              <NumField label="직책수당" value={formData.positionPay} onChange={(v) => setFormData({ ...formData, positionPay: v })} />
              <NumField label="식대" value={formData.mealAllowance} onChange={(v) => setFormData({ ...formData, mealAllowance: v })} />
              <NumField label="차량지원비" value={formData.vehicleAllowance} onChange={(v) => setFormData({ ...formData, vehicleAllowance: v })} />
              <NumField label="기타수당" value={formData.otherPay} onChange={(v) => setFormData({ ...formData, otherPay: v })} />
            </div>

            <div className="text-sm font-medium text-right">
              지급액 합계: {formatNumber(totalPay)}원
            </div>

            <p className="text-xs font-medium text-muted-foreground">공제 항목</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumField label="근로소득세" value={formData.incomeTax} onChange={(v) => setFormData({ ...formData, incomeTax: v })} />
              <NumField label="주민세" value={formData.residentTax} onChange={(v) => setFormData({ ...formData, residentTax: v })} />
              <NumField label="건강보험" value={formData.healthInsurance} onChange={(v) => setFormData({ ...formData, healthInsurance: v })} />
              <NumField label="요양보험" value={formData.longTermCare} onChange={(v) => setFormData({ ...formData, longTermCare: v })} />
              <NumField label="국민연금" value={formData.nationalPension} onChange={(v) => setFormData({ ...formData, nationalPension: v })} />
              <NumField label="고용보험" value={formData.employmentInsurance} onChange={(v) => setFormData({ ...formData, employmentInsurance: v })} />
              <NumField label="연말정산" value={formData.yearEndSettlement} onChange={(v) => setFormData({ ...formData, yearEndSettlement: v })} />
              <NumField label="기타공제" value={formData.otherDeduction} onChange={(v) => setFormData({ ...formData, otherDeduction: v })} />
            </div>

            <div className="text-sm font-medium text-right">
              공제 합계: {formatNumber(totalDeduction)}원
            </div>

            <Separator />
            <div className="text-base font-bold text-right">
              실수령액: {formatNumber(totalPay - totalDeduction)}원
            </div>

            <p className="text-xs font-medium text-muted-foreground">근무 정보</p>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="총근무시간" value={formData.totalWorkHours} onChange={(v) => setFormData({ ...formData, totalWorkHours: v })} />
              <NumField label="근무일수" value={formData.workDays} onChange={(v) => setFormData({ ...formData, workDays: v })} />
              <NumField label="통상시급" value={formData.hourlyWage} onChange={(v) => setFormData({ ...formData, hourlyWage: v })} step={0.01} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">비고</label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="휴무 내역, 특이사항 등"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
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
        <span className={`${bold ? "font-bold" : ""} ${highlight ? "text-emerald-500" : ""}`}>
          {formatNumber(value)}원
        </span>
        {sub && (
          <span className="text-xs text-muted-foreground ml-1">({sub})</span>
        )}
      </div>
    </div>
  );
}

function FormField({
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
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
    </div>
  );
}

function NumField({
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
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
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
