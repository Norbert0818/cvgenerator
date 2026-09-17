"use client";
import Link from "next/link";
import { FileText, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
export function SiteHeader(){const[dark,setDark]=useState(false);useEffect(()=>{document.documentElement.classList.toggle("dark",dark)},[dark]);return <header className="site-header"><Link href="/" className="brand"><span><FileText/></span>CVForge</Link><nav><Link href="/templates">Templates</Link><Link href="/dashboard">My CVs</Link><Button asChild><Link href="/dashboard">Create CV</Link></Button><Button variant="ghost" size="icon" onClick={()=>setDark(v=>!v)} aria-label="Toggle theme">{dark?<Sun/>:<Moon/>}</Button></nav></header>}
