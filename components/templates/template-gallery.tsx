"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createBlankResume, loadResumes, saveResumes } from "@/lib/resume-data";
import { TemplateSelector } from "@/components/templates/template-selector";
import { templateCatalog, templateIds, type TemplateGroup } from "@/lib/template-catalog";
import type { TemplateId } from "@/types/resume";

const filters: Array<"All" | TemplateGroup> = ["All", "Modern", "Professional", "Creative", "Developer", "ATS"];

export function TemplateGallery() {
  const [filter, setFilter] = useState("All");
  const router = useRouter();
  const items = useMemo(
    () => templateIds.filter((id) => filter === "All" || templateCatalog[id].group === filter),
    [filter],
  );

  function selectTemplate(id: TemplateId, accent: string) {
    const resume = createBlankResume(id, accent);
    saveResumes([resume, ...loadResumes()]);
    router.push(`/builder/${resume.id}`);
  }

  return (
    <>
      <div className="filter-row">
        {filters.map((item) => (
          <Button key={item} variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>
            {item}
          </Button>
        ))}
      </div>
      <TemplateSelector ids={items} onSelect={selectTemplate}/>
    </>
  );
}
