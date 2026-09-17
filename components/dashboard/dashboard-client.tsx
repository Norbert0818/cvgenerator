"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SiteHeader } from "@/components/site-header";
import { createExampleResume, deleteResume, loadResumes, saveResumes } from "@/lib/resume-data";
import type { ResumeDocument } from "@/types/resume";
import { uid } from "@/types/resume";

export function DashboardClient(){
  const router=useRouter(); const[items,setItems]=useState<ResumeDocument[]>([]);
  useEffect(()=>setItems(loadResumes()),[]);
  useEffect(()=>{const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();void Promise.resolve(context.registerTool({name:"create_resume",title:"Create CV",description:"Create a new CV from realistic example content and open it for editing.",inputSchema:{type:"object",properties:{template:{type:"string",enum:["modern","professional","minimal","developer","executive","creative","compact","ats"]}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){const template=(input as {template?:ResumeDocument["template"]})?.template||"modern";const r=createExampleResume(template);saveResumes([r,...loadResumes()]);setItems(loadResumes());router.push(`/builder/${r.id}`);return{id:r.id,status:"created",template}}},{signal:lifecycle.signal})).catch(()=>{});return()=>lifecycle.abort()},[router]);
  function create(){const r=createExampleResume();saveResumes([r,...loadResumes()]);router.push(`/builder/${r.id}`)}
  function duplicate(r:ResumeDocument){const c=structuredClone(r);c.id=uid();c.name=`${r.name} copy`;c.createdAt=c.updatedAt=new Date().toISOString();const next=[c,...items];setItems(next);saveResumes(next)}
  function remove(id:string){deleteResume(id);setItems(x=>x.filter(r=>r.id!==id))}
  return <><SiteHeader/><main className="dashboard-page">
    <div className="page-heading"><div><span className="eyebrow">Your workspace</span><h1>My CVs</h1><p>Continue editing or start with a professional example.</p></div><div className="page-actions"><Button variant="outline" size="lg" asChild><a href="/cvforge-source.zip" download><Download/>Download source</a></Button><Button size="lg" onClick={create}><FilePlus2/>Create new CV</Button></div></div>
    {items.length===0?<div className="empty-cvs"><div><FilePlus2/></div><h2>You haven't created a CV yet.</h2><p>Your first CV starts with realistic example content you can replace.</p><Button onClick={create}>Create your first CV</Button></div>:<div className="resume-card-grid">{items.map(r=><article className="resume-card" key={r.id}><div className={`mini-resume mini-${r.template}`}><div className="mini-side"/><div className="mini-lines"><b>{r.data.personal.firstName} {r.data.personal.lastName}</b><span/><span/><span/><span/></div></div><div className="resume-card-info"><div><h2>{r.name}</h2><p>{r.template} · Edited {new Date(r.updatedAt).toLocaleDateString()}</p></div><div className="card-actions"><Button size="sm" onClick={()=>router.push(`/builder/${r.id}`)}><Pencil/>Edit</Button><Button variant="outline" size="icon-sm" onClick={()=>duplicate(r)} aria-label="Duplicate"><Copy/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Delete"><Trash2/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this CV?</AlertDialogTitle><AlertDialogDescription>This removes the locally saved CV from this device.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>remove(r.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div></article>)}</div>}
  </main></>
}
