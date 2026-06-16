"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
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
import { X } from "lucide-react";
import { PROJECTS, STATUSES, TAGS, TAG_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/types";

export function LogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const clearAll = useCallback(() => {
    router.push("/logs");
  }, [router]);

  const hasFilters =
    searchParams.has("dateFrom") ||
    searchParams.has("dateTo") ||
    searchParams.has("project") ||
    searchParams.has("status") ||
    searchParams.has("tags") ||
    searchParams.has("search");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          className="w-[160px]"
          value={searchParams.get("dateFrom") || ""}
          onChange={(e) => updateParam("dateFrom", e.target.value || null)}
        />
        <span className="text-sm text-muted-foreground">~</span>
        <Input
          type="date"
          className="w-[160px]"
          value={searchParams.get("dateTo") || ""}
          onChange={(e) => updateParam("dateTo", e.target.value || null)}
        />

        <Select
          value={searchParams.get("project") || "all"}
          onValueChange={(v) => updateParam("project", v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[130px]">
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
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="text"
          placeholder="검색..."
          className="w-[180px]"
          value={searchParams.get("search") || ""}
          onChange={(e) => updateParam("search", e.target.value || null)}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
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
            className={`cursor-pointer select-none ${
              currentTags.includes(tag) ? TAG_COLORS[tag] : ""
            }`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
