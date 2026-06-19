"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { PRESET_CATEGORIES, TAG_COLORS, DAY_OF_WEEK_LABELS } from "@/lib/constants";
import { getPresetsByCategory } from "@/lib/template-presets";
import type { RecurringTemplateFormData, PresetCategory, TemplatePreset } from "@/lib/types";

function formatPresetDay(preset: TemplatePreset): string {
  if (preset.frequency === "매주") {
    return `${preset.frequency} ${DAY_OF_WEEK_LABELS[preset.dayValue] || ""}`;
  }
  return `${preset.frequency} ${preset.dayValue}일`;
}

export function TemplateGalleryDialog({
  open,
  onClose,
  onSelectPreset,
}: {
  open: boolean;
  onClose: () => void;
  onSelectPreset: (data: Omit<RecurringTemplateFormData, "active">) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | null>(null);
  const grouped = getPresetsByCategory();

  const handleSelect = (preset: TemplatePreset) => {
    onSelectPreset({
      name: preset.name,
      frequency: preset.frequency,
      dayValue: preset.dayValue,
      defaultProject: preset.defaultProject,
      defaultStatus: preset.defaultStatus,
      defaultTags: preset.defaultTags,
      defaultHours: preset.defaultHours,
      content: preset.content,
    });
    onClose();
  };

  const categories = selectedCategory
    ? [selectedCategory]
    : PRESET_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>템플릿 갤러리</DialogTitle>
          <DialogDescription>
            자주 사용되는 업무 템플릿을 선택하세요. 선택 후 내용을 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            전체
          </Button>
          {PRESET_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* 프리셋 카드 */}
        <div className="max-h-[55vh] overflow-y-auto space-y-6 pr-1">
          {categories.map((cat) => {
            const presets = grouped[cat];
            if (!presets || presets.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {cat}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {presets.map((preset) => (
                    <Card
                      key={preset.id}
                      className="p-4 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelect(preset)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-sm">
                            {preset.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(preset);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {preset.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatPresetDay(preset)}</span>
                          {preset.defaultHours && (
                            <span>· {preset.defaultHours}시간</span>
                          )}
                        </div>
                        {preset.defaultTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {preset.defaultTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className={`text-xs ${TAG_COLORS[tag] || ""}`}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
