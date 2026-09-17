"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createExampleResume, loadResumes, saveResumes } from "@/lib/resume-data";
import { TemplateView, templateDescriptions, templateNames } from "@/components/templates/template-view";
import type { TemplateId } from "@/types/resume";
const ids=Object.keys(templateNames) as TemplateId[];const groups:Record<TemplateId,string>={modern:"Modern",professional:"Professional",minimal:"Professional",developer:"Developer",executive:"Professional",creative:"Creative",compact:"ATS",ats:"ATS"};
export function TemplateGallery(){const[filter,setFilter]=useState("All");const router=useRouter();const items=useMemo(()=>ids.filter(id=>filter==="All"||groups[id]===filter),[filter]);function useTemplate(id:TemplateId){const r=createExampleResume(id);saveResumes([r,...loadResumes()]);router.push(`/builder/${r.id}`)}return <><div className="filter-row">{["All","Modern","Professional","ATS","Creative","Developer"].map(f=><Button key={f} variant={filter===f?"default":"outline"} onClick={()=>setFilter(f)}>{f}</Button>)}</div><div className="gallery-grid">{items.map(id=>{const r=createExampleResume(id);return <article className="gallery-card" key={id}><div className="gallery-preview"><TemplateView resume={r}/></div><div><h2>{templateNames[id]}</h2><p>{templateDescriptions[id]}</p><Button onClick={()=>useTemplate(id)}>Use template</Button></div></article>})}</div></>}
