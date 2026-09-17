"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createBlankResume, loadResumes, saveResumes } from "@/lib/resume-data";
import {
  TemplateView,
  templateDescriptions,
  templateNames,
  templateSupportsPhoto,
} from "@/components/templates/template-view";
import type { TemplateId } from "@/types/resume";

const ids = Object.keys(templateNames) as TemplateId[];
const groups: Record<TemplateId, string> = {
  modern: "Modern",
  professional: "Professional",
  minimal: "Professional",
  developer: "Developer",
  executive: "Professional",
  creative: "Creative",
  compact: "ATS",
  ats: "ATS",
};

export function TemplateGallery() {
  const [filter, setFilter] = useState("All");
  const router = useRouter();
  const items = useMemo(
    () => ids.filter((id) => filter === "All" || groups[id] === filter),
    [filter],
  );

  function useTemplate(id: TemplateId) {
    const resume = createBlankResume(id);
    saveResumes([resume, ...loadResumes()]);
    router.push(`/builder/${resume.id}`);
  }

  return (
    <>
      <div className="filter-row">
        {["All", "Modern", "Professional", "ATS", "Creative", "Developer"].map((item) => (
          <Button key={item} variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>
            {item}
          </Button>
        ))}
      </div>
      <div className="gallery-grid">
        {items.map((id) => {
          const resume = createBlankResume(id);
          return (
            <article className="gallery-card" key={id}>
              <div className="gallery-preview">
                <TemplateView resume={resume} previewPlaceholder />
              </div>
              <div>
                <div className="template-title-row">
                  <h2>{templateNames[id]}</h2>
                  {templateSupportsPhoto[id] && <span className="photo-template-badge">Photo</span>}
                </div>
                <p>{templateDescriptions[id]}</p>
                <Button onClick={() => useTemplate(id)}>Use blank template</Button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
