import { createBlankResume } from "@/lib/resume-data";
import { templateCatalog } from "@/lib/template-catalog";
import type {
  Locale,
  ResumeDocument,
  ResumeData,
  TemplateId,
} from "@/types/resume";
import { uid } from "@/types/resume";

export type ImportFileKind = "pdf" | "docx" | "text" | "json";
export type ImportConfidence = "high" | "medium" | "low";

export interface ResumeImportResult {
  resume: ResumeDocument;
  detectedLocale: Locale;
  languageConfidence: ImportConfidence;
  fileKind: ImportFileKind;
  photoFound: boolean;
  detectedSections: string[];
  extractedCharacters: number;
  warnings: string[];
}

type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "projects"
  | "certifications"
  | "courses"
  | "awards"
  | "interests"
  | "references";

interface ExtractedFile {
  kind: ImportFileKind;
  text: string;
  profileImage?: string;
  warnings: string[];
}

const SUPPORTED_TEMPLATES = new Set(Object.keys(templateCatalog) as TemplateId[]);

const SECTION_ALIASES: Record<SectionKey, string[]> = {
  summary: [
    "summary",
    "professional summary",
    "profile",
    "professional profile",
    "about me",
    "career objective",
    "objective",
    "rezumat",
    "rezumat profesional",
    "profil",
    "profil profesional",
    "despre mine",
    "obiectiv profesional",
    "bemutatkozas",
    "szakmai osszefoglalo",
    "szakmai profil",
    "rolam",
    "karriercel",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "career history",
    "experienta",
    "experienta profesionala",
    "istoric profesional",
    "experienta de lucru",
    "szakmai tapasztalat",
    "munkatapasztalat",
    "tapasztalat",
    "munkahelyek",
    "szakmai mult",
  ],
  education: [
    "education",
    "academic background",
    "studies",
    "educatie",
    "studii",
    "formare academica",
    "tanulmanyok",
    "vegzettseg",
    "iskolai vegzettseg",
    "oktatas",
  ],
  skills: [
    "skills",
    "key skills",
    "technical skills",
    "core competencies",
    "competencies",
    "competente",
    "competente profesionale",
    "competente tehnice",
    "abilitati",
    "aptitudini",
    "keszsegek",
    "szakmai keszsegek",
    "kompetenciak",
    "szakmai ismeretek",
  ],
  languages: [
    "languages",
    "language skills",
    "limbi",
    "limbi straine",
    "competente lingvistice",
    "nyelvek",
    "nyelvismeret",
    "idegen nyelvek",
  ],
  projects: [
    "projects",
    "selected projects",
    "personal projects",
    "proiecte",
    "proiecte personale",
    "projektek",
    "kiemelt projektek",
  ],
  certifications: [
    "certifications",
    "certificates",
    "licenses and certifications",
    "certificari",
    "certificate",
    "tanusitvanyok",
    "bizonyitvanyok",
    "kepesitesek",
  ],
  courses: [
    "courses",
    "training",
    "professional development",
    "cursuri",
    "formare profesionala",
    "kurzusok",
    "kepzesek",
  ],
  awards: [
    "awards",
    "honors",
    "achievements",
    "premii",
    "distinctii",
    "dijak",
    "elismeresek",
    "eredmenyek",
  ],
  interests: [
    "interests",
    "hobbies",
    "personal interests",
    "interese",
    "hobby-uri",
    "pasiuni",
    "erdeklodesi kor",
    "erdeklodes",
    "hobbik",
  ],
  references: [
    "references",
    "recommendations",
    "referinte",
    "recomandari",
    "referenciak",
    "ajanlasok",
  ],
};

const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  projects: "Projects",
  certifications: "Certifications",
  courses: "Courses",
  awards: "Awards",
  interests: "Interests",
  references: "References",
};

const LOCALE_MARKERS: Record<Locale, string[]> = {
  en: [
    "work experience",
    "professional summary",
    "education",
    "skills",
    "languages",
    "present",
    "university",
    "responsibilities",
  ],
  ro: [
    "experienta profesionala",
    "rezumat profesional",
    "educatie",
    "competente",
    "limbi straine",
    "in prezent",
    "universitatea",
    "responsabilitati",
    "abilitati",
  ],
  hu: [
    "szakmai tapasztalat",
    "szakmai osszefoglalo",
    "tanulmanyok",
    "keszsegek",
    "nyelvismeret",
    "jelenleg",
    "egyetem",
    "feladatok",
    "vegzettseg",
  ],
};

const LEVEL_WORDS = [
  "native",
  "mother tongue",
  "fluent",
  "advanced",
  "intermediate",
  "beginner",
  "basic",
  "nativ",
  "limba materna",
  "avansat",
  "intermediar",
  "incepator",
  "alapfok",
  "kozepfok",
  "felsofok",
  "anyanyelv",
  "tarsalgasi",
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
];

const DATE_RANGE_PATTERN =
  /(?:\b(?:19|20)\d{2}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|ian(?:uarie)?|feb(?:ruarie)?|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|januar|februar|marcius|aprilis|majus|junius|julius|augusztus|szeptember|oktober|november|december)\s+(?:19|20)\d{2}\b).*?(?:-|–|—|\bto\b|\bpana\b|\big\b).*?(?:\b(?:19|20)\d{2}\b|\bpresent\b|\bcurrent\b|\bnow\b|\bprezent\b|\bjelenleg\b|\bnapjainkig\b)/i;

export async function importResumeFile(file: File): Promise<ResumeImportResult> {
  if (file.size > 20_000_000) {
    throw new Error("file-too-large");
  }

  const extracted = await extractFile(file);
  if (extracted.kind === "json") {
    return importJsonResume(extracted.text, file.name);
  }

  const text = cleanExtractedText(extracted.text);
  if (text.replace(/\s/g, "").length < 40) {
    throw new Error("no-readable-text");
  }

  const language = detectLocale(text);
  const resume = parseResumeText(text, language.locale, file.name);
  if (extracted.profileImage) {
    resume.data.personal.profileImage = extracted.profileImage;
    resume.data.personal.profileImageSettings = {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    };
  }

  const detectedSections = getDetectedSectionLabels(resume.data);
  const warnings = [...extracted.warnings];
  if (!resume.data.personal.firstName && !resume.data.personal.lastName) {
    warnings.push("The name could not be identified automatically.");
  }
  if (detectedSections.length < 2) {
    warnings.push(
      "Only a small part of the CV structure was recognized. Please review the imported fields.",
    );
  }

  return {
    resume,
    detectedLocale: language.locale,
    languageConfidence: language.confidence,
    fileKind: extracted.kind,
    photoFound: Boolean(extracted.profileImage),
    detectedSections,
    extractedCharacters: text.length,
    warnings,
  };
}

export function parseResumeText(
  rawText: string,
  locale: Locale,
  sourceName = "Imported CV",
): ResumeDocument {
  const resume = createBlankResume("modern");
  const text = cleanExtractedText(rawText);
  const lines = normalizeLines(text);
  const segmented = segmentSections(lines);
  const personal = parsePersonal(segmented.header, lines, locale);

  resume.cvLanguage = locale;
  resume.name = makeResumeName(personal.firstName, personal.lastName, sourceName);
  resume.data.personal = { ...resume.data.personal, ...personal };
  resume.data.summary = joinParagraphs(segmented.sections.summary ?? []);
  resume.data.experience = parseExperience(segmented.sections.experience ?? []);
  resume.data.education = parseEducation(segmented.sections.education ?? []);
  resume.data.skills = parseSkills(segmented.sections.skills ?? []);
  resume.data.languages = parseLanguages(segmented.sections.languages ?? []);
  resume.data.projects = parseProjects(segmented.sections.projects ?? []);
  resume.data.certifications = parseCertifications(
    segmented.sections.certifications ?? [],
  );
  resume.data.courses = parseCourses(segmented.sections.courses ?? []);
  resume.data.awards = parseAwards(segmented.sections.awards ?? []);
  resume.data.interests = splitList(segmented.sections.interests ?? []);
  resume.data.references = parseReferences(segmented.sections.references ?? []);

  if (!Object.keys(segmented.sections).length) {
    const remaining = segmented.header.filter(
      (line) => line && !isPersonalContactLine(line, personal),
    );
    if (remaining.length > 2) {
      resume.data.summary = remaining.slice(2).join(" ").slice(0, 1200);
    }
  }

  return resume;
}

function detectLocale(text: string): {
  locale: Locale;
  confidence: ImportConfidence;
} {
  const normalized = normalizeForMatch(text);
  const scores = (Object.keys(LOCALE_MARKERS) as Locale[]).map((locale) => ({
    locale,
    score: LOCALE_MARKERS[locale].reduce(
      (total, marker) => total + countOccurrences(normalized, marker),
      0,
    ),
  }));
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const next = scores[1];
  const confidence: ImportConfidence =
    best.score >= 5 && best.score - next.score >= 2
      ? "high"
      : best.score >= 2
        ? "medium"
        : "low";
  return { locale: best.score ? best.locale : "en", confidence };
}

function segmentSections(lines: string[]) {
  const header: string[] = [];
  const sections: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;

  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) {
      current = heading.key;
      sections[current] ??= [];
      if (heading.remainder) sections[current]!.push(heading.remainder);
      continue;
    }
    if (current) sections[current]!.push(line);
    else header.push(line);
  }

  return { header: trimBlankLines(header), sections };
}

function detectHeading(line: string): { key: SectionKey; remainder: string } | null {
  if (!line) return null;
  const withoutPrefix = line.replace(/^\s*(?:\d+[.)]|[•▪●◆►])\s*/, "").trim();
  const colonIndex = withoutPrefix.indexOf(":");
  const possibleHeading = colonIndex >= 0 ? withoutPrefix.slice(0, colonIndex) : withoutPrefix;
  const normalized = normalizeForMatch(possibleHeading).replace(/[^a-z0-9 ]/g, "").trim();
  if (!normalized || normalized.length > 48) return null;

  for (const [key, aliases] of Object.entries(SECTION_ALIASES) as [
    SectionKey,
    string[],
  ][]) {
    if (aliases.includes(normalized)) {
      return {
        key,
        remainder: colonIndex >= 0 ? withoutPrefix.slice(colonIndex + 1).trim() : "",
      };
    }
  }
  return null;
}

function parsePersonal(header: string[], allLines: string[], locale: Locale) {
  const searchable = allLines.slice(0, 24).filter(Boolean);
  const headerLines = header.filter(Boolean);
  const joined = searchable.join(" \n");
  const email = joined.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
  const phone = findPhone(searchable);
  const linkedin = findUrl(searchable, /linkedin\.com/i);
  const github = findUrl(searchable, /github\.com/i);
  const urls = findUrls(searchable);
  const portfolio =
    urls.find((url) => !/linkedin\.com|github\.com/i.test(url)) ?? "";
  const location = findLabeledValue(searchable, [
    "location",
    "address",
    "city",
    "locatie",
    "adresa",
    "localitate",
    "domiciliu",
    "cim",
    "lakcim",
    "lakhely",
    "hely",
    "telepules",
  ]);
  const dateOfBirth = findLabeledValue(searchable, [
    "date of birth",
    "birth date",
    "data nasterii",
    "data de nastere",
    "szuletesi ido",
    "szuletesi datum",
  ]);
  const nationality = findLabeledValue(searchable, [
    "nationality",
    "cetatenie",
    "nationalitate",
    "allampolgarsag",
    "nemzetiseg",
  ]);
  const drivingLicence = findLabeledValue(searchable, [
    "driving licence",
    "driving license",
    "permis de conducere",
    "permis auto",
    "jogositvany",
  ]);

  const candidates = headerLines.filter((line) => {
    if (isContactLike(line)) return false;
    if (detectHeading(line)) return false;
    if (/^(?:profile\s*(?:photo|picture|image)|photo|photograph|fotografie(?:\s+profil)?|poza(?:\s+de\s+profil)?|profilkep|fenykep)$/i.test(normalizeForMatch(line))) return false;
    if (/\d/.test(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    return words.length >= 1 && words.length <= 7 && line.length <= 72;
  });

  const labelledName = findLabeledValue(searchable, ["name", "nume", "nev"]);
  const fullName = labelledName || candidates[0] || "";
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts.shift() ?? "";
  const lastName = nameParts.join(" ");
  const title =
    findLabeledValue(searchable, [
      "professional title",
      "job title",
      "occupation",
      "profesie",
      "ocupatie",
      "pozitie",
      "munkakor",
      "foglalkozas",
      "beosztas",
    ]) || candidates.find((line) => line !== fullName) || "";

  return {
    firstName,
    lastName,
    title,
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
    dateOfBirth,
    nationality,
    drivingLicence,
    ...(locale === "hu" && !lastName && firstName.includes(" ")
      ? { firstName: firstName.split(" ").slice(1).join(" "), lastName: firstName.split(" ")[0] }
      : {}),
  };
}

function parseExperience(lines: string[]): ResumeData["experience"] {
  return timelineBlocks(lines).map((block) => {
    const parsed = parseTimelineBlock(block);
    const first = parsed.headers[0] ?? "";
    const second = parsed.headers[1] ?? "";
    const atMatch = first.match(/^(.+?)\s+(?:at|@|la)\s+(.+)$/i);
    const organizationFirst = looksLikeOrganization(first) && !looksLikeOrganization(second);
    let jobTitle = atMatch?.[1]?.trim() || (organizationFirst ? second : first);
    let company = atMatch?.[2]?.trim() || (organizationFirst ? first : second);
    let location = parsed.headers[2] ?? "";
    if (company.includes(" | ")) {
      const parts = company.split(" | ").map((value) => value.trim());
      company = parts[0];
      location ||= parts.slice(1).join(" | ");
    }
    if (!jobTitle && parsed.body.length) jobTitle = parsed.body.shift() ?? "";
    return {
      id: uid(),
      jobTitle,
      company,
      location,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      current: parsed.current,
      description: parsed.body.join(" "),
      achievements: parsed.bullets,
    };
  }).filter((entry) => entry.jobTitle || entry.company || entry.description);
}

function parseEducation(lines: string[]): ResumeData["education"] {
  return timelineBlocks(lines).map((block) => {
    const parsed = parseTimelineBlock(block);
    const first = parsed.headers[0] ?? "";
    const second = parsed.headers[1] ?? "";
    const schoolFirst = looksLikeSchool(first) || !looksLikeSchool(second);
    return {
      id: uid(),
      school: schoolFirst ? first : second,
      degree: schoolFirst ? second : first,
      field: parsed.headers[2] ?? "",
      location: parsed.headers[3] ?? "",
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      description: [...parsed.body, ...parsed.bullets].join(" "),
      grade: "",
    };
  }).filter((entry) => entry.school || entry.degree || entry.description);
}

function parseSkills(lines: string[]): ResumeData["skills"] {
  const clean = lines.map(stripBullet).filter(Boolean);
  if (!clean.length) return [];
  const grouped = clean
    .map((line) => {
      const colon = line.indexOf(":");
      if (colon <= 0 || colon > 42) return null;
      return {
        name: line.slice(0, colon).trim(),
        values: splitInlineList(line.slice(colon + 1)),
      };
    })
    .filter((group): group is { name: string; values: string[] } => Boolean(group?.values.length));

  if (grouped.length >= Math.max(1, Math.floor(clean.length / 2))) {
    return grouped.map((group) => ({
      id: uid(),
      name: group.name,
      skills: group.values.map((name) => ({ id: uid(), name })),
    }));
  }

  const values = unique(clean.flatMap(splitInlineList));
  return values.length
    ? [{ id: uid(), name: "Skills", skills: values.map((name) => ({ id: uid(), name })) }]
    : [];
}

function parseLanguages(lines: string[]): ResumeData["languages"] {
  const entries: ResumeData["languages"] = [];
  for (const line of lines.map(stripBullet).filter(Boolean)) {
    const chunks = line.includes(",") && !/[:|–—-]/.test(line)
      ? line.split(",")
      : [line];
    for (const chunk of chunks) {
      const parts = chunk.split(/\s*(?:\||:|–|—|\s-\s)\s*/).filter(Boolean);
      const maybeLevel = parts.slice(1).join(" - ");
      const normalizedChunk = normalizeForMatch(chunk);
      const knownLevel = LEVEL_WORDS.find((level) => normalizedChunk.endsWith(level));
      const language = knownLevel && parts.length === 1
        ? chunk.slice(0, Math.max(0, chunk.length - knownLevel.length)).replace(/[\s,;:-]+$/, "")
        : parts[0];
      const level = maybeLevel || (knownLevel ? chunk.slice(language.length).replace(/^[\s,;:-]+/, "") : "");
      if (language) entries.push({ id: uid(), language: language.trim(), level: level.trim() });
    }
  }
  return entries;
}

function parseProjects(lines: string[]): ResumeData["projects"] {
  return timelineBlocks(lines).map((block) => {
    const clean = block.map(stripBullet).filter(Boolean);
    const dateIndex = clean.findIndex(hasDate);
    const date = dateIndex >= 0 ? clean.splice(dateIndex, 1)[0] : "";
    return {
      id: uid(),
      name: clean.shift() ?? "",
      role: clean.length > 1 ? clean.shift() ?? "" : "",
      date,
      link: findUrl(clean, /./),
      github: findUrl(clean, /github\.com/i),
      technologies: [],
      description: clean.join(" "),
    };
  }).filter((entry) => entry.name || entry.description);
}

function parseCertifications(lines: string[]): ResumeData["certifications"] {
  return timelineBlocks(lines).map((block) => {
    const clean = block.map(stripBullet).filter(Boolean);
    const dateIndex = clean.findIndex(hasDate);
    const issueDate = dateIndex >= 0 ? clean.splice(dateIndex, 1)[0] : "";
    return {
      id: uid(),
      name: clean.shift() ?? "",
      organization: clean.shift() ?? "",
      issueDate,
      credentialId: findLabeledValue(clean, ["credential id", "id credential", "azonosito"]),
      url: findUrl(clean, /./),
    };
  }).filter((entry) => entry.name || entry.organization);
}

function parseCourses(lines: string[]): ResumeData["courses"] {
  return timelineBlocks(lines).map((block) => {
    const clean = block.map(stripBullet).filter(Boolean);
    const dateIndex = clean.findIndex(hasDate);
    const date = dateIndex >= 0 ? clean.splice(dateIndex, 1)[0] : "";
    return {
      id: uid(),
      name: clean.shift() ?? "",
      organization: clean.shift() ?? "",
      date,
      description: clean.join(" "),
    };
  }).filter((entry) => entry.name || entry.organization);
}

function parseAwards(lines: string[]): ResumeData["awards"] {
  return timelineBlocks(lines).map((block) => {
    const clean = block.map(stripBullet).filter(Boolean);
    const dateIndex = clean.findIndex(hasDate);
    const date = dateIndex >= 0 ? clean.splice(dateIndex, 1)[0] : "";
    return {
      id: uid(),
      name: clean.shift() ?? "",
      organization: clean.shift() ?? "",
      date,
      description: clean.join(" "),
    };
  }).filter((entry) => entry.name || entry.organization);
}

function parseReferences(lines: string[]): ResumeData["references"] {
  return genericBlocks(lines).map((block) => {
    const clean = block.map(stripBullet).filter(Boolean);
    const email = clean.join(" ").match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
    const phone = findPhone(clean);
    const name = clean.find((line) => !isContactLike(line)) ?? "";
    const detail = clean.find((line) => line !== name && !isContactLike(line)) ?? "";
    const [role = "", company = ""] = detail.split(/\s*(?:,|\|| at | la )\s*/i);
    return { id: uid(), name, role, company, email, phone };
  }).filter((entry) => entry.name || entry.email || entry.phone);
}

function parseTimelineBlock(block: string[]) {
  const clean = block.map((line) => line.trim()).filter(Boolean);
  const dateIndex = clean.findIndex((line) => DATE_RANGE_PATTERN.test(normalizeForMatch(line)));
  const dateLine = dateIndex >= 0 ? clean[dateIndex] : clean.find(hasDate) ?? "";
  const dates = parseDateRange(dateLine);
  const bullets = clean.filter(isBullet).map(stripBullet).filter(Boolean);
  const nonBullets = clean.filter((line) => !isBullet(line) && line !== dateLine);
  let headers: string[];
  let body: string[];
  if (dateIndex > 0) {
    headers = clean.slice(Math.max(0, dateIndex - 3), dateIndex).map(stripBullet);
    const headerSet = new Set(headers);
    body = nonBullets.filter((line) => !headerSet.has(stripBullet(line)));
  } else {
    headers = nonBullets.slice(0, 3).map(stripBullet);
    body = nonBullets.slice(3).map(stripBullet);
  }
  return { headers, body, bullets, ...dates };
}

function timelineBlocks(lines: string[]) {
  const clean = trimBlankLines(lines).filter(Boolean);
  const anchors = clean
    .map((line, index) => (DATE_RANGE_PATTERN.test(normalizeForMatch(line)) ? index : -1))
    .filter((index) => index >= 0);
  if (anchors.length === 1) return clean.length ? [clean] : [];
  if (anchors.length === 0) return genericBlocks(lines);

  const starts = anchors.map((anchor, index) =>
    Math.max(index === 0 ? 0 : anchors[index - 1] + 1, anchor - 3),
  );
  return starts.map((start, index) =>
    clean.slice(start, index + 1 < starts.length ? starts[index + 1] : clean.length),
  );
}

function genericBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) blocks.push(current);
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  if (blocks.length > 1 && blocks.every((block) => block.length === 1)) {
    return [blocks.flat()];
  }
  return blocks;
}

function parseDateRange(value: string) {
  const normalized = normalizeForMatch(value);
  const years = normalized.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  const current = /\b(?:present|current|now|prezent|jelenleg|napjainkig)\b/.test(normalized);
  return {
    startDate: years[0] ?? "",
    endDate: current ? "" : years[1] ?? "",
    current,
  };
}

async function extractFile(file: File): Promise<ExtractedFile> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "json" || file.type === "application/json") {
    return { kind: "json", text: await file.text(), warnings: [] };
  }
  if (extension === "txt" || file.type === "text/plain") {
    return { kind: "text", text: await file.text(), warnings: [] };
  }
  if (extension === "docx" || file.type.includes("wordprocessingml")) {
    return extractDocx(file);
  }
  if (extension === "pdf" || file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (extension === "doc") throw new Error("legacy-doc");
  throw new Error("unsupported-file");
}

async function extractDocx(file: File): Promise<ExtractedFile> {
  const mammothModule = await import("mammoth");
  const mammoth = mammothModule.default ?? mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const raw = await mammoth.extractRawText({ arrayBuffer });
  const images: string[] = [];
  const converted = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        const dataUrl = `data:${image.contentType};base64,${base64}`;
        if (image.contentType.startsWith("image/")) images.push(dataUrl);
        return { src: dataUrl };
      }),
    },
  );
  const profileImage = await chooseAndCompressImage(images);
  return {
    kind: "docx",
    text: raw.value,
    profileImage,
    warnings: [...raw.messages, ...converted.messages]
      .filter((message) => message.type === "warning")
      .slice(0, 2)
      .map((message) => message.message),
  };
}

async function extractPdf(file: File): Promise<ExtractedFile> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  const pages: string[] = [];
  let profileImage: string | undefined;
  const pageLimit = Math.min(pdf.numPages, 12);
  try {
    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(textItemsToLines(content.items as PdfTextItem[]));
      if (!profileImage && pageNumber <= 2) {
        profileImage = await extractProfileImageFromPdfPage(page, pdfjs.ImageKind);
      }
    }
  } finally {
    await task.destroy();
  }
  return {
    kind: "pdf",
    text: pages.join("\n\n"),
    profileImage,
    warnings:
      pdf.numPages > pageLimit
        ? [`Only the first ${pageLimit} pages were imported.`]
        : [],
  };
}

interface PdfTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

function textItemsToLines(items: PdfTextItem[]) {
  type PositionedItem = PdfTextItem & {
    index: number;
    x: number;
    y: number;
    measuredWidth: number;
    measuredHeight: number;
  };
  const positioned: PositionedItem[] = items
    .map((item, index) => {
      const measuredHeight = Math.abs(item.height || item.transform?.[3] || 10);
      return {
        ...item,
        index,
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
        measuredWidth: item.width ?? (item.str?.length ?? 0) * measuredHeight * 0.45,
        measuredHeight,
      };
    })
    .filter((item) => Boolean(item.str));

  const rows: { y: number; height: number; items: PositionedItem[] }[] = [];
  for (const item of positioned) {
    const row = rows.find(
      (candidate) =>
        Math.abs(candidate.y - item.y) <= Math.max(2.5, candidate.height * 0.42),
    );
    if (row) {
      row.items.push(item);
      row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
      row.height = Math.max(row.height, item.measuredHeight);
    } else {
      rows.push({ y: item.y, height: item.measuredHeight, items: [item] });
    }
  }

  const segments = rows.flatMap((row) => {
    const sorted = [...row.items].sort((a, b) => a.x - b.x || a.index - b.index);
    const groups: PositionedItem[][] = [];
    let current: PositionedItem[] = [];
    let previousEnd = Number.NEGATIVE_INFINITY;
    for (const item of sorted) {
      const gap = item.x - previousEnd;
      if (current.length && gap > Math.max(55, row.height * 5)) {
        groups.push(current);
        current = [];
      }
      current.push(item);
      previousEnd = Math.max(previousEnd, item.x + item.measuredWidth);
    }
    if (current.length) groups.push(current);
    return groups.map((group) => ({
      firstIndex: Math.min(...group.map((item) => item.index)),
      y: row.y,
      height: row.height,
      text: joinPdfItems(group),
    }));
  });

  segments.sort((a, b) => a.firstIndex - b.firstIndex);
  const lines: string[] = [];
  let previous: (typeof segments)[number] | undefined;
  for (const segment of segments) {
    if (
      previous &&
      Math.abs(segment.y - previous.y) > Math.max(segment.height, previous.height) * 1.85
    ) {
      lines.push("");
    }
    if (segment.text) lines.push(segment.text);
    previous = segment;
  }
  return lines.join("\n");
}

function joinPdfItems(items: Array<PdfTextItem & { x: number; measuredWidth: number; measuredHeight: number }>) {
  let text = "";
  let previousEnd = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const gap = item.x - previousEnd;
    if (text && gap > Math.max(2.2, item.measuredHeight * 0.2)) text += " ";
    text += item.str ?? "";
    previousEnd = Math.max(previousEnd, item.x + item.measuredWidth);
  }
  return text.replace(/\s+/g, " ").trim();
}

async function extractProfileImageFromPdfPage(
  page: {
    getOperatorList: () => Promise<unknown>;
    objs: Iterable<unknown[]>;
    commonObjs: Iterable<unknown[]>;
  },
  imageKind: { RGB_24BPP: number; RGBA_32BPP: number },
) {
  try {
    await page.getOperatorList();
    const candidates = [...page.objs, ...page.commonObjs]
      .map((entry) => entry[1] as PdfImageObject)
      .filter(isLikelyProfileImage)
      .sort((a, b) => imageScore(b) - imageScore(a));
    for (const candidate of candidates.slice(0, 4)) {
      const dataUrl = pdfImageToDataUrl(candidate, imageKind);
      if (dataUrl) return await compressImageDataUrl(dataUrl);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

interface PdfImageObject {
  width?: number;
  height?: number;
  kind?: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: CanvasImageSource;
}

function isLikelyProfileImage(value: PdfImageObject) {
  const width = value?.width ?? 0;
  const height = value?.height ?? 0;
  const ratio = width && height ? width / height : 0;
  return (
    width >= 70 &&
    height >= 70 &&
    width <= 4000 &&
    height <= 4000 &&
    ratio >= 0.52 &&
    ratio <= 1.55 &&
    Boolean(value.bitmap || value.data)
  );
}

function imageScore(value: PdfImageObject) {
  const width = value.width ?? 0;
  const height = value.height ?? 0;
  const ratio = width / Math.max(1, height);
  const portraitBonus = ratio >= 0.7 && ratio <= 1.15 ? 2 : 1;
  return width * height * portraitBonus;
}

function pdfImageToDataUrl(
  value: PdfImageObject,
  imageKind: { RGB_24BPP: number; RGBA_32BPP: number },
) {
  const width = value.width ?? 0;
  const height = value.height ?? 0;
  if (!width || !height) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  if (value.bitmap) {
    context.drawImage(value.bitmap, 0, 0, width, height);
  } else if (value.data && value.kind === imageKind.RGBA_32BPP) {
    const rgba = new Uint8ClampedArray(value.data);
    context.putImageData(new ImageData(rgba, width, height), 0, 0);
  } else if (value.data && value.kind === imageKind.RGB_24BPP) {
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let source = 0, target = 0; source < value.data.length; source += 3, target += 4) {
      rgba[target] = value.data[source];
      rgba[target + 1] = value.data[source + 1];
      rgba[target + 2] = value.data[source + 2];
      rgba[target + 3] = 255;
    }
    context.putImageData(new ImageData(rgba, width, height), 0, 0);
  } else {
    return undefined;
  }
  return canvas.toDataURL("image/jpeg", 0.88);
}

async function chooseAndCompressImage(images: string[]) {
  const inspected = await Promise.all(
    images.slice(0, 8).map(async (source) => {
      try {
        const image = await loadBrowserImage(source);
        const ratio = image.naturalWidth / image.naturalHeight;
        const acceptable =
          image.naturalWidth >= 70 &&
          image.naturalHeight >= 70 &&
          ratio >= 0.52 &&
          ratio <= 1.55;
        return {
          source,
          acceptable,
          score: image.naturalWidth * image.naturalHeight * (ratio <= 1.15 ? 2 : 1),
        };
      } catch {
        return { source, acceptable: false, score: 0 };
      }
    }),
  );
  const best = inspected.filter((item) => item.acceptable).sort((a, b) => b.score - a.score)[0];
  return best ? compressImageDataUrl(best.source) : undefined;
}

async function compressImageDataUrl(source: string) {
  const image = await loadBrowserImage(source);
  const max = 720;
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.84);
}

function loadBrowserImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function importJsonResume(rawText: string, sourceName: string): ResumeImportResult {
  let raw: Partial<ResumeDocument>;
  try {
    raw = JSON.parse(rawText) as Partial<ResumeDocument>;
  } catch {
    throw new Error("invalid-json");
  }
  if (!raw.data?.personal) throw new Error("invalid-json");
  const template = raw.template && SUPPORTED_TEMPLATES.has(raw.template) ? raw.template : "modern";
  const blank = createBlankResume(template);
  const now = new Date().toISOString();
  const resume: ResumeDocument = {
    ...blank,
    ...raw,
    id: uid(),
    name: raw.name || makeResumeName("", "", sourceName),
    createdAt: now,
    updatedAt: now,
    template,
    cvLanguage: raw.cvLanguage && ["en", "ro", "hu"].includes(raw.cvLanguage)
      ? raw.cvLanguage
      : "en",
    theme: { ...blank.theme, ...(raw.theme ?? {}) },
    data: {
      ...blank.data,
      ...raw.data,
      personal: { ...blank.data.personal, ...raw.data.personal },
    },
  };
  return {
    resume,
    detectedLocale: resume.cvLanguage,
    languageConfidence: "high",
    fileKind: "json",
    photoFound: Boolean(resume.data.personal.profileImage),
    detectedSections: getDetectedSectionLabels(resume.data),
    extractedCharacters: rawText.length,
    warnings: [],
  };
}

function getDetectedSectionLabels(data: ResumeData) {
  const present: SectionKey[] = [];
  if (data.summary) present.push("summary");
  if (data.experience.length) present.push("experience");
  if (data.education.length) present.push("education");
  if (data.skills.length) present.push("skills");
  if (data.languages.length) present.push("languages");
  if (data.projects.length) present.push("projects");
  if (data.certifications.length) present.push("certifications");
  if (data.courses.length) present.push("courses");
  if (data.awards.length) present.push("awards");
  if (data.interests.length) present.push("interests");
  if (data.references.length) present.push("references");
  return present.map((key) => SECTION_LABELS[key]);
}

function normalizeLines(text: string) {
  const result: string[] = [];
  let previousBlank = true;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/[\t\u00a0]+/g, " ").replace(/\s{2,}/g, " ").trim();
    if (/^page\s+\d+(?:\s+of\s+\d+)?$/i.test(line)) continue;
    if (!line) {
      if (!previousBlank) result.push("");
      previousBlank = true;
    } else {
      result.push(line);
      previousBlank = false;
    }
  }
  return trimBlankLines(result);
}

function cleanExtractedText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00ad/g, "")
    .trim();
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findLabeledValue(lines: string[], labels: string[]) {
  for (const line of lines) {
    const normalized = normalizeForMatch(line);
    for (const label of labels) {
      const normalizedLabel = normalizeForMatch(label);
      if (normalized.startsWith(`${normalizedLabel}:`) || normalized.startsWith(`${normalizedLabel} -`)) {
        return line.slice(line.search(/[:–—-]/) + 1).trim();
      }
    }
  }
  return "";
}

function findPhone(lines: string[]) {
  for (const line of lines) {
    const matches = line.match(/(?:\+?\d[\d\s()./-]{6,}\d)/g) ?? [];
    for (const match of matches) {
      const digits = match.replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15 && !DATE_RANGE_PATTERN.test(match)) {
        return match.trim();
      }
    }
  }
  return "";
}

function findUrls(lines: string[]) {
  const matches = lines
    .join(" ")
    .match(/\b(?:https?:\/\/|www\.)[^\s,;]+|\b(?:linkedin\.com|github\.com)\/[^\s,;]+/gi);
  return unique((matches ?? []).map((url) => url.replace(/[.)]+$/, "")));
}

function findUrl(lines: string[], pattern: RegExp) {
  return findUrls(lines).find((url) => pattern.test(url)) ?? "";
}

function isContactLike(line: string) {
  return (
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(line) ||
    /(?:\+?\d[\d\s()./-]{6,}\d)/.test(line) ||
    /(?:https?:\/\/|www\.|linkedin\.com|github\.com)/i.test(line) ||
    Boolean(findLabeledValue([line], ["location", "address", "locatie", "adresa", "cim", "lakcim"]))
  );
}

function isPersonalContactLine(line: string, personal: ReturnType<typeof parsePersonal>) {
  return Object.values(personal).some((value) => typeof value === "string" && value && line.includes(value));
}

function joinParagraphs(lines: string[]) {
  return trimBlankLines(lines)
    .reduce<string[]>((paragraphs, line) => {
      if (!line) {
        if (paragraphs.at(-1) !== "") paragraphs.push("");
      } else if (!paragraphs.length || paragraphs.at(-1) === "") {
        paragraphs.push(stripBullet(line));
      } else {
        paragraphs[paragraphs.length - 1] += ` ${stripBullet(line)}`;
      }
      return paragraphs;
    }, [])
    .filter(Boolean)
    .join("\n\n");
}

function splitList(lines: string[]) {
  return unique(lines.map(stripBullet).filter(Boolean).flatMap(splitInlineList));
}

function splitInlineList(value: string) {
  const normalized = stripBullet(value).trim();
  if (!normalized) return [];
  const values = normalized.split(/\s*(?:,|;|\||•|·)\s*/).filter(Boolean);
  return values.length > 1 ? values : [normalized];
}

function stripBullet(value: string) {
  return value.replace(/^\s*(?:[•●▪‣◆►*]|[-–—])\s*/, "").trim();
}

function isBullet(value: string) {
  return /^\s*(?:[•●▪‣◆►*]|[-–—])\s+/.test(value);
}

function hasDate(value: string) {
  return /\b(?:19|20)\d{2}\b/.test(value);
}

function looksLikeOrganization(value: string) {
  return /\b(?:s\.?r\.?l\.?|s\.?a\.?|ltd|inc|llc|gmbh|company|corporation|group|solutions|technologies|systems|studio|agency|university|universit|egyetem|iskola)\b/i.test(
    normalizeForMatch(value),
  );
}

function looksLikeSchool(value: string) {
  return /\b(?:university|college|school|academy|institute|universit|facult|colegi|liceu|egyetem|foiskola|iskola|gimnazium|intezet)\b/i.test(
    normalizeForMatch(value),
  );
}

function makeResumeName(firstName: string, lastName: string, sourceName: string) {
  const person = `${firstName} ${lastName}`.trim();
  if (person) return `${person} CV`;
  const base = sourceName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || "Imported CV";
}

function trimBlankLines(lines: string[]) {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start]) start += 1;
  while (end > start && !lines[end - 1]) end -= 1;
  return lines.slice(start, end);
}

function countOccurrences(text: string, search: string) {
  let count = 0;
  let index = text.indexOf(search);
  while (index >= 0) {
    count += 1;
    index = text.indexOf(search, index + search.length);
  }
  return count;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
