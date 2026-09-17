import type { ResumeDocument, TemplateId } from "@/types/resume";
import { uid } from "@/types/resume";
import { templateCatalog } from "@/lib/template-catalog";

export const defaultTheme = { accent: "#2563eb", font: "Inter", fontSize: "medium" as const, spacing: "normal" as const, margins: "normal" as const, photoShape: "circle" as const, showIcons: true, showSkillLevels: false, fitOnePage: false };

export function createBlankResume(template: TemplateId = "modern", accent = templateCatalog[template].defaultAccent): ResumeDocument {
  const now = new Date().toISOString();
  return {
    id: uid(), name: "Untitled CV", createdAt: now, updatedAt: now, template, cvLanguage: "en", theme: { ...defaultTheme, accent },
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

export function createTemplatePreviewResume(template: TemplateId, accent = templateCatalog[template].defaultAccent): ResumeDocument {
  const resume = createBlankResume(template, accent);
  resume.name = `${templateCatalog[template].name} preview`;
  resume.data = {
    ...resume.data,
    personal: {
      ...resume.data.personal,
      firstName: "Maya",
      lastName: "Chen",
      title: "Senior Product Designer",
      email: "maya.chen@email.com",
      phone: "+40 712 345 678",
      location: "Cluj-Napoca, Romania",
      linkedin: "linkedin.com/in/mayachen",
      portfolio: "mayachen.design",
    },
    summary: "Product designer creating clear digital experiences through research, thoughtful systems and close collaboration with engineering teams.",
    experience: [
      {
        id: uid(),
        jobTitle: "Senior Product Designer",
        company: "Northstar Studio",
        location: "Cluj-Napoca",
        startDate: "2023",
        endDate: "",
        current: true,
        description: "Leads product discovery and end-to-end design for web and mobile products.",
        achievements: ["Improved onboarding completion by 28%", "Built a reusable design system for four products"],
      },
      {
        id: uid(),
        jobTitle: "UX Designer",
        company: "Bright Labs",
        location: "Remote",
        startDate: "2020",
        endDate: "2023",
        current: false,
        description: "Designed customer journeys, prototypes and accessible interfaces.",
        achievements: [],
      },
    ],
    education: [{ id: uid(), school: "University of Art and Design", degree: "BA", field: "Product Design", location: "Cluj-Napoca", startDate: "2017", endDate: "2020", description: "Human-centered design and visual communication." }],
    skills: [{ id: uid(), name: "Core skills", skills: ["Product strategy", "Figma", "User research", "Prototyping", "Design systems"].map((name) => ({ id: uid(), name })) }],
    languages: [{ id: uid(), language: "English", level: "C1" }, { id: uid(), language: "Romanian", level: "Native" }],
    projects: [{ id: uid(), name: "Atlas Design System", role: "Design lead", date: "2025", technologies: ["Figma", "Tokens", "Storybook"], description: "A scalable component library used by three cross-functional teams." }],
    interests: ["Photography", "Architecture", "Travel"],
  };
  return resume;
}

export const STORAGE_KEY = "cvforge_resumes";
export function loadResumes(): ResumeDocument[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
export function saveResumes(resumes: ResumeDocument[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes)); }
export function upsertResume(resume: ResumeDocument) { const all = loadResumes(); const index = all.findIndex(x => x.id === resume.id); if (index >= 0) all[index] = resume; else all.unshift(resume); saveResumes(all); }
export function getResume(id: string) { return loadResumes().find(x => x.id === id); }
export function deleteResume(id: string) { saveResumes(loadResumes().filter(x => x.id !== id)); }
