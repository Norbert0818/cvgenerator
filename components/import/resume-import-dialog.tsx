"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  GraduationCap,
  ImageIcon,
  Languages,
  LoaderCircle,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  importResumeFile,
  type ResumeImportResult,
} from "@/lib/resume-import";
import type { Locale, ResumeDocument } from "@/types/resume";

type ImportState = "idle" | "reading" | "review" | "error";

interface ResumeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (resume: ResumeDocument) => void;
}

const localeNames: Record<Locale, string> = {
  en: "English",
  ro: "Română",
  hu: "Magyar",
};

export function ResumeImportDialog({
  open,
  onOpenChange,
  onImported,
}: ResumeImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ResumeImportResult | null>(null);
  const [error, setError] = useState("");
  const [keepPhoto, setKeepPhoto] = useState(true);
  const [selectedLocale, setSelectedLocale] = useState<Locale>("en");

  function reset() {
    setState("idle");
    setDragActive(false);
    setFileName("");
    setResult(null);
    setError("");
    setKeepPhoto(true);
    setSelectedLocale("en");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next && state === "reading") return;
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 180);
  }

  async function readFile(file: File) {
    setState("reading");
    setFileName(file.name);
    setError("");
    setResult(null);
    try {
      const imported = await importResumeFile(file);
      setResult(imported);
      setSelectedLocale(imported.detectedLocale);
      setKeepPhoto(imported.photoFound);
      setState("review");
    } catch (cause) {
      console.error("CV import failed", cause);
      setError(importErrorMessage(cause));
      setState("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function confirmImport() {
    if (!result) return;
    const resume = structuredClone(result.resume);
    resume.cvLanguage = selectedLocale;
    if (!keepPhoto) {
      delete resume.data.personal.profileImage;
      delete resume.data.personal.profileImageSettings;
    }
    onImported(resume);
    handleOpenChange(false);
  }

  const personName = result
    ? `${result.resume.data.personal.firstName} ${result.resume.data.personal.lastName}`.trim()
    : "";
  const skillCount = result
    ? result.resume.data.skills.reduce((total, group) => total + group.skills.length, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="resume-import-dialog">
        <DialogHeader>
          <DialogTitle>Import an existing CV</DialogTitle>
          <DialogDescription>
            Upload a PDF, DOCX, TXT or a CVForge JSON backup. Romanian, English and
            Hungarian CVs are recognized automatically.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />

        {(state === "idle" || state === "error") && (
          <>
            <button
              type="button"
              className={`resume-import-dropzone ${dragActive ? "active" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void readFile(file);
              }}
            >
              <span className="import-upload-icon"><UploadCloud /></span>
              <strong>Choose a CV or drag it here</strong>
              <span>PDF, DOCX, TXT or JSON · maximum 20 MB</span>
            </button>
            <div className="import-format-notes">
              <span><FileText /> Text and sections are converted into editable fields</span>
              <span><ImageIcon /> Embedded profile photos are imported when available</span>
            </div>
            {state === "error" && (
              <div className="import-error" role="alert">
                <AlertTriangle />
                <div><strong>We could not import this file.</strong><p>{error}</p></div>
              </div>
            )}
          </>
        )}

        {state === "reading" && (
          <div className="import-reading" aria-live="polite">
            <span className="import-loader"><LoaderCircle /></span>
            <div>
              <strong>Reading {fileName}</strong>
              <p>Finding contact details, sections, dates, skills and a profile photo…</p>
            </div>
            <Progress value={62} />
            <small>The file stays in your browser while it is processed.</small>
          </div>
        )}

        {state === "review" && result && (
          <div className="import-review">
            <div className="import-success-line">
              <CheckCircle2 />
              <div><strong>CV ready to import</strong><span>{fileName}</span></div>
            </div>

            <div className="import-person-card">
              {result.resume.data.personal.profileImage ? (
                <img src={result.resume.data.personal.profileImage} alt="Detected profile" />
              ) : (
                <span className="import-person-placeholder"><ImageIcon /></span>
              )}
              <div>
                <strong>{personName || "Name needs review"}</strong>
                <span>{result.resume.data.personal.title || result.resume.data.personal.email || "Imported CV"}</span>
              </div>
            </div>

            <div className="import-stats">
              <span><BriefcaseBusiness /><b>{result.resume.data.experience.length}</b> experience entries</span>
              <span><GraduationCap /><b>{result.resume.data.education.length}</b> education entries</span>
              <span><WandSparkles /><b>{skillCount}</b> skills</span>
              <span><Languages /><b>{result.resume.data.languages.length}</b> languages</span>
            </div>

            <label className="import-language-row">
              <span><strong>CV language</strong><small>Detected: {localeNames[result.detectedLocale]}</small></span>
              <Select value={selectedLocale} onValueChange={(value) => setSelectedLocale(value as Locale)}>
                <SelectTrigger aria-label="CV language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ro">Română</SelectItem>
                  <SelectItem value="hu">Magyar</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <div className="import-section-list">
              <strong>Recognized sections</strong>
              <div>
                {result.detectedSections.length
                  ? result.detectedSections.map((section) => <span key={section}>{section}</span>)
                  : <span>Personal details only</span>}
              </div>
            </div>

            <label className={`import-photo-choice ${result.photoFound ? "" : "disabled"}`}>
              <Checkbox
                checked={keepPhoto}
                disabled={!result.photoFound}
                onCheckedChange={(checked) => setKeepPhoto(checked === true)}
              />
              <span>
                <strong>{result.photoFound ? "Use the detected profile photo" : "No separate profile photo was found"}</strong>
                <small>{result.photoFound
                  ? "You can crop, zoom or replace it in the editor."
                  : "Some PDFs flatten the photo into the page. You can upload it separately in the editor."}</small>
              </span>
            </label>

            {result.warnings.length > 0 && (
              <div className="import-warning"><AlertTriangle /><span>{result.warnings[0]}</span></div>
            )}
            <p className="import-review-note">
              Automatic import can make mistakes in complex layouts. Review the fields before downloading the final CV.
            </p>
          </div>
        )}

        <DialogFooter>
          {state === "review" ? (
            <>
              <Button variant="outline" onClick={reset}>Choose another file</Button>
              <Button onClick={confirmImport}>Import and edit</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={state === "reading"}>Cancel</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function importErrorMessage(cause: unknown) {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "file-too-large") return "Choose a file smaller than 20 MB.";
  if (code === "legacy-doc") return "The old .doc format is not supported. Save it as DOCX or PDF first.";
  if (code === "unsupported-file") return "Choose a PDF, DOCX, TXT or CVForge JSON file.";
  if (code === "no-readable-text") {
    return "No readable text was found. This may be a scanned PDF; save it as a searchable PDF or DOCX and try again.";
  }
  if (code === "invalid-json") return "This JSON file is not a valid CVForge backup.";
  return "The file may be damaged, password-protected or use an unsupported layout.";
}
