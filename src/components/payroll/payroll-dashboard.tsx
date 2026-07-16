"use client";

import { useState, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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
  Pencil,
  ChevronDown,
  ChevronUp,
  Calendar,
  Calculator,
  PiggyBank,
  Timer,
  Printer,
  FileText,
  ScanSearch,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-utils";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import {
  formatKRW,
  formatNumber,
  DEDUCTION_COLORS,
  EMPTY_FORM,
  recordToFormData,
  mergeOcrIntoForm,
} from "./payroll-utils";
import { diffBadge } from "./diff-badge";
import { TaxSimulator } from "./tax-simulator";
import { PrintPayslip } from "./print-payslip";
import { Row, FormField, NumField } from "./payroll-fields";
import type { PayrollRecord, PayrollFormData } from "@/lib/payroll-types";


export function PayrollDashboard({
  initialRecords,
}: {
  initialRecords: PayrollRecord[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PayrollFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [printRecord, setPrintRecord] = useState<PayrollRecord | null>(null);
  const [showTaxSim, setShowTaxSim] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const handleOcrUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 인식할 수 있습니다");
      return;
    }
    setOcrLoading(true);
    try {
      // 급여명세서는 저장 없이 인식만 — 파일을 그대로 보낸다
      const fd = new FormData();
      fd.append("file", file);
      const ocrRes = await fetch("/api/payroll/ocr", { method: "POST", body: fd });
      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) throw new Error(ocrData.error || "인식 실패");

      setFormData((prev) => mergeOcrIntoForm(prev, ocrData));
      toast.success("급여명세서를 인식했습니다. 값을 확인 후 저장하세요");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "인식에 실패했습니다");
    } finally {
      setOcrLoading(false);
      if (ocrInputRef.current) ocrInputRef.current.value = "";
    }
  };

  const allYears = useMemo(() => {
    const years = new Set(records.map((r) => r.month.substring(0, 4)));
    return [...years].sort().reverse();
  }, [records]);

  const filtered = useMemo(
    () =>
      selectedYear === "all"
        ? records
        : records.filter((r) => r.month.startsWith(selectedYear)),
    [records, selectedYear]
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.month.localeCompare(b.month)),
    [filtered]
  );

  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const annualStats = useMemo(() => {
    if (sorted.length === 0) return null;
    const totalNetPay = sorted.reduce((s, r) => s + r.netPay, 0);
    const totalGrossPay = sorted.reduce((s, r) => s + r.totalPay, 0);
    const totalDeduction = sorted.reduce((s, r) => s + r.totalDeduction, 0);
    const totalOvertimeHours = sorted.reduce(
      (s, r) => s + r.overtimeHours,
      0
    );
    const avgNetPay = Math.round(totalNetPay / sorted.length);
    return {
      totalNetPay,
      totalGrossPay,
      totalDeduction,
      totalOvertimeHours,
      avgNetPay,
      months: sorted.length,
    };
  }, [sorted]);

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

  const cumulativeChart = useMemo(() => {
    let cumNet = 0;
    let cumGross = 0;
    return sorted.map((r) => {
      cumNet += r.netPay;
      cumGross += r.totalPay;
      return {
        month: r.month.replace(/^\d{4}-/, "").replace(/^0/, "") + "월",
        누적실수령: cumNet,
        누적지급액: cumGross,
      };
    });
  }, [sorted]);

  const hourlyWageChart = useMemo(
    () =>
      sorted.map((r) => ({
        month: r.month.replace(/^\d{4}-/, "").replace(/^0/, "") + "월",
        통상시급: r.hourlyWage,
        실질시급: r.totalWorkHours > 0 ? Math.round(r.netPay / r.totalWorkHours) : 0,
      })),
    [sorted]
  );

  const deductionPieData = useMemo(() => {
    if (!latest) return [];
    const items = [
      { name: "근로소득세", value: latest.incomeTax },
      { name: "주민세", value: latest.residentTax },
      { name: "건강보험", value: latest.healthInsurance },
      { name: "요양보험", value: latest.longTermCare },
      { name: "국민연금", value: latest.nationalPension },
      { name: "고용보험", value: latest.employmentInsurance },
      { name: "연말정산", value: Math.abs(latest.yearEndSettlement) },
      { name: "기타공제", value: latest.otherDeduction },
    ];
    return items.filter((d) => d.value > 0);
  }, [latest]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEditForm = (r: PayrollRecord) => {
    setEditingId(r.id);
    setFormData(recordToFormData(r));
    setShowForm(true);
  };

  const handlePrint = (r: PayrollRecord) => {
    setPrintRecord(r);
    setTimeout(() => {
      const content = printRef.current;
      if (!content) return;
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("팝업이 차단되었습니다. 팝업을 허용해주세요.");
        return;
      }
      win.document.write(`<!DOCTYPE html><html><head><title>${r.month} 급여명세서</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Pretendard', -apple-system, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
  .sub { text-align: center; color: #666; margin-bottom: 24px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; font-size: 12px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .total-row td { font-weight: 700; background: #fafafa; }
  .net { text-align: center; font-size: 18px; font-weight: 700; margin: 20px 0; padding: 12px; border: 2px solid #333; }
  .info { display: flex; justify-content: space-between; color: #666; font-size: 11px; margin-top: 8px; }
  .note { margin-top: 12px; padding: 8px; background: #f9f9f9; border-radius: 4px; font-size: 12px; color: #555; }
  @media print { body { padding: 20px; } }
</style></head><body>${content.innerHTML}
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
      win.document.close();
      setPrintRecord(null);
    }, 100);
  };

  const handleSave = async () => {
    if (!formData.month || !formData.payDate) {
      toast.error("귀속월과 지급일을 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/payroll/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("수정 실패");
        toast.success("급여명세서가 수정되었습니다");
      } else {
        const res = await fetch("/api/payroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("등록 실패");
        toast.success("급여명세서가 등록되었습니다");
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
      const listRes = await fetch("/api/payroll");
      if (listRes.ok) setRecords(await listRes.json());
    } catch {
      toastError(editingId ? "수정에 실패했습니다" : "등록에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/payroll/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("삭제되었습니다");
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toastError("삭제에 실패했습니다");
    }
  };

  const totalPay =
    formData.basePay +
    formData.overtimePay +
    formData.holidayPay +
    formData.nightPay +
    formData.annualLeavePay +
    formData.positionPay +
    formData.mealAllowance +
    formData.vehicleAllowance +
    formData.otherPay;
  const totalDeduction =
    formData.incomeTax +
    formData.residentTax +
    formData.healthInsurance +
    formData.longTermCare +
    formData.nationalPension +
    formData.employmentInsurance +
    formData.yearEndSettlement +
    formData.otherDeduction;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">급여 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            월별 급여명세서 기록 및 변동 분석
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTaxSim(true)}>
            <Calculator className="mr-1 h-4 w-4" /> 연말정산
          </Button>
          <Button onClick={openCreateForm} size="sm">
            <Plus className="mr-1 h-4 w-4" /> 명세서 등록
          </Button>
        </div>
      </div>

      {/* Year Filter */}
      {allYears.length > 0 && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            <Button
              variant={selectedYear === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setSelectedYear("all")}
            >
              전체
            </Button>
            {allYears.map((y) => (
              <Button
                key={y}
                variant={selectedYear === y ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setSelectedYear(y)}
              >
                {y}년
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Latest Month Summary Cards */}
      {latest && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium">실수령액</span>
              </div>
              <p className="text-lg font-bold">
                {formatNumber(latest.netPay)}원
              </p>
              {prev && diffBadge(latest.netPay, prev.netPay)}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">지급액 합계</span>
              </div>
              <p className="text-lg font-bold">
                {formatNumber(latest.totalPay)}원
              </p>
              {prev && diffBadge(latest.totalPay, prev.totalPay)}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium">공제 합계</span>
              </div>
              <p className="text-lg font-bold">
                {formatNumber(latest.totalDeduction)}원
              </p>
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

      {/* Annual Summary */}
      {annualStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedYear === "all" ? "전체" : `${selectedYear}년`} 요약 (
              {annualStats.months}개월)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <PiggyBank className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">총 실수령액</p>
                  <p className="text-sm font-bold">
                    {formatKRW(annualStats.totalNetPay)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">총 지급액</p>
                  <p className="text-sm font-bold">
                    {formatKRW(annualStats.totalGrossPay)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">총 공제액</p>
                  <p className="text-sm font-bold">
                    {formatKRW(annualStats.totalDeduction)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-500/10 p-2">
                  <Calculator className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    월 평균 실수령
                  </p>
                  <p className="text-sm font-bold">
                    {formatKRW(annualStats.avgNetPay)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Timer className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">총 연장시간</p>
                  <p className="text-sm font-bold">
                    {annualStats.totalOvertimeHours}시간
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1: 급여추이 + 연장근무 */}
      {sorted.length >= 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                월별 급여 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="netPayGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    formatter={(v) => formatNumber(Number(v)) + "원"}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="실수령액"
                    stroke="var(--chart-1)"
                    fill="url(#netPayGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="지급액"
                    stroke="var(--chart-2)"
                    fill="transparent"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                연장근무 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={overtimeChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    yAxisId="hours"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}h`}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    yAxisId="pay"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    formatter={(v, name) =>
                      name === "연장시간"
                        ? `${v}시간`
                        : formatNumber(Number(v)) + "원"
                    }
                  />
                  <Legend />
                  <Bar
                    yAxisId="hours"
                    dataKey="연장시간"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                  <Bar
                    yAxisId="pay"
                    dataKey="연장수당"
                    fill="var(--chart-4)"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row 2: 누적 수입 + 시급 변동 */}
      {sorted.length >= 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                누적 수입 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={cumulativeChart}>
                  <defs>
                    <linearGradient id="cumNetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip formatter={(v) => formatNumber(Number(v)) + "원"} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="누적실수령"
                    stroke="var(--chart-1)"
                    fill="url(#cumNetGrad)"
                    strokeWidth={2}
                    name="누적 실수령액"
                  />
                  <Area
                    type="monotone"
                    dataKey="누적지급액"
                    stroke="var(--chart-2)"
                    fill="transparent"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    name="누적 지급액"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                시급 변동 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={hourlyWageChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${formatNumber(v)}원`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip formatter={(v) => formatNumber(Number(v)) + "원"} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="통상시급"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="실질시급"
                    stroke="var(--chart-4)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="실질시급 (실수령/총시간)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deduction Pie Chart */}
      {deductionPieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              공제 항목 비율 ({latest!.month.replace(/^\d{4}-0?/, "")}월)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer
                width="100%"
                height={220}
                className="max-w-[280px]"
              >
                <PieChart>
                  <Pie
                    data={deductionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {deductionPieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DEDUCTION_COLORS[i % DEDUCTION_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatNumber(Number(v)) + "원"}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm flex-1">
                {deductionPieData.map((d, i) => {
                  const pct = (
                    (d.value / latest!.totalDeduction) *
                    100
                  ).toFixed(1);
                  return (
                    <div
                      key={d.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              DEDUCTION_COLORS[i % DEDUCTION_COLORS.length],
                          }}
                        />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {formatNumber(d.value)}원
                        <span className="text-muted-foreground text-xs ml-1">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month comparison */}
      {latest && prev && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              전월 비교 ({prev.month.replace(/^\d{4}-0?/, "")}월 →{" "}
              {latest.month.replace(/^\d{4}-0?/, "")}월)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 text-sm">
              {(
                [
                  ["기본급", latest.basePay, prev.basePay],
                  ["연장수당", latest.overtimePay, prev.overtimePay],
                  ["연장시간", latest.overtimeHours, prev.overtimeHours],
                  ["지급액합계", latest.totalPay, prev.totalPay],
                  ["공제합계", latest.totalDeduction, prev.totalDeduction],
                  ["실수령액", latest.netPay, prev.netPay],
                  ["근무일수", latest.workDays, prev.workDays],
                  ["총근무시간", latest.totalWorkHours, prev.totalWorkHours],
                  ["연말정산", latest.yearEndSettlement, prev.yearEndSettlement],
                ] as [string, number, number][]
              ).map(([label, curr, p]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-md bg-accent/50 px-3 py-2"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <div className="text-right">
                    <span className="font-medium">{formatNumber(curr)}</span>
                    {diffBadge(curr, p)}
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
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            지급 항목
                          </p>
                          <Row label="기본급" value={r.basePay} />
                          <Row
                            label="연장수당"
                            value={r.overtimePay}
                            sub={`${r.overtimeHours}시간`}
                          />
                          {r.holidayPay > 0 && (
                            <Row label="휴일수당" value={r.holidayPay} />
                          )}
                          {r.nightPay > 0 && (
                            <Row label="야간수당" value={r.nightPay} />
                          )}
                          {r.annualLeavePay > 0 && (
                            <Row label="연차수당" value={r.annualLeavePay} />
                          )}
                          {r.positionPay > 0 && (
                            <Row label="직책수당" value={r.positionPay} />
                          )}
                          {r.mealAllowance > 0 && (
                            <Row label="식대" value={r.mealAllowance} />
                          )}
                          {r.vehicleAllowance > 0 && (
                            <Row
                              label="차량지원비"
                              value={r.vehicleAllowance}
                            />
                          )}
                          {r.otherPay > 0 && (
                            <Row label="기타수당" value={r.otherPay} />
                          )}
                          <Separator className="my-1" />
                          <Row label="지급액 합계" value={r.totalPay} bold />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            공제 항목
                          </p>
                          <Row label="근로소득세" value={r.incomeTax} />
                          <Row label="주민세" value={r.residentTax} />
                          <Row label="건강보험" value={r.healthInsurance} />
                          <Row label="요양보험" value={r.longTermCare} />
                          <Row label="국민연금" value={r.nationalPension} />
                          <Row
                            label="고용보험"
                            value={r.employmentInsurance}
                          />
                          {r.yearEndSettlement !== 0 && (
                            <Row
                              label="연말정산"
                              value={r.yearEndSettlement}
                              highlight={r.yearEndSettlement < 0}
                            />
                          )}
                          {r.otherDeduction > 0 && (
                            <Row label="기타공제" value={r.otherDeduction} />
                          )}
                          <Separator className="my-1" />
                          <Row
                            label="공제 합계"
                            value={r.totalDeduction}
                            bold
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold">
                            실수령액: {formatNumber(r.netPay)}원
                          </span>
                          <span className="text-xs text-muted-foreground ml-3">
                            지급일 {r.payDate} · 총 {r.totalWorkHours}시간 ·{" "}
                            {r.workDays}일
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(r)}
                            title="인쇄/PDF 내보내기"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm(r)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Hidden print template */}
      {printRecord && (
        <div style={{ position: "fixed", left: -9999, top: 0 }}>
          <div ref={printRef}>
            <PrintPayslip record={printRecord} />
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "급여명세서 수정" : "급여명세서 등록"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 급여명세서 이미지 자동 인식 */}
            <input
              ref={ocrInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleOcrUpload(f);
              }}
            />
            <button
              type="button"
              onClick={() => !ocrLoading && ocrInputRef.current?.click()}
              disabled={ocrLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-all ${
                ocrLoading
                  ? "cursor-not-allowed opacity-70"
                  : "border-border hover:border-violet-300 hover:bg-accent/30"
              }`}
            >
              {ocrLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  <span className="text-muted-foreground">명세서 인식 중...</span>
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4 text-violet-500" />
                  <span className="font-medium">급여명세서 이미지로 자동 입력</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-muted-foreground -mt-2">
              명세서 사진을 올리면 항목을 자동으로 읽어 채웁니다. 인식 후 값을 꼭 확인하세요.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="귀속월"
                value={formData.month}
                onChange={(v) => setFormData({ ...formData, month: v })}
                type="month"
              />
              <FormField
                label="지급일"
                value={formData.payDate}
                onChange={(v) => setFormData({ ...formData, payDate: v })}
                type="date"
              />
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              지급 항목
            </p>
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

            <p className="text-xs font-medium text-muted-foreground">
              공제 항목
            </p>
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

            <p className="text-xs font-medium text-muted-foreground">
              근무 정보
            </p>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="총근무시간" value={formData.totalWorkHours} onChange={(v) => setFormData({ ...formData, totalWorkHours: v })} />
              <NumField label="근무일수" value={formData.workDays} onChange={(v) => setFormData({ ...formData, workDays: v })} />
              <NumField label="통상시급" value={formData.hourlyWage} onChange={(v) => setFormData({ ...formData, hourlyWage: v })} step={0.01} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                비고
              </label>
              <Input
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                placeholder="휴무 내역, 특이사항 등"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : editingId ? "수정" : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tax Simulation Dialog */}
      <Dialog open={showTaxSim} onOpenChange={setShowTaxSim}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              연말정산 시뮬레이션
            </DialogTitle>
          </DialogHeader>
          <TaxSimulator records={sorted} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="급여 기록을 삭제할까요?"
        description="이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
      />
    </div>
  );
}

