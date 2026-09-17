"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Download, Eye, FileJson, GripVertical, ImagePlus, Moon, Palette, Plus, Printer, Redo2, RotateCcw, RotateCw, Sparkles, Sun, Trash2, Undo2, Upload } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TemplateView, templateDescriptions, templateNames, templateSupportsPhoto } from "@/components/templates/template-view";
import { createBlankResume, getResume, upsertResume } from "@/lib/resume-data";
import { sectionLabels, t } from "@/lib/i18n";
import type { Locale, ResumeDocument, TemplateId } from "@/types/resume";
import { uid } from "@/types/resume";

const templateIds = Object.keys(templateNames) as TemplateId[];
const sectionKeys = ["summary","experience","projects","education","skills","languages","certifications","courses","awards","interests","references","custom"];
const defaultPhotoSettings = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 };

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function prepareProfilePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("invalid-type");
  if (file.size > 10_000_000) throw new Error("too-large");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.84),
      aspectRatio: image.naturalWidth / image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderEditedPhoto(
  source: string,
  settings: typeof defaultPhotoSettings,
  shape: "circle" | "rounded" | "square",
) {
  const image = await loadImage(source);
  const size = 600;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.save();
  context.beginPath();
  if (shape === "circle") {
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  } else if (shape === "rounded") {
    context.roundRect(0, 0, size, size, 70);
  } else {
    context.rect(0, 0, size, size);
  }
  context.clip();
  const coverScale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * settings.zoom;
  context.translate(size / 2 + (settings.offsetX / 100) * size, size / 2 + (settings.offsetY / 100) * size);
  context.rotate((settings.rotation * Math.PI) / 180);
  context.scale(coverScale, coverScale);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  context.restore();
  return canvas.toDataURL("image/png");
}

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
    maxOffsetX: Math.max(0, (visualWidth - 100) / 2),
    maxOffsetY: Math.max(0, (visualHeight - 100) / 2),
  };
}

function Field({label,children,wide=false}:{label:string;children:React.ReactNode;wide?:boolean}) { return <label className={`field ${wide?"wide":""}`}><span>{label}</span>{children}</label>; }
function SortableSection({id,label,hidden,onToggle}:{id:string;label:string;hidden:boolean;onToggle:()=>void}) {
  const {attributes,listeners,setNodeRef,transform,transition}=useSortable({id});
  return <div ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition}} className="section-row"><button className="drag-handle" {...attributes} {...listeners} aria-label={`Reorder ${label}`}><GripVertical/></button><span>{label}</span><Switch checked={!hidden} onCheckedChange={onToggle} aria-label={`Toggle ${label}`}/></div>;
}

export function ResumeBuilder() {
  const [resume,setResume] = useState<ResumeDocument|null>(null);
  const [locale,setLocale] = useState<Locale>("en");
  const [saveState,setSaveState] = useState<"saving"|"saved">("saved");
  const [mobileTab,setMobileTab] = useState("edit");
  const [dark,setDark] = useState(false);
  const [photoEditorOpen,setPhotoEditorOpen] = useState(false);
  const [photoDragging,setPhotoDragging] = useState(false);
  const [photoAspectRatio,setPhotoAspectRatio] = useState(1);
  const past = useRef<ResumeDocument[]>([]); const future = useRef<ResumeDocument[]>([]); const importRef = useRef<HTMLInputElement>(null); const photoInputRef = useRef<HTMLInputElement>(null);
  const photoDrag = useRef<{pointerId:number;startX:number;startY:number;originX:number;originY:number}|null>(null);
  const sensors=useSensors(useSensor(PointerSensor),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  useEffect(()=>{ const id=window.location.pathname.split("/").pop()||"new"; const existing=getResume(id); const doc=existing||createBlankResume(); if(!existing){doc.id=id==="new"?doc.id:id;upsertResume(doc); if(id==="new") history.replaceState(null,"",`/builder/${doc.id}`);} setResume(doc); const savedLocale=localStorage.getItem("cvforge_locale") as Locale|null; if(savedLocale)setLocale(savedLocale); },[]);
  useEffect(()=>{document.documentElement.classList.toggle("dark",dark)},[dark]);
  useEffect(()=>{if(!resume)return; setSaveState("saving"); const timer=setTimeout(()=>{upsertResume({...resume,updatedAt:new Date().toISOString()});setSaveState("saved")},500);return()=>clearTimeout(timer)},[resume]);
  useEffect(()=>{ if(!resume)return; const handler=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault(); if(e.shiftKey) redo(); else undo();}}; window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[resume]);
  const copy = (x:ResumeDocument) => structuredClone(x);
  const change = useCallback((mutate:(draft:ResumeDocument)=>void)=>{setResume(current=>{if(!current)return current;past.current.push(copy(current)); if(past.current.length>40)past.current.shift();future.current=[];const next=copy(current);mutate(next);return next})},[]);
  const undo=()=>setResume(current=>{if(!current||!past.current.length)return current;future.current.push(copy(current));return past.current.pop()!});
  const redo=()=>setResume(current=>{if(!current||!future.current.length)return current;past.current.push(copy(current));return future.current.pop()!});
  const tr=t(locale);
  const labels:Record<string,string>={summary:tr.summary,experience:tr.experience,projects:tr.projects,education:tr.education,skills:tr.skills,languages:tr.languages,certifications:tr.certifications,courses:tr.courses,awards:tr.awards,interests:tr.interests,references:tr.references,custom:tr.custom};
  const score=useMemo(()=>{if(!resume)return 0;const d=resume.data;let s=0;s+=d.personal.email?10:0;s+=d.personal.phone?8:0;s+=d.personal.linkedin?5:0;s+=d.summary.length>=60&&d.summary.length<=500?14:0;s+=Math.min(22,d.experience.length*11);s+=d.education.length?12:0;s+=Math.min(16,d.skills.flatMap(g=>g.skills).length*2);s+=d.experience.some(x=>x.achievements.some(a=>/\d/.test(a)))?8:0;s+=d.projects.length?5:0;return Math.min(100,s)},[resume]);
  if(!resume)return <div className="loading-screen">CVForge</div>;

  function exportJson(){if(!resume)return;const blob=new Blob([JSON.stringify(resume,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${resume.name.replaceAll(" ","_")}.json`;a.click();URL.revokeObjectURL(a.href);toast.success(tr.export);}
  async function importJson(file:File){try{const raw=JSON.parse(await file.text());if(!raw?.data?.personal||!raw?.template)throw new Error();change(d=>Object.assign(d,raw,{id:d.id,createdAt:d.createdAt,updatedAt:new Date().toISOString()}));toast.success(tr.import)}catch{toast.error("This file doesn't contain valid CV data.")}}
  async function uploadProfilePhoto(file:File){
    try{
      const prepared=await prepareProfilePhoto(file);
      setPhotoAspectRatio(prepared.aspectRatio);
      change(d=>{d.data.personal.profileImage=prepared.dataUrl;d.data.personal.profileImageSettings={...defaultPhotoSettings}});
      setPhotoEditorOpen(true);
    }catch(error){
      toast.error(error instanceof Error&&error.message==="too-large"?"The image can be at most 10 MB.":"Please choose a JPG, PNG or WebP image.");
    }finally{
      if(photoInputRef.current)photoInputRef.current.value="";
    }
  }
  async function downloadPdf(){if(!resume)return;try{toast.loading("Preparing PDF…",{id:"pdf"});const{default:jsPDF}=await import("jspdf");const pdf=new jsPDF("p","mm","a4");const d=resume.data,p=d.personal,accent=resume.theme.accent;let y=18;const margin=17,width=176;if(p.profileImage&&templateSupportsPhoto[resume.template]){const editedPhoto=await renderEditedPhoto(p.profileImage,p.profileImageSettings??defaultPhotoSettings,resume.theme.photoShape);pdf.addImage(editedPhoto,"PNG",165,10,28,28);y=44}const room=(h=7)=>{if(y+h>282){pdf.addPage();y=18}};const text=(value:string,size=10,bold=false,color="#263247")=>{if(!value)return;pdf.setFont("helvetica",bold?"bold":"normal");pdf.setFontSize(size);pdf.setTextColor(color);const lines=pdf.splitTextToSize(value,width);room(lines.length*(size*.42)+3);pdf.text(lines,margin,y);y+=lines.length*(size*.42)+3};const heading=(value:string)=>{room(12);y+=3;pdf.setDrawColor(accent);pdf.setLineWidth(.5);pdf.line(margin,y+2,margin+width,y+2);pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.setTextColor(accent);pdf.text(value.toUpperCase(),margin,y);y+=9};text(`${p.firstName} ${p.lastName}`,24,true,"#14213d");text(p.title,13,true,accent);text([p.email,p.phone,p.location,p.linkedin,p.github,p.portfolio].filter(Boolean).join("  |  "),8,false,"#4b5563");if(d.summary){heading(sectionLabels[resume.cvLanguage].summary);text(d.summary)}for(const section of d.sectionOrder){if(d.hiddenSections.includes(section)||section==="summary")continue;if(section==="experience"&&d.experience.length){heading(sectionLabels[resume.cvLanguage].experience);d.experience.forEach(x=>{text(`${x.jobTitle} — ${x.company}`,11,true);text(`${x.startDate} – ${x.current?"Present":x.endDate}${x.location?`  |  ${x.location}`:""}`,8,false,"#6b7280");text(x.description);x.achievements.filter(Boolean).forEach(a=>text(`• ${a}`,9))})}if(section==="education"&&d.education.length){heading(sectionLabels[resume.cvLanguage].education);d.education.forEach(x=>{text(`${x.degree}${x.field?` · ${x.field}`:""}`,11,true);text(`${x.school}  |  ${x.startDate} – ${x.endDate}`,9);text(x.description)})}if(section==="projects"&&d.projects.length){heading(sectionLabels[resume.cvLanguage].projects);d.projects.forEach(x=>{text(`${x.name}${x.role?` — ${x.role}`:""}`,11,true);text(x.technologies.join(" · "),8,false,accent);text(x.description)})}if(section==="skills"&&d.skills.length){heading(sectionLabels[resume.cvLanguage].skills);d.skills.forEach(g=>text(`${g.name}: ${g.skills.map(s=>s.name).join(", ")}`,9))}if(section==="languages"&&d.languages.length){heading(sectionLabels[resume.cvLanguage].languages);text(d.languages.map(x=>`${x.language} — ${x.level}`).join("  |  "),9)}if(section==="interests"&&d.interests.length){heading(sectionLabels[resume.cvLanguage].interests);text(d.interests.join(" · "),9)}}pdf.save(`${p.firstName||"Resume"}_${p.lastName||""}_CV.pdf`);toast.success("PDF downloaded",{id:"pdf"})}catch(error){console.error("PDF export failed",error);toast.error("PDF export failed. Please try again.",{id:"pdf"})}}
  function onDragEnd(e:DragEndEvent){if(!e.over||e.active.id===e.over.id)return;change(d=>{const a=d.data.sectionOrder.indexOf(String(e.active.id)),b=d.data.sectionOrder.indexOf(String(e.over!.id));d.data.sectionOrder=arrayMove(d.data.sectionOrder,a,b)})}
  const setPersonal=(key:string,value:string)=>change(d=>{(d.data.personal as unknown as Record<string,string>)[key]=value});
  const addExperience=()=>change(d=>d.data.experience.push({id:uid(),jobTitle:"",company:"",location:"",startDate:"",endDate:"",current:false,description:"",achievements:[]}));
  const addEducation=()=>change(d=>d.data.education.push({id:uid(),school:"",degree:"",field:"",location:"",startDate:"",endDate:"",description:""}));
  const addProject=()=>change(d=>d.data.projects.push({id:uid(),name:"",role:"",date:"",technologies:[],description:""}));
  const photoSettings=resume.data.personal.profileImageSettings??defaultPhotoSettings;
  const photoShapeRadius=resume.theme.photoShape==="circle"?"50%":resume.theme.photoShape==="rounded"?"18px":"0";
  const updatePhotoSetting=(key:keyof typeof defaultPhotoSettings,value:number)=>change(d=>{d.data.personal.profileImageSettings={...(d.data.personal.profileImageSettings??defaultPhotoSettings),[key]:value}});
  const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
  const photoGeometry=getPhotoGeometry(photoAspectRatio,photoSettings);
  const updatePhotoZoom=(value:number)=>change(d=>{const current=d.data.personal.profileImageSettings??defaultPhotoSettings;const zoom=clamp(value,1,3);const next={...current,zoom};const geometry=getPhotoGeometry(photoAspectRatio,next);d.data.personal.profileImageSettings={...next,offsetX:clamp(current.offsetX,-geometry.maxOffsetX,geometry.maxOffsetX),offsetY:clamp(current.offsetY,-geometry.maxOffsetY,geometry.maxOffsetY)}});
  const rotatePhoto=(direction:-1|1)=>change(d=>{const current=d.data.personal.profileImageSettings??defaultPhotoSettings;const rotation=((current.rotation+direction*90)%360+360)%360;const next={...current,rotation};const geometry=getPhotoGeometry(photoAspectRatio,next);d.data.personal.profileImageSettings={...next,offsetX:clamp(current.offsetX,-geometry.maxOffsetX,geometry.maxOffsetX),offsetY:clamp(current.offsetY,-geometry.maxOffsetY,geometry.maxOffsetY)}});
  function beginPhotoDrag(event:React.PointerEvent<HTMLDivElement>){
    if(!resume)return;
    past.current.push(copy(resume));if(past.current.length>40)past.current.shift();future.current=[];
    photoDrag.current={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:photoSettings.offsetX,originY:photoSettings.offsetY};
    event.currentTarget.setPointerCapture(event.pointerId);setPhotoDragging(true);
  }
  function movePhoto(event:React.PointerEvent<HTMLDivElement>){
    const drag=photoDrag.current;if(!drag||drag.pointerId!==event.pointerId)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const offsetX=clamp(drag.originX+((event.clientX-drag.startX)/rect.width)*100,-photoGeometry.maxOffsetX,photoGeometry.maxOffsetX);
    const offsetY=clamp(drag.originY+((event.clientY-drag.startY)/rect.height)*100,-photoGeometry.maxOffsetY,photoGeometry.maxOffsetY);
    setResume(current=>{if(!current)return current;const next=copy(current);next.data.personal.profileImageSettings={...(next.data.personal.profileImageSettings??defaultPhotoSettings),offsetX,offsetY};return next});
  }
  function endPhotoDrag(event:React.PointerEvent<HTMLDivElement>){
    if(photoDrag.current?.pointerId===event.pointerId)photoDrag.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    setPhotoDragging(false);
  }
  function rememberPhotoAspectRatio(event:React.SyntheticEvent<HTMLImageElement>){
    const aspectRatio=event.currentTarget.naturalWidth/event.currentTarget.naturalHeight;
    if(!Number.isFinite(aspectRatio)||aspectRatio<=0)return;
    setPhotoAspectRatio(aspectRatio);
    setResume(current=>{if(!current)return current;const settings=current.data.personal.profileImageSettings??defaultPhotoSettings;const geometry=getPhotoGeometry(aspectRatio,settings);const offsetX=clamp(settings.offsetX,-geometry.maxOffsetX,geometry.maxOffsetX);const offsetY=clamp(settings.offsetY,-geometry.maxOffsetY,geometry.maxOffsetY);if(offsetX===settings.offsetX&&offsetY===settings.offsetY)return current;const next=copy(current);next.data.personal.profileImageSettings={...settings,offsetX,offsetY};return next});
  }

  const Editor=<div className="editor-panel">
    <div className="editor-intro"><div><span className="eyebrow">CV content</span><h2>{tr.edit}</h2></div><Button variant="outline" size="sm" onClick={()=>{const fresh=createBlankResume(resume.template);change(d=>Object.assign(d,{data:fresh.data}));}}>{tr.clear}</Button></div>
    <Accordion type="multiple" defaultValue={["personal","summary","experience"]} className="editor-accordion">
      <AccordionItem value="personal"><AccordionTrigger>{tr.personal}</AccordionTrigger><AccordionContent><div className="form-grid">
        <Field label="First name"><Input value={resume.data.personal.firstName} onChange={e=>setPersonal("firstName",e.target.value)}/></Field><Field label="Last name"><Input value={resume.data.personal.lastName} onChange={e=>setPersonal("lastName",e.target.value)}/></Field>
        <Field label="Professional title" wide><Input value={resume.data.personal.title} onChange={e=>setPersonal("title",e.target.value)}/></Field><Field label="Email"><Input type="email" value={resume.data.personal.email} onChange={e=>setPersonal("email",e.target.value)}/></Field><Field label="Phone"><Input value={resume.data.personal.phone} onChange={e=>setPersonal("phone",e.target.value)}/></Field><Field label="Location" wide><Input value={resume.data.personal.location} onChange={e=>setPersonal("location",e.target.value)}/></Field><Field label="LinkedIn"><Input value={resume.data.personal.linkedin||""} onChange={e=>setPersonal("linkedin",e.target.value)}/></Field><Field label="GitHub"><Input value={resume.data.personal.github||""} onChange={e=>setPersonal("github",e.target.value)}/></Field><Field label="Portfolio" wide><Input value={resume.data.personal.portfolio||""} onChange={e=>setPersonal("portfolio",e.target.value)}/></Field>
        <div className="photo-upload-card" style={{gridColumn:"1 / -1",display:"grid",gridTemplateColumns:"auto minmax(0, 1fr)",alignItems:"center",gap:"16px",padding:"16px",border:"1px dashed var(--border)",borderRadius:"14px"}}>
          <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void uploadProfilePhoto(file)}}/>
          {resume.data.personal.profileImage?<>
            <span className={`photo-upload-preview shape-${resume.theme.photoShape}`} style={{position:"relative",width:"82px",height:"82px",display:"block",overflow:"hidden",background:"#e8ebf0",borderRadius:photoShapeRadius}}><img src={resume.data.personal.profileImage} alt="Current profile" onLoad={rememberPhotoAspectRatio} style={{position:"absolute",display:"block",left:`calc(50% + ${photoSettings.offsetX}%)`,top:`calc(50% + ${photoSettings.offsetY}%)`,width:`${photoGeometry.imageWidth}%`,height:`${photoGeometry.imageHeight}%`,maxWidth:"none",objectFit:"fill",transformOrigin:"center",transform:`translate(-50%, -50%) rotate(${photoSettings.rotation}deg)`}}/></span>
            <div><strong>Profile photo</strong><p>Crop, zoom and position the photo before it appears in supported templates.</p><div className="photo-upload-actions"><Button type="button" variant="outline" size="sm" onClick={()=>setPhotoEditorOpen(true)}>Edit photo</Button><Button type="button" variant="outline" size="sm" onClick={()=>photoInputRef.current?.click()}>Replace</Button><Button type="button" variant="ghost" size="sm" onClick={()=>change(d=>{delete d.data.personal.profileImage;delete d.data.personal.profileImageSettings})}>Remove</Button></div></div>
          </>:<>
            <span className="photo-upload-icon" style={{width:"82px",height:"82px",display:"grid",placeItems:"center",overflow:"hidden",background:"#e8eef9",color:"#2563eb",borderRadius:"16px"}}><ImagePlus/></span>
            <div><strong>Add a profile photo</strong><p>JPG, PNG or WebP, up to 10 MB. The image is resized before local saving.</p><Button type="button" variant="outline" size="sm" onClick={()=>photoInputRef.current?.click()}><Upload/>Choose image</Button></div>
          </>}
        </div>
        {!templateSupportsPhoto[resume.template]&&<p className="photo-template-note">The selected template is photo-free. Your uploaded photo stays saved and appears again when you choose a photo template.</p>}
      </div></AccordionContent></AccordionItem>
      <AccordionItem value="summary"><AccordionTrigger>{tr.summary}</AccordionTrigger><AccordionContent><Textarea rows={6} maxLength={500} value={resume.data.summary} onChange={e=>change(d=>{d.data.summary=e.target.value})}/><div className="counter"><span>{resume.data.summary.length}/500</span><Button variant="outline" size="sm" onClick={()=>toast.info(tr.aiUnavailable)}><Sparkles/> Improve with AI</Button></div></AccordionContent></AccordionItem>
      <AccordionItem value="experience"><AccordionTrigger>{tr.experience}</AccordionTrigger><AccordionContent><div className="repeat-list">{resume.data.experience.map((x,i)=><div className="repeat-card" key={x.id}><div className="repeat-head"><strong>{x.jobTitle||`Experience ${i+1}`}</strong><Button variant="ghost" size="icon-sm" onClick={()=>change(d=>{d.data.experience.splice(i,1)})}><Trash2/></Button></div><div className="form-grid"><Field label="Job title"><Input value={x.jobTitle} onChange={e=>change(d=>{d.data.experience[i].jobTitle=e.target.value})}/></Field><Field label="Company"><Input value={x.company} onChange={e=>change(d=>{d.data.experience[i].company=e.target.value})}/></Field><Field label="Location"><Input value={x.location} onChange={e=>change(d=>{d.data.experience[i].location=e.target.value})}/></Field><Field label="Start date"><Input value={x.startDate} onChange={e=>change(d=>{d.data.experience[i].startDate=e.target.value})}/></Field><Field label="End date"><Input disabled={x.current} value={x.endDate} onChange={e=>change(d=>{d.data.experience[i].endDate=e.target.value})}/></Field><label className="switch-line"><Switch checked={x.current} onCheckedChange={v=>change(d=>{d.data.experience[i].current=v})}/><span>I currently work here</span></label><Field label="Description" wide><Textarea value={x.description} onChange={e=>change(d=>{d.data.experience[i].description=e.target.value})}/></Field><Field label="Achievements (one per line)" wide><Textarea value={x.achievements.join("\n")} onChange={e=>change(d=>{d.data.experience[i].achievements=e.target.value.split("\n")})}/></Field></div></div>)}<Button variant="outline" onClick={addExperience}><Plus/>{tr.add}</Button></div></AccordionContent></AccordionItem>
      <AccordionItem value="education"><AccordionTrigger>{tr.education}</AccordionTrigger><AccordionContent><div className="repeat-list">{resume.data.education.map((x,i)=><div className="repeat-card" key={x.id}><div className="repeat-head"><strong>{x.school||`Education ${i+1}`}</strong><Button variant="ghost" size="icon-sm" onClick={()=>change(d=>{d.data.education.splice(i,1)})}><Trash2/></Button></div><div className="form-grid"><Field label="School / University" wide><Input value={x.school} onChange={e=>change(d=>{d.data.education[i].school=e.target.value})}/></Field><Field label="Degree"><Input value={x.degree} onChange={e=>change(d=>{d.data.education[i].degree=e.target.value})}/></Field><Field label="Field of study"><Input value={x.field} onChange={e=>change(d=>{d.data.education[i].field=e.target.value})}/></Field><Field label="Start"><Input value={x.startDate} onChange={e=>change(d=>{d.data.education[i].startDate=e.target.value})}/></Field><Field label="End"><Input value={x.endDate} onChange={e=>change(d=>{d.data.education[i].endDate=e.target.value})}/></Field><Field label="Description" wide><Textarea value={x.description} onChange={e=>change(d=>{d.data.education[i].description=e.target.value})}/></Field></div></div>)}<Button variant="outline" onClick={addEducation}><Plus/>{tr.add}</Button></div></AccordionContent></AccordionItem>
      <AccordionItem value="skills"><AccordionTrigger>{tr.skills}</AccordionTrigger><AccordionContent>{resume.data.skills.map((g,gi)=><div className="repeat-card" key={g.id}><Field label="Group name"><Input value={g.name} onChange={e=>change(d=>{d.data.skills[gi].name=e.target.value})}/></Field><Field label="Skills (comma separated)" wide><Textarea value={g.skills.map(s=>s.name).join(", ")} onChange={e=>change(d=>{d.data.skills[gi].skills=e.target.value.split(",").map(name=>({id:uid(),name:name.trim()})).filter(s=>s.name)})}/></Field></div>)}<Button variant="outline" onClick={()=>change(d=>d.data.skills.push({id:uid(),name:"New group",skills:[]}))}><Plus/>{tr.add}</Button></AccordionContent></AccordionItem>
      <AccordionItem value="languages"><AccordionTrigger>{tr.languages}</AccordionTrigger><AccordionContent><div className="repeat-list">{resume.data.languages.map((x,i)=><div className="inline-entry" key={x.id}><Input value={x.language} onChange={e=>change(d=>{d.data.languages[i].language=e.target.value})}/><Input value={x.level} onChange={e=>change(d=>{d.data.languages[i].level=e.target.value})}/><Button variant="ghost" size="icon" onClick={()=>change(d=>{d.data.languages.splice(i,1)})}><Trash2/></Button></div>)}<Button variant="outline" onClick={()=>change(d=>d.data.languages.push({id:uid(),language:"",level:"B2"}))}><Plus/>{tr.add}</Button></div></AccordionContent></AccordionItem>
      <AccordionItem value="projects"><AccordionTrigger>{tr.projects}</AccordionTrigger><AccordionContent><div className="repeat-list">{resume.data.projects.map((x,i)=><div className="repeat-card" key={x.id}><div className="repeat-head"><strong>{x.name||`Project ${i+1}`}</strong><Button variant="ghost" size="icon-sm" onClick={()=>change(d=>{d.data.projects.splice(i,1)})}><Trash2/></Button></div><div className="form-grid"><Field label="Project name"><Input value={x.name} onChange={e=>change(d=>{d.data.projects[i].name=e.target.value})}/></Field><Field label="Role"><Input value={x.role} onChange={e=>change(d=>{d.data.projects[i].role=e.target.value})}/></Field><Field label="Date"><Input value={x.date} onChange={e=>change(d=>{d.data.projects[i].date=e.target.value})}/></Field><Field label="Technologies"><Input value={x.technologies.join(", ")} onChange={e=>change(d=>{d.data.projects[i].technologies=e.target.value.split(",").map(v=>v.trim()).filter(Boolean)})}/></Field><Field label="Description" wide><Textarea value={x.description} onChange={e=>change(d=>{d.data.projects[i].description=e.target.value})}/></Field></div></div>)}<Button variant="outline" onClick={addProject}><Plus/>{tr.add}</Button></div></AccordionContent></AccordionItem>
      <AccordionItem value="interests"><AccordionTrigger>{tr.interests}</AccordionTrigger><AccordionContent><Field label="Interests (comma separated)" wide><Textarea value={resume.data.interests.join(", ")} onChange={e=>change(d=>{d.data.interests=e.target.value.split(",").map(v=>v.trim()).filter(Boolean)})}/></Field></AccordionContent></AccordionItem>
      <AccordionItem value="sections"><AccordionTrigger>{tr.sections}</AccordionTrigger><AccordionContent><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={resume.data.sectionOrder} strategy={verticalListSortingStrategy}>{resume.data.sectionOrder.map(id=><SortableSection key={id} id={id} label={labels[id]||id} hidden={resume.data.hiddenSections.includes(id)} onToggle={()=>change(d=>{const index=d.data.hiddenSections.indexOf(id);if(index>=0)d.data.hiddenSections.splice(index,1);else d.data.hiddenSections.push(id)})}/>)}</SortableContext></DndContext></AccordionContent></AccordionItem>
    </Accordion>
    <div className="privacy-note">{tr.privacy}</div>
  </div>;

  return <div className={`builder-shell ${dark?"dark-ui":""}`}><Toaster richColors/>
    <Dialog open={photoEditorOpen} onOpenChange={setPhotoEditorOpen}>
      <DialogContent
        className="photo-editor-dialog"
        style={{width:"min(92vw, 560px)",maxWidth:"560px",maxHeight:"92vh",overflowY:"auto"}}
      >
        <DialogHeader>
          <DialogTitle>Edit profile photo</DialogTitle>
          <DialogDescription>Drag the image to position it. Use the controls to zoom, rotate and change the crop shape.</DialogDescription>
        </DialogHeader>
        {resume.data.personal.profileImage&&<div className="photo-editor-layout" style={{display:"grid",gridTemplateColumns:"minmax(0, 1fr)",gap:"16px",minWidth:0}}>
          <div
            className={`photo-editor-preview shape-${resume.theme.photoShape}`}
            onPointerDown={beginPhotoDrag}
            onPointerMove={movePhoto}
            onPointerUp={endPhotoDrag}
            onPointerCancel={endPhotoDrag}
            onLostPointerCapture={()=>{photoDrag.current=null;setPhotoDragging(false)}}
            onWheel={event=>{event.preventDefault();updatePhotoZoom(photoSettings.zoom+(event.deltaY<0?0.08:-0.08))}}
            style={{
              position:"relative",
              width:"min(320px, 72vw)",
              height:"min(320px, 72vw)",
              maxWidth:"100%",
              overflow:"hidden",
              margin:"0 auto",
              background:"#e8ebf0",
              borderRadius:photoShapeRadius,
              touchAction:"none",
              cursor:photoDragging?"grabbing":"grab",
              userSelect:"none",
              boxShadow:"inset 0 0 0 1px rgba(0,0,0,.08)",
            }}
          >
            <img
              src={resume.data.personal.profileImage}
              alt="Profile crop preview"
              draggable={false}
              onLoad={rememberPhotoAspectRatio}
              style={{
                position:"absolute",
                display:"block",
                left:`calc(50% + ${photoSettings.offsetX}%)`,
                top:`calc(50% + ${photoSettings.offsetY}%)`,
                width:`${photoGeometry.imageWidth}%`,
                height:`${photoGeometry.imageHeight}%`,
                maxWidth:"none",
                objectFit:"fill",
                transformOrigin:"center",
                transform:`translate(-50%, -50%) rotate(${photoSettings.rotation}deg)`,
                pointerEvents:"none",
              }}
            />
            <span aria-hidden style={{position:"absolute",inset:0,border:"2px solid rgba(255,255,255,.9)",borderRadius:photoShapeRadius,pointerEvents:"none",boxShadow:"inset 0 0 0 1px rgba(0,0,0,.15)"}}/>
          </div>
          <p style={{margin:"-4px 0 0",textAlign:"center",fontSize:"12px",color:"var(--muted-foreground)"}}>Drag the photo directly, or fine-tune it with the sliders.</p>
          <div className="photo-editor-controls" style={{display:"grid",gap:"14px",minWidth:0}}>
            <Field label={`Zoom · ${photoSettings.zoom.toFixed(2)}×`} wide><Input style={{width:"100%"}} type="range" min="1" max="3" step="0.05" value={photoSettings.zoom} onChange={e=>updatePhotoZoom(Number(e.target.value))}/></Field>
            <Field label={`Horizontal position · ${Math.round(photoSettings.offsetX)}`} wide><Input style={{width:"100%"}} type="range" min={-photoGeometry.maxOffsetX} max={photoGeometry.maxOffsetX} step="1" disabled={photoGeometry.maxOffsetX<1} value={photoSettings.offsetX} onChange={e=>updatePhotoSetting("offsetX",Number(e.target.value))}/></Field>
            <Field label={`Vertical position · ${Math.round(photoSettings.offsetY)}`} wide><Input style={{width:"100%"}} type="range" min={-photoGeometry.maxOffsetY} max={photoGeometry.maxOffsetY} step="1" disabled={photoGeometry.maxOffsetY<1} value={photoSettings.offsetY} onChange={e=>updatePhotoSetting("offsetY",Number(e.target.value))}/></Field>
            <Field label="Photo shape" wide><select className="native-control" value={resume.theme.photoShape} onChange={e=>change(d=>{d.theme.photoShape=e.target.value as typeof d.theme.photoShape})}><option value="circle">Circle</option><option value="rounded">Rounded</option><option value="square">Square</option></select></Field>
            <div className="photo-rotate-actions" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}><Button type="button" variant="outline" onClick={()=>rotatePhoto(-1)}><RotateCcw/>Rotate left</Button><Button type="button" variant="outline" onClick={()=>rotatePhoto(1)}><RotateCw/>Rotate right</Button></div>
            <div style={{display:"flex",justifyContent:"space-between",gap:"8px",flexWrap:"wrap"}}><Button type="button" variant="ghost" onClick={()=>change(d=>{d.data.personal.profileImageSettings={...defaultPhotoSettings}})}>Reset crop</Button><Button type="button" onClick={()=>setPhotoEditorOpen(false)}>Done</Button></div>
          </div>
        </div>}
      </DialogContent>
    </Dialog>
    <header className="builder-topbar"><div className="topbar-left"><Button asChild variant="ghost" size="icon"><Link href="/dashboard" aria-label={tr.back}><ArrowLeft/></Link></Button><div><Input className="cv-name" value={resume.name} onChange={e=>change(d=>{d.name=e.target.value})}/><span className="save-state">{saveState==="saved"?<><Check/>{tr.saved}</>:tr.saving}</span></div></div><div className="topbar-actions"><Button variant="ghost" size="icon" onClick={undo} disabled={!past.current.length}><Undo2/></Button><Button variant="ghost" size="icon" onClick={redo} disabled={!future.current.length}><Redo2/></Button>
      <Select value={locale} onValueChange={v=>{setLocale(v as Locale);localStorage.setItem("cvforge_locale",v)}}><SelectTrigger className="lang-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="en">EN</SelectItem><SelectItem value="ro">RO</SelectItem><SelectItem value="hu">HU</SelectItem></SelectContent></Select>
      <Button variant="ghost" size="icon" onClick={()=>setDark(v=>!v)}>{dark?<Sun/>:<Moon/>}</Button>
      <Dialog><DialogTrigger asChild><Button variant="outline"><Palette/>{tr.templates}</Button></DialogTrigger><DialogContent className="template-dialog"><DialogHeader><DialogTitle>{tr.templates}</DialogTitle><DialogDescription>Switch layouts without losing your information.</DialogDescription></DialogHeader><div className="template-grid">{templateIds.map(id=><button key={id} className={`template-choice ${resume.template===id?"active":""}`} onClick={()=>{change(d=>{d.template=id});toast.success(tr.templateChanged)}}><TemplateView resume={{...resume,template:id}} previewPlaceholder/><strong>{templateNames[id]}{templateSupportsPhoto[id]&&<small className="photo-template-badge">Photo</small>}</strong><span>{templateDescriptions[id]}</span></button>)}</div></DialogContent></Dialog>
      <Dialog><DialogTrigger asChild><Button variant="outline"><Palette/>{tr.design}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr.design}</DialogTitle><DialogDescription>Changes appear instantly in the preview.</DialogDescription></DialogHeader><div className="design-grid"><Field label="Accent color"><Input type="color" value={resume.theme.accent} onChange={e=>change(d=>{d.theme.accent=e.target.value})}/></Field><Field label="Font"><select className="native-control" value={resume.theme.font} onChange={e=>change(d=>{d.theme.font=e.target.value})}>{["Inter","Roboto","Lato","Open Sans","Montserrat","Merriweather","Source Sans 3"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Font size"><select className="native-control" value={resume.theme.fontSize} onChange={e=>change(d=>{d.theme.fontSize=e.target.value as typeof d.theme.fontSize})}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></Field><Field label="Spacing"><select className="native-control" value={resume.theme.spacing} onChange={e=>change(d=>{d.theme.spacing=e.target.value as typeof d.theme.spacing})}><option value="compact">Compact</option><option value="normal">Normal</option><option value="comfortable">Comfortable</option></select></Field><label className="switch-line"><Switch checked={resume.theme.showIcons} onCheckedChange={v=>change(d=>{d.theme.showIcons=v})}/><span>Show icons</span></label><label className="switch-line"><Switch checked={resume.theme.fitOnePage} onCheckedChange={v=>change(d=>{d.theme.fitOnePage=v})}/><span>Fit to one page</span></label></div></DialogContent></Dialog>
      <Dialog><DialogTrigger asChild><Button variant="outline">{tr.ats} <b>{score}</b></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr.score}: {score}/100</DialogTitle><DialogDescription>{tr.guidance}</DialogDescription></DialogHeader><div className="score-ring" style={{"--score":`${score*3.6}deg`} as React.CSSProperties}><span>{score}</span></div><ul className="suggestions">{!resume.data.personal.linkedin&&<li>Add a LinkedIn profile.</li>}{!resume.data.experience.some(x=>x.achievements.some(a=>/\d/.test(a)))&&<li>Add measurable achievements with numbers.</li>}{resume.data.summary.length<60&&<li>Write a more complete professional summary.</li>}{resume.data.skills.flatMap(g=>g.skills).length<6&&<li>Add more relevant technical skills.</li>}</ul></DialogContent></Dialog>
      <Button className="download-button" onClick={downloadPdf}><Download/>{tr.download}</Button><Button variant="ghost" size="icon" onClick={()=>window.print()} aria-label={tr.print}><Printer/></Button><Button variant="ghost" size="icon" onClick={exportJson} aria-label={tr.export}><FileJson/></Button><input ref={importRef} type="file" accept="application/json" hidden onChange={e=>e.target.files?.[0]&&importJson(e.target.files[0])}/><Button variant="ghost" size="icon" onClick={()=>importRef.current?.click()} aria-label={tr.import}><Upload/></Button>
    </div></header>
    <Tabs value={mobileTab} onValueChange={setMobileTab} className="mobile-workspace"><TabsList><TabsTrigger value="edit">{tr.edit}</TabsTrigger><TabsTrigger value="preview">{tr.preview}</TabsTrigger></TabsList><TabsContent value="edit">{Editor}</TabsContent><TabsContent value="preview"><div className="preview-stage"><TemplateView resume={resume} previewId="resume-preview"/></div></TabsContent></Tabs>
    <div className="desktop-workspace">{Editor}<div className="preview-stage"><div className="preview-toolbar"><span><Eye/> Live preview</span><Select value={resume.cvLanguage} onValueChange={v=>change(d=>{d.cvLanguage=v as Locale})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="en">English CV</SelectItem><SelectItem value="ro">CV în română</SelectItem><SelectItem value="hu">Magyar CV</SelectItem></SelectContent></Select></div><TemplateView resume={resume} previewId="resume-preview"/></div></div>
    <div className="mobile-actions"><Button variant="outline" onClick={()=>setMobileTab("preview")}><Eye/>{tr.preview}</Button><Button onClick={downloadPdf}><Download/>{tr.download}</Button></div>
  </div>;
}
