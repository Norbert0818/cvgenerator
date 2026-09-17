import type { ResumeDocument, TemplateId } from "@/types/resume";
import { uid } from "@/types/resume";

export const defaultTheme = { accent: "#2563eb", font: "Inter", fontSize: "medium" as const, spacing: "normal" as const, margins: "normal" as const, photoShape: "circle" as const, showIcons: true, showSkillLevels: false, fitOnePage: false };

export function createExampleResume(template: TemplateId = "modern"): ResumeDocument {
  const now = new Date().toISOString();
  return {
    id: uid(), name: "Alex Morgan CV", createdAt: now, updatedAt: now, template, cvLanguage: "en", theme: { ...defaultTheme },
    data: {
      personal: { firstName: "Alex", lastName: "Morgan", title: "Software Developer", email: "alex.morgan@email.com", phone: "+40 712 345 678", location: "Cluj-Napoca, Romania", linkedin: "linkedin.com/in/alexmorgan", github: "github.com/alexmorgan", portfolio: "alexmorgan.dev" },
      summary: "Software developer experienced in building modern web and mobile applications using React, Flutter and .NET. Focused on reliable products, clear communication and measurable results.",
      experience: [{ id: uid(), jobTitle: "Software Developer", company: "Tech Solutions", location: "Cluj-Napoca, Romania", startDate: "2024-01", endDate: "", current: true, description: "Builds internal web and mobile products in a cross-functional team.", achievements: ["Developed React and TypeScript applications used by 200+ colleagues", "Integrated REST APIs and authentication systems", "Improved application performance by 35%"] }],
      education: [{ id: uid(), school: "Technical University of Cluj-Napoca", degree: "BSc", field: "Computer Science", location: "Cluj-Napoca", startDate: "2020", endDate: "2024", description: "Software engineering, databases and applied artificial intelligence.", grade: "9.20" }],
      skills: [{ id: uid(), name: "Technical Skills", skills: ["JavaScript", "TypeScript", "React", "Flutter", "C#", ".NET", "SQL", "Git", "REST APIs", "AI Model Training"].map(name => ({ id: uid(), name, level: "Advanced" as const })) }],
      languages: [{ id: uid(), language: "Hungarian", level: "Native" }, { id: uid(), language: "Romanian", level: "C1" }, { id: uid(), language: "English", level: "B2" }],
      projects: [{ id: uid(), name: "Qelvi", role: "Mobile Developer", date: "2025", link: "", github: "", technologies: ["Flutter", "Dart", "Computer Vision"], description: "A mobile tool for professional drivers with automated journey logging, reporting and AI-assisted image recognition." }],
      certifications: [], courses: [], awards: [], interests: ["Photography", "Travel", "Technology"], references: [], customSections: [],
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
