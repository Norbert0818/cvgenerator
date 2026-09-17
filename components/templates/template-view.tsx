"use client";
import { Mail, MapPin, Phone, Globe, Link, Code2 } from "lucide-react";
import type { ResumeDocument, TemplateId } from "@/types/resume";
import { sectionLabels } from "@/lib/i18n";

const templateNames: Record<TemplateId,string> = { modern:"Modern",professional:"Professional",minimal:"Minimal",developer:"Developer",executive:"Executive",creative:"Creative",compact:"Compact",ats:"ATS Classic" };
export { templateNames };

function Dates({start,end,current}:{start:string;end:string;current?:boolean}) { return <span>{start}{start && (end || current) ? " — " : ""}{current ? "Present" : end}</span>; }
function Section({title, children, className=""}:{title:string;children:React.ReactNode;className?:string}) { return <section className={`cv-section ${className}`}><h2>{title}</h2>{children}</section>; }

export function TemplateView({resume, previewId}:{resume:ResumeDocument;previewId?:string}) {
  const { data, theme, cvLanguage, template } = resume;
  const labels = sectionLabels[cvLanguage];
  const hidden = new Set(data.hiddenSections);
  const contacts = [
    [Mail, data.personal.email], [Phone, data.personal.phone], [MapPin, data.personal.location], [Globe, data.personal.website || data.personal.portfolio], [Link, data.personal.linkedin], [Code2, data.personal.github]
  ].filter(([,v])=>v);
  const size = theme.fitOnePage ? "small" : theme.fontSize;
  const classes = `resume-paper template-${template} font-${theme.font.replaceAll(" ","").toLowerCase()} size-${size} space-${theme.fitOnePage?"compact":theme.spacing} margin-${theme.fitOnePage?"small":theme.margins}`;
  const content: Record<string, React.ReactNode> = {
    summary: data.summary && <Section title={labels.summary}><p>{data.summary}</p></Section>,
    experience: data.experience.length > 0 && <Section title={labels.experience}>{data.experience.map(x=><article className="cv-entry" key={x.id}><div className="entry-head"><div><h3>{x.jobTitle}</h3><strong>{x.company}{x.location?` · ${x.location}`:""}</strong></div><Dates start={x.startDate} end={x.endDate} current={x.current}/></div>{x.description&&<p>{x.description}</p>}{x.achievements.length>0&&<ul>{x.achievements.filter(Boolean).map((a,i)=><li key={i}>{a}</li>)}</ul>}</article>)}</Section>,
    education: data.education.length > 0 && <Section title={labels.education}>{data.education.map(x=><article className="cv-entry" key={x.id}><div className="entry-head"><div><h3>{x.degree}{x.field?` · ${x.field}`:""}</h3><strong>{x.school}{x.location?` · ${x.location}`:""}</strong></div><Dates start={x.startDate} end={x.endDate}/></div>{x.description&&<p>{x.description}</p>}</article>)}</Section>,
    skills: data.skills.length > 0 && <Section title={labels.skills}>{data.skills.map(g=><div className="skill-group" key={g.id}><strong>{g.name}</strong><div className="tags">{g.skills.map(s=><span key={s.id}>{s.name}{theme.showSkillLevels&&s.level?` · ${s.level}`:""}</span>)}</div></div>)}</Section>,
    languages: data.languages.length > 0 && <Section title={labels.languages}><div className="language-list">{data.languages.map(x=><span key={x.id}><strong>{x.language}</strong> — {x.level}</span>)}</div></Section>,
    projects: data.projects.length > 0 && <Section title={labels.projects}>{data.projects.map(x=><article className="cv-entry" key={x.id}><div className="entry-head"><div><h3>{x.name}</h3><strong>{x.role}</strong></div><span>{x.date}</span></div><p>{x.description}</p><div className="tags">{x.technologies.map(t=><span key={t}>{t}</span>)}</div></article>)}</Section>,
    certifications: data.certifications.length > 0 && <Section title={labels.certifications}>{data.certifications.map(x=><p key={x.id}><strong>{x.name}</strong> · {x.organization} · {x.issueDate}</p>)}</Section>,
    courses: data.courses.length > 0 && <Section title={labels.courses}>{data.courses.map(x=><p key={x.id}><strong>{x.name}</strong> · {x.organization} · {x.date}</p>)}</Section>,
    awards: data.awards.length > 0 && <Section title={labels.awards}>{data.awards.map(x=><p key={x.id}><strong>{x.name}</strong> · {x.organization} · {x.date}</p>)}</Section>,
    interests: data.interests.length > 0 && <Section title={labels.interests}><p>{data.interests.join(" · ")}</p></Section>,
    references: data.references.length > 0 && <Section title={labels.references}>{data.references.map(x=><p key={x.id}><strong>{x.name}</strong> · {x.role}, {x.company}</p>)}</Section>,
  };
  const sideKeys = template === "developer" ? ["skills","projects","languages"] : ["skills","languages","education"];
  const isTwoColumn = ["modern","creative","developer"].includes(template);
  const photo = data.personal.profileImage;
  const Header = <header className="cv-header">
    {photo && <img src={photo} alt="" className={`profile-photo shape-${theme.photoShape}`} />}
    <div><h1>{data.personal.firstName} <b>{data.personal.lastName}</b></h1><p className="job-title">{data.personal.title}</p></div>
  </header>;
  const Contact = <div className="contact-list">{contacts.map(([Icon,v],i)=>{ const I=Icon as typeof Mail; return <span key={i}>{theme.showIcons&&<I aria-hidden="true"/>}<span>{String(v)}</span></span>})}</div>;
  const custom = !hidden.has("custom") && data.customSections.map(s=><Section key={s.id} title={s.name}>{s.entries.map(e=><article key={e.id} className="cv-entry"><div className="entry-head"><div><h3>{e.title}</h3><strong>{e.subtitle}</strong></div><span>{e.date}</span></div><p>{e.description}</p></article>)}</Section>);
  return <div id={previewId} className={classes} style={{"--cv-accent":theme.accent,"--cv-font":theme.font} as React.CSSProperties}>
    {isTwoColumn ? <div className="two-col">
      <aside>{Header}{Contact}{sideKeys.map(k=><div key={k}>{!hidden.has(k)&&content[k]}</div>)}</aside>
      <main>{template!=="creative" && <div className="wide-name">{Header}</div>}{data.sectionOrder.filter(k=>!sideKeys.includes(k)&&!hidden.has(k)).map(k=><div key={k}>{content[k]}</div>)}{custom}</main>
    </div> : <>{Header}{Contact}<main>{data.sectionOrder.filter(k=>!hidden.has(k)).map(k=><div key={k}>{content[k]}</div>)}{custom}</main></>}
  </div>;
}

export const templateDescriptions: Record<TemplateId,string> = {
  modern:"Balanced two-column layout with a clear blue sidebar.", professional:"Traditional business layout with strong section hierarchy.", minimal:"Airy typography and generous whitespace.", developer:"Project-led layout for software and technical roles.", executive:"Elegant senior-level typography focused on achievements.", creative:"Distinctive color panel and expressive profile header.", compact:"Information-dense layout designed to save space.", ats:"Plain single-column layout optimized for ATS parsing."
};
