import type { TemplateId } from "@/types/resume";

export type TemplateGroup = "Modern" | "Professional" | "Creative" | "Developer" | "ATS";

export interface TemplateDefinition {
  name: string;
  description: string;
  group: TemplateGroup;
  supportsPhoto: boolean;
  defaultAccent: string;
  accentPalette: string[];
}

const blues = ["#2563eb", "#0f766e", "#7c3aed", "#c2410c", "#be123c"];
const refined = ["#1e3a5f", "#334155", "#14532d", "#78350f", "#581c87"];
const vivid = ["#be185d", "#7c3aed", "#0891b2", "#ea580c", "#dc2626"];
const neutral = ["#111827", "#334155", "#3f3f46", "#44403c", "#1f2937"];

export const templateCatalog: Record<TemplateId, TemplateDefinition> = {
  modern: {
    name: "Modern",
    description: "Balanced two-column layout with a clean colored sidebar.",
    group: "Modern",
    supportsPhoto: true,
    defaultAccent: "#2563eb",
    accentPalette: blues,
  },
  professional: {
    name: "Professional",
    description: "Traditional business layout with a strong, confident header.",
    group: "Professional",
    supportsPhoto: true,
    defaultAccent: "#1e3a5f",
    accentPalette: refined,
  },
  minimal: {
    name: "Minimal",
    description: "Airy typography and generous whitespace for a calm presentation.",
    group: "Professional",
    supportsPhoto: false,
    defaultAccent: "#334155",
    accentPalette: neutral,
  },
  developer: {
    name: "Developer",
    description: "Dark technical sidebar with projects and skills in focus.",
    group: "Developer",
    supportsPhoto: false,
    defaultAccent: "#22c55e",
    accentPalette: ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#f43f5e"],
  },
  executive: {
    name: "Executive",
    description: "Centered, elegant hierarchy for senior and leadership roles.",
    group: "Professional",
    supportsPhoto: true,
    defaultAccent: "#7c2d12",
    accentPalette: refined,
  },
  creative: {
    name: "Creative",
    description: "Large portrait and a dramatic gradient side panel.",
    group: "Creative",
    supportsPhoto: true,
    defaultAccent: "#be185d",
    accentPalette: vivid,
  },
  compact: {
    name: "Compact",
    description: "Information-dense layout designed to fit more on one page.",
    group: "ATS",
    supportsPhoto: false,
    defaultAccent: "#334155",
    accentPalette: neutral,
  },
  ats: {
    name: "ATS Classic",
    description: "Plain single-column layout optimized for automated screening.",
    group: "ATS",
    supportsPhoto: false,
    defaultAccent: "#111827",
    accentPalette: neutral,
  },
  sidebar: {
    name: "Sidebar Pro",
    description: "Slim colored profile column with a spacious professional body.",
    group: "Modern",
    supportsPhoto: true,
    defaultAccent: "#0f766e",
    accentPalette: blues,
  },
  bold: {
    name: "Bold Header",
    description: "A striking full-width color header that makes the name memorable.",
    group: "Creative",
    supportsPhoto: true,
    defaultAccent: "#7c3aed",
    accentPalette: vivid,
  },
  elegant: {
    name: "Elegant",
    description: "Refined serif typography with subtle editorial details.",
    group: "Professional",
    supportsPhoto: true,
    defaultAccent: "#9a6b45",
    accentPalette: ["#9a6b45", "#7c2d12", "#3f6212", "#374151", "#6b21a8"],
  },
  timeline: {
    name: "Timeline",
    description: "A clear chronological line guides the reader through your career.",
    group: "Modern",
    supportsPhoto: false,
    defaultAccent: "#ea580c",
    accentPalette: vivid,
  },
  studio: {
    name: "Studio",
    description: "Oversized portrait and expressive color block for creative work.",
    group: "Creative",
    supportsPhoto: true,
    defaultAccent: "#0891b2",
    accentPalette: vivid,
  },
  geometric: {
    name: "Geometric",
    description: "Sharp accent blocks and an asymmetric contemporary header.",
    group: "Creative",
    supportsPhoto: true,
    defaultAccent: "#dc2626",
    accentPalette: vivid,
  },
  nordic: {
    name: "Nordic",
    description: "Quiet, modern typography with crisp spacing and restrained color.",
    group: "Modern",
    supportsPhoto: false,
    defaultAccent: "#2563eb",
    accentPalette: blues,
  },
  corporate: {
    name: "Corporate",
    description: "Structured split layout for finance, engineering and management.",
    group: "Professional",
    supportsPhoto: true,
    defaultAccent: "#1d4ed8",
    accentPalette: refined,
  },
};

export const templateIds = Object.keys(templateCatalog) as TemplateId[];
export const templateNames = Object.fromEntries(templateIds.map((id) => [id, templateCatalog[id].name])) as Record<TemplateId, string>;
export const templateDescriptions = Object.fromEntries(templateIds.map((id) => [id, templateCatalog[id].description])) as Record<TemplateId, string>;
export const templateSupportsPhoto = Object.fromEntries(templateIds.map((id) => [id, templateCatalog[id].supportsPhoto])) as Record<TemplateId, boolean>;

