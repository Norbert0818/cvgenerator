"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, FilePlus2, FileUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SiteHeader } from "@/components/site-header";
import { ResumeImportDialog } from "@/components/import/resume-import-dialog";
import { createBlankResume, deleteResume, loadResumes, saveResumes } from "@/lib/resume-data";
import type { ResumeDocument } from "@/types/resume";
import { uid } from "@/types/resume";

export function DashboardClient(){
  const router=useRouter(); const[items,setItems]=useState<ResumeDocument[]>([]); const[importOpen,setImportOpen]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>{setItems(loadResumes());if(window.location.hash==="#import")setImportOpen(true)},0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();void Promise.resolve(context.registerTool({name:"create_resume",title:"Create CV",description:"Create a blank CV and open it for editing.",inputSchema:{type:"object",properties:{template:{type:"string",enum:["modern","professional","minimal","developer","executive","creative","compact","ats"]}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){const template=(input as {template?:ResumeDocument["template"]})?.template||"modern";const r=createBlankResume(template);saveResumes([r,...loadResumes()]);setItems(loadResumes());router.push(`/builder/${r.id}`);return{id:r.id,status:"created",template}}},{signal:lifecycle.signal})).catch(()=>{});return()=>lifecycle.abort()},[router]);
  function create(){const r=createBlankResume();saveResumes([r,...loadResumes()]);router.push(`/builder/${r.id}`)}
  function importAndEdit(r:ResumeDocument){const next=[r,...loadResumes().filter(item=>item.id!==r.id)];saveResumes(next);setItems(next);router.push(`/builder/${r.id}`)}
  function duplicate(r:ResumeDocument){const c=structuredClone(r);c.id=uid();c.name=`${r.name} copy`;c.createdAt=c.updatedAt=new Date().toISOString();const next=[c,...items];setItems(next);saveResumes(next)}
  function remove(id:string){deleteResume(id);setItems(x=>x.filter(r=>r.id!==id))}
  return <><SiteHeader/><main className="dashboard-page">
    <div className="page-heading"><div><span className="eyebrow">Your workspace</span><h1>My CVs</h1><p>Continue editing, import an existing CV or start from a blank template.</p></div><div className="page-actions"><Button variant="outline" size="lg" asChild><a href="/cvforge-source-v10.zip" download><Download/>Download latest source</a></Button><Button variant="outline" size="lg" onClick={()=>setImportOpen(true)}><FileUp/>Import existing CV</Button><Button size="lg" onClick={create}><FilePlus2/>Create new CV</Button></div></div>
    {items.length===0?<div className="empty-cvs"><div><FilePlus2/></div><h2>You haven&apos;t created a CV yet.</h2><p>Start with a blank template, or import a PDF or Word CV and continue editing it.</p><div className="empty-cv-actions"><Button variant="outline" onClick={()=>setImportOpen(true)}><FileUp/>Import existing CV</Button><Button onClick={create}>Create your first CV</Button></div></div>:<div className="resume-card-grid">{items.map(r=><article className="resume-card" key={r.id}><div className={`mini-resume mini-${r.template}`}><div className="mini-side"/><div className="mini-lines"><b>{r.data.personal.firstName} {r.data.personal.lastName}</b><span/><span/><span/><span/></div></div><div className="resume-card-info"><div><h2>{r.name}</h2><p>{r.template} · Edited {new Date(r.updatedAt).toLocaleDateString()}</p></div><div className="card-actions"><Button size="sm" onClick={()=>router.push(`/builder/${r.id}`)}><Pencil/>Edit</Button><Button variant="outline" size="icon-sm" onClick={()=>duplicate(r)} aria-label="Duplicate"><Copy/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Delete"><Trash2/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this CV?</AlertDialogTitle><AlertDialogDescription>This removes the locally saved CV from this device.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>remove(r.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div></article>)}</div>}
  </main><ResumeImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={importAndEdit}/></>
}
