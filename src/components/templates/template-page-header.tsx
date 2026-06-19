"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import { TemplateFormDialog } from "./template-form-dialog";
import { TemplateGalleryDialog } from "./template-gallery-dialog";
import type { RecurringTemplateFormData } from "@/lib/types";

export function TemplatePageHeader() {
  const [showForm, setShowForm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [presetData, setPresetData] = useState<
    Partial<RecurringTemplateFormData> | undefined
  >();

  const handlePresetSelect = (
    data: Omit<RecurringTemplateFormData, "active">
  ) => {
    setPresetData(data);
    setShowGallery(false);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setPresetData(undefined);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">반복 템플릿</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGallery(true)}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            갤러리
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            템플릿 추가
          </Button>
        </div>
      </div>

      <TemplateGalleryDialog
        open={showGallery}
        onClose={() => setShowGallery(false)}
        onSelectPreset={handlePresetSelect}
      />

      <TemplateFormDialog
        key={presetData?.name || "new"}
        open={showForm}
        onClose={handleFormClose}
        initialData={presetData}
      />
    </>
  );
}
