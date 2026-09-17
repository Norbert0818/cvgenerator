"use client";

import { useState } from "react";
import { Code2, Globe, Link, Mail, MapPin, Phone } from "lucide-react";
import type { ResumeDocument, TemplateId } from "@/types/resume";
import { sectionLabels } from "@/lib/i18n";

export const templateNames: Record<TemplateId, string> = {
  modern: "Modern",
  professional: "Professional",
  minimal: "Minimal",
  developer: "Developer",
  executive: "Executive",
  creative: "Creative",
  compact: "Compact",
  ats: "ATS Classic",
};

export const templateSupportsPhoto: Record<TemplateId, boolean> = {
  modern: true,
  professional: true,
  minimal: false,
  developer: false,
  executive: true,
  creative: true,
  compact: false,
  ats: false,
};

const defaultPhotoSettings = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 };

function getPhotoGeometry(aspectRatio: number, settings: typeof defaultPhotoSettings) {
  const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const rotation = ((settings.rotation % 360) + 360) % 360;
  const swapsAxes = rotation === 90 || rotation === 270;
  const displayedAspectRatio = swapsAxes ? 1 / safeAspectRatio : safeAspectRatio;
  const visualWidth = (displayedAspectRatio >= 1 ? displayedAspectRatio : 1) * settings.zoom * 100;
  const visualHeight = (displayedAspectRatio >= 1 ? 1 : 1 / displayedAspectRatio) * settings.zoom * 100;
  return {
    imageWidth: swapsAxes ? visualHeight : visualWidth,
    imageHeight: swapsAxes ? visualWidth : visualHeight,
  };
}

function ProfilePhoto({src,alt,size,shape,settings}:{src:string;alt:string;size:number;shape:ResumeDocument["theme"]["photoShape"];settings:typeof defaultPhotoSettings}) {
  const [aspectRatio,setAspectRatio]=useState(1);
  const geometry=getPhotoGeometry(aspectRatio,settings);
  const borderRadius=shape==="circle"?"50%":shape==="rounded"?"16px":"0";
  return <span className={`profile-photo-frame shape-${shape}`} style={{position:"relative",width:`${size}px`,height:`${size}px`,display:"block",overflow:"hidden",flex:"0 0 auto",background:"#e5e7eb",borderRadius}}>
    <img
      src={src}
      alt={alt}
      className="profile-photo-image"
      onLoad={event=>setAspectRatio(event.currentTarget.naturalWidth/event.currentTarget.naturalHeight)}
      style={{position:"absolute",display:"block",left:`calc(50% + ${settings.offsetX}%)`,top:`calc(50% + ${settings.offsetY}%)`,width:`${geometry.imageWidth}%`,height:`${geometry.imageHeight}%`,maxWidth:"none",objectFit:"fill",transformOrigin:"center",transform:`translate(-50%, -50%) rotate(${settings.rotation}deg)`,pointerEvents:"none"}}
    />
  </span>;
}

function Dates({ start, end, current }: { start: string; end: string; current?: boolean }) {
  return (
    <span>
      {start}
      {start && (end || current) ? " — " : ""}
      {current ? "Present" : end}
    </span>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`cv-section ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function TemplatePlaceholder() {
  return (
    <div className="template-preview-placeholder" aria-hidden="true">
      <span className="placeholder-name" />
      <span className="placeholder-role" />
      <div className="placeholder-heading" />
      <span />
      <span />
      <span className="short" />
      <div className="placeholder-heading" />
      <span />
      <span className="short" />
    </div>
  );
}

export function TemplateView({
  resume,
  previewId,
  previewPlaceholder = false,
}: {
  resume: ResumeDocument;
  previewId?: string;
  previewPlaceholder?: boolean;
}) {
  const { data, theme, cvLanguage, template } = resume;
  const labels = sectionLabels[cvLanguage];
  const hidden = new Set(data.hiddenSections);
  const contacts = [
    [Mail, data.personal.email],
    [Phone, data.personal.phone],
    [MapPin, data.personal.location],
    [Globe, data.personal.website || data.personal.portfolio],
    [Link, data.personal.linkedin],
    [Code2, data.personal.github],
  ].filter(([, value]) => value);
  const size = theme.fitOnePage ? "small" : theme.fontSize;
  const classes = `resume-paper template-${template} font-${theme.font.replaceAll(" ", "").toLowerCase()} size-${size} space-${theme.fitOnePage ? "compact" : theme.spacing} margin-${theme.fitOnePage ? "small" : theme.margins}`;

  const content: Record<string, React.ReactNode> = {
    summary: data.summary && <Section title={labels.summary}><p>{data.summary}</p></Section>,
    experience: data.experience.length > 0 && <Section title={labels.experience}>{data.experience.map((item) => <article className="cv-entry" key={item.id}><div className="entry-head"><div><h3>{item.jobTitle}</h3><strong>{item.company}{item.location ? ` · ${item.location}` : ""}</strong></div><Dates start={item.startDate} end={item.endDate} current={item.current} /></div>{item.description && <p>{item.description}</p>}{item.achievements.length > 0 && <ul>{item.achievements.filter(Boolean).map((achievement, index) => <li key={index}>{achievement}</li>)}</ul>}</article>)}</Section>,
    education: data.education.length > 0 && <Section title={labels.education}>{data.education.map((item) => <article className="cv-entry" key={item.id}><div className="entry-head"><div><h3>{item.degree}{item.field ? ` · ${item.field}` : ""}</h3><strong>{item.school}{item.location ? ` · ${item.location}` : ""}</strong></div><Dates start={item.startDate} end={item.endDate} /></div>{item.description && <p>{item.description}</p>}</article>)}</Section>,
    skills: data.skills.length > 0 && <Section title={labels.skills}>{data.skills.map((group) => <div className="skill-group" key={group.id}><strong>{group.name}</strong><div className="tags">{group.skills.map((skill) => <span key={skill.id}>{skill.name}{theme.showSkillLevels && skill.level ? ` · ${skill.level}` : ""}</span>)}</div></div>)}</Section>,
    languages: data.languages.length > 0 && <Section title={labels.languages}><div className="language-list">{data.languages.map((item) => <span key={item.id}><strong>{item.language}</strong> — {item.level}</span>)}</div></Section>,
    projects: data.projects.length > 0 && <Section title={labels.projects}>{data.projects.map((item) => <article className="cv-entry" key={item.id}><div className="entry-head"><div><h3>{item.name}</h3><strong>{item.role}</strong></div><span>{item.date}</span></div><p>{item.description}</p><div className="tags">{item.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></article>)}</Section>,
    certifications: data.certifications.length > 0 && <Section title={labels.certifications}>{data.certifications.map((item) => <p key={item.id}><strong>{item.name}</strong> · {item.organization} · {item.issueDate}</p>)}</Section>,
    courses: data.courses.length > 0 && <Section title={labels.courses}>{data.courses.map((item) => <p key={item.id}><strong>{item.name}</strong> · {item.organization} · {item.date}</p>)}</Section>,
    awards: data.awards.length > 0 && <Section title={labels.awards}>{data.awards.map((item) => <p key={item.id}><strong>{item.name}</strong> · {item.organization} · {item.date}</p>)}</Section>,
    interests: data.interests.length > 0 && <Section title={labels.interests}><p>{data.interests.join(" · ")}</p></Section>,
    references: data.references.length > 0 && <Section title={labels.references}>{data.references.map((item) => <p key={item.id}><strong>{item.name}</strong> · {item.role}, {item.company}</p>)}</Section>,
  };

  const sideKeys = template === "developer" ? ["skills", "projects", "languages"] : ["skills", "languages", "education"];
  const isTwoColumn = ["modern", "creative", "developer"].includes(template);
  const photoSettings = data.personal.profileImageSettings ?? defaultPhotoSettings;
  const photoVisible = Boolean(data.personal.profileImage && templateSupportsPhoto[template]);
  const photoSize = template === "creative" ? 140 : 92;
  const profilePhoto = photoVisible ? (
    <ProfilePhoto src={data.personal.profileImage!} alt={`${data.personal.firstName} ${data.personal.lastName}`.trim() || "Profile"} size={photoSize} shape={theme.photoShape} settings={photoSettings}/>
  ) : null;
  const hasHeaderContent = Boolean(profilePhoto || data.personal.firstName || data.personal.lastName || data.personal.title);
  const renderHeader = (showPhoto = true) => hasHeaderContent ? (
    <header className="cv-header">
      {showPhoto && profilePhoto}
      <div>
        <h1>{data.personal.firstName} <b>{data.personal.lastName}</b></h1>
        {data.personal.title && <p className="job-title">{data.personal.title}</p>}
      </div>
    </header>
  ) : null;
  const Contact = contacts.length > 0 ? <div className="contact-list">{contacts.map(([Icon, value], index) => { const ContactIcon = Icon as typeof Mail; return <span key={index}>{theme.showIcons && <ContactIcon aria-hidden="true" />}<span>{String(value)}</span></span>; })}</div> : null;
  const custom = !hidden.has("custom") && data.customSections.map((section) => <Section key={section.id} title={section.name}>{section.entries.map((entry) => <article key={entry.id} className="cv-entry"><div className="entry-head"><div><h3>{entry.title}</h3><strong>{entry.subtitle}</strong></div><span>{entry.date}</span></div><p>{entry.description}</p></article>)}</Section>);
  const hasContent = hasHeaderContent || contacts.length > 0 || Boolean(data.summary) || data.sectionOrder.some((key) => Boolean(content[key])) || data.customSections.length > 0;
  const Placeholder = previewPlaceholder && !hasContent ? <TemplatePlaceholder /> : null;

  return (
    <div id={previewId} className={classes} style={{ "--cv-accent": theme.accent, "--cv-font": theme.font } as React.CSSProperties}>
      {isTwoColumn ? (
        <div className="two-col">
          <aside>
            {renderHeader()}
            {Contact}
            {sideKeys.map((key) => <div key={key}>{!hidden.has(key) && content[key]}</div>)}
          </aside>
          <main>
            {template !== "creative" && hasHeaderContent && <div className="wide-name">{renderHeader(false)}</div>}
            {Placeholder}
            {data.sectionOrder.filter((key) => !sideKeys.includes(key) && !hidden.has(key)).map((key) => <div key={key}>{content[key]}</div>)}
            {custom}
          </main>
        </div>
      ) : (
        <>
          {renderHeader()}
          {Contact}
          <main>
            {Placeholder}
            {data.sectionOrder.filter((key) => !hidden.has(key)).map((key) => <div key={key}>{content[key]}</div>)}
            {custom}
          </main>
        </>
      )}
    </div>
  );
}

export const templateDescriptions: Record<TemplateId, string> = {
  modern: "Balanced two-column layout with an editable profile photo.",
  professional: "Traditional business layout with an optional profile photo.",
  minimal: "Airy, photo-free typography with generous whitespace.",
  developer: "Photo-free, project-led layout for software and technical roles.",
  executive: "Elegant senior-level layout with an optional profile photo.",
  creative: "Distinctive color panel with a large editable profile photo.",
  compact: "Photo-free, information-dense layout designed to save space.",
  ats: "Plain photo-free single-column layout optimized for ATS parsing.",
};
