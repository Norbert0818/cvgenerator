import type { ResumeDocument, TemplateId } from "@/types/resume";
import { uid } from "@/types/resume";

export const defaultTheme = { accent: "#2563eb", font: "Inter", fontSize: "medium" as const, spacing: "normal" as const, margins: "normal" as const, photoShape: "circle" as const, showIcons: true, showSkillLevels: false, fitOnePage: false };

export function createBlankResume(template: TemplateId = "modern"): ResumeDocument {
  const now = new Date().toISOString();
  return {
    id: uid(), name: "Untitled CV", createdAt: now, updatedAt: now, template, cvLanguage: "en", theme: { ...defaultTheme },
    data: {
      personal: { firstName: "", lastName: "", title: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
      summary: "",
      experience: [],
      education: [],
      skills: [],
      languages: [],
      projects: [],
      certifications: [], courses: [], awards: [], interests: [], references: [], customSections: [],
      sectionOrder: ["summary", "experience", "projects", "education", "skills", "languages", "certifications", "courses", "awards", "interests", "references", "custom"], hiddenSections: []
    }
  };
}

export const STORAGE_KEY = "cvforge_resumes";
export function loadResumes(): ResumeDocument[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
export function saveResumes(resumes: ResumeDocument[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes)); }
export function upsertResume(resume: ResumeDocument) { const all = loadResumes(); const index = all.findIndex(x => x.id === resume.id); if (index >= 0) all[index] = resume; else all.unshift(resume); saveResumes(all); }
export function getResume(id: string) { return loadResumes().find(x => x.id === id); }
export function deleteResume(id: string) { saveResumes(loadResumes().filter(x => x.id !== id)); }
