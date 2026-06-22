"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { PROJECTS, STATUSES, PRIORITIES, TAGS, TAG_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/types";

export function LogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/logs?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];

  const toggleTag = useCallback(
    (tag: Tag) => {
      const next = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      updateParam("tags", next.length > 0 ? next.join(",") : null);
    },
    [currentTags, updateParam]
  );

  const debouncedSearch = useCallback(
    (value: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        updateParam("search", value || null);
      }, 300);
    },
    [updateParam]
  );

  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  const clearAll = useCallback(() => {
    setSearchValue("");
    router.push("/logs");
  }, [router]);

  const hasFilters =
    searchParams.has("dateFrom") ||
    searchParams.has("dateTo") ||
    searchParams.has("project") ||
    searchParams.has("status") ||
    searchParams.has("tags") ||
    searchParams.has("priority") ||
    searchParams.has("search");

  const filterCount = [
    searchParams.has("dateFrom"),
    searchParams.has("dateTo"),
    searchParams.has("project"),
    searchParams.has("status"),
    searchParams.has("priority"),
    searchParams.has("tags"),
    searchParams.has("search"),
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* 모바일: 필터 토글 버튼 */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          필터
          {filterCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              {filterCount}
            </Badge>
          )}
          {open ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-10" onClick={clearAll}>
            <X className="mr-1 h-3 w-3" />
            초기화
          </Button>
        )}
      </div>

      {/* 필터 본체: 데스크톱 항상 표시, 모바일은 토글 */}
      <div className={`space-y-3 ${open ? "block" : "hidden"} md:block`}>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            className="w-full sm:w-[160px] h-10"
            value={searchParams.get("dateFrom") || ""}
            onChange={(e) => updateParam("dateFrom", e.target.value || null)}
          />
          <span className="text-sm text-muted-foreground hidden sm:inline">~</span>
          <Input
            type="date"
            className="w-full sm:w-[160px] h-10"
            value={searchParams.get("dateTo") || ""}
            onChange={(e) => updateParam("dateTo", e.target.value || null)}
          />

          <Select
            value={searchParams.get("project") || "all"}
            onValueChange={(v) => updateParam("project", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[130px] h-10">
              <SelectValue placeholder="프로젝트" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 프로젝트</SelectItem>
              {PROJECTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get("status") || "all"}
            onValueChange={(v) => updateParam("status", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[120px] h-10">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="exclude-done">완료 제외</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get("priority") || "all"}
            onValueChange={(v) => updateParam("priority", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[130px] h-10">
              <SelectValue placeholder="우선순위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 우선순위</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="검색..."
            className="w-full sm:w-[180px] h-10"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              debouncedSearch(e.target.value);
            }}
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="hidden md:flex">
              <X className="mr-1 h-3 w-3" />
              초기화
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`cursor-pointer select-none h-8 text-sm ${
                currentTags.includes(tag) ? TAG_COLORS[tag] : ""
              }`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
