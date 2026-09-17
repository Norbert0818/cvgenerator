"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TemplateView } from "@/components/templates/template-view";
import { createTemplatePreviewResume } from "@/lib/resume-data";
import { templateCatalog, templateIds } from "@/lib/template-catalog";
import type { TemplateId } from "@/types/resume";

function initialAccents() {
  return Object.fromEntries(templateIds.map((id) => [id, templateCatalog[id].defaultAccent])) as Record<TemplateId, string>;
}

export function TemplateSelector({
  ids = templateIds,
  activeId,
  activeAccent,
  variant = "gallery",
  onSelect,
}: {
  ids?: TemplateId[];
  activeId?: TemplateId;
  activeAccent?: string;
  variant?: "gallery" | "dialog";
  onSelect: (id: TemplateId, accent: string) => void;
}) {
  const [accents, setAccents] = useState<Record<TemplateId, string>>(() => {
    const values = initialAccents();
    if (activeId && activeAccent) values[activeId] = activeAccent;
    return values;
  });

  function setAccent(id: TemplateId, accent: string) {
    setAccents((current) => ({ ...current, [id]: accent }));
  }

  return <div className={`template-selector-grid ${variant === "dialog" ? "is-dialog" : "is-gallery"}`}>
    {ids.map((id) => {
      const definition = templateCatalog[id];
      const accent = accents[id];
      const preview = createTemplatePreviewResume(id, accent);
      return <article className={`template-selector-card ${activeId === id ? "is-active" : ""}`} key={id}>
        <button type="button" className="template-selector-preview" onClick={() => onSelect(id, accent)} aria-label={`Choose ${definition.name} template`}>
          <TemplateView resume={preview} showPhotoPlaceholder />
        </button>
        <div className="template-selector-info">
          <div className="template-title-row">
            <strong>{definition.name}</strong>
            {definition.supportsPhoto && <span className="photo-template-badge">Photo</span>}
          </div>
          <p>{definition.description}</p>
          <div className="template-selector-actions">
            <div className="template-swatches" aria-label={`${definition.name} colors`}>
              {definition.accentPalette.map((color) => <button
                type="button"
                key={color}
                className={accent === color ? "is-selected" : ""}
                style={{ backgroundColor: color }}
                onClick={() => setAccent(id, color)}
                aria-label={`Use ${color} color`}
                title={color}
              />)}
              <label className="template-custom-color" title="Custom color">
                <span aria-hidden="true">+</span>
                <input type="color" value={accent} onChange={(event) => setAccent(id, event.target.value)} aria-label={`Custom color for ${definition.name}`}/>
              </label>
            </div>
            <Button type="button" size="sm" onClick={() => onSelect(id, accent)}>{variant === "dialog" ? "Choose" : "Use blank template"}</Button>
          </div>
        </div>
      </article>;
    })}
  </div>;
}
