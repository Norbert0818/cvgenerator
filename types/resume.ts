export type Locale = "en" | "ro" | "hu";
export type TemplateId = "modern" | "professional" | "minimal" | "developer" | "executive" | "creative" | "compact" | "ats" | "sidebar" | "bold" | "elegant" | "timeline" | "studio" | "geometric" | "nordic" | "corporate";

export interface ProfileImageSettings {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export interface PersonalInfo {
  firstName: string; lastName: string; title: string; email: string; phone: string;
  location: string; website?: string; linkedin?: string; github?: string; portfolio?: string;
  drivingLicence?: string; dateOfBirth?: string; nationality?: string; profileImage?: string;
  profileImageSettings?: ProfileImageSettings;
}
export interface Experience { id: string; jobTitle: string; company: string; location: string; startDate: string; endDate: string; current: boolean; description: string; achievements: string[]; }
export interface Education { id: string; school: string; degree: string; field: string; location: string; startDate: string; endDate: string; description: string; grade?: string; }
export interface Skill { id: string; name: string; level?: "Beginner" | "Intermediate" | "Advanced" | "Expert"; }
export interface SkillGroup { id: string; name: string; skills: Skill[]; }
export interface Language { id: string; language: string; level: string; }
export interface Project { id: string; name: string; role: string; date: string; link?: string; github?: string; technologies: string[]; description: string; }
export interface Certification { id: string; name: string; organization: string; issueDate: string; credentialId?: string; url?: string; }
export interface Course { id: string; name: string; organization: string; date: string; description?: string; }
export interface Award { id: string; name: string; organization: string; date: string; description?: string; }
export interface Reference { id: string; name: string; role: string; company: string; email?: string; phone?: string; }
export interface CustomEntry { id: string; title: string; subtitle: string; date: string; description: string; }
export interface CustomSection { id: string; name: string; entries: CustomEntry[]; }

export interface ResumeData {
  personal: PersonalInfo; summary: string; experience: Experience[]; education: Education[];
  skills: SkillGroup[]; languages: Language[]; projects: Project[]; certifications: Certification[];
  courses: Course[]; awards: Award[]; interests: string[]; references: Reference[];
  customSections: CustomSection[]; sectionOrder: string[]; hiddenSections: string[];
}
export interface ResumeTheme { accent: string; font: string; fontSize: "small" | "medium" | "large"; spacing: "compact" | "normal" | "comfortable"; margins: "small" | "normal" | "large"; photoShape: "circle" | "rounded" | "square"; showIcons: boolean; showSkillLevels: boolean; fitOnePage: boolean; }
export interface ResumeDocument { id: string; name: string; createdAt: string; updatedAt: string; template: TemplateId; cvLanguage: Locale; theme: ResumeTheme; data: ResumeData; }

export const uid = () => Math.random().toString(36).slice(2, 10);
