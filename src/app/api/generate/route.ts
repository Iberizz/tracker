import Groq from "groq-sdk"
import { UserProfile } from "@/types/profile"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export type GenerationStyle  = "direct" | "soft" | "premium"
export type GenerationFormat = "email" | "short_message" | "cover_letter"

interface SafeProfile {
  name:         string | null
  title:        string | null
  location:     string | null
  availability: string | null
  experience:   string | null
  tjm:          number | null
  stack:        string[]
  projects:     { name: string; description: string }[]
  bio:          string | null
}

interface SafeJob {
  title:       string
  company:     string
  description: string
}

interface GenerateResult {
  id:          string
  title:       string
  company:     string
  description: string
  variants:    string[]
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizeSafeProfile(raw?: Partial<UserProfile>): SafeProfile {
  return {
    name:         raw?.name?.trim()         || null,
    title:        raw?.title?.trim()        || null,
    location:     raw?.location?.trim()     || null,
    availability: raw?.availability?.trim() || null,
    experience:   raw?.experience?.trim()   || null,
    tjm:          typeof raw?.tjm === "number" && raw.tjm > 0 ? raw.tjm : null,
    stack:        Array.isArray(raw?.stack)
        ? raw.stack.map((s) => s.trim()).filter(Boolean)
        : [],
    projects:     Array.isArray(raw?.projects)
        ? raw.projects
            .filter((p) => p?.name?.trim())
            .map((p) => ({ name: p.name.trim(), description: p.description?.trim() || "" }))
        : [],
    bio:          raw?.bio?.trim() || null,
  }
}

function normalizeSafeJob(raw: any): SafeJob {
  return {
    title:       String(raw?.title       || "").trim() || "Mission non précisée",
    company:     String(raw?.company     || "").trim() || "Entreprise non précisée",
    description: String(raw?.description || "").trim().slice(0, 1200) || "Non précisée",
  }
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un assistant qui rédige des candidatures freelance.
Tu travailles uniquement à partir des données fournies.
Tu n'inventes rien. Tu n'extrapoles rien. Tu n'embellies rien.
Si une donnée est absente, tu l'ignores complètement.
Tu ne mentionnes jamais une technologie, un projet, une durée ou une localisation qui n'est pas explicitement présente dans les données.`

const FORMAT_CONFIG: Record<GenerationFormat, { label: string; rules: string }> = {
  email: {
    label: "Email",
    rules: [
      "Structure exacte à respecter :",
      "",
      "Objet : [titre du poste court]",
      "",
      "[Accroche — 2 à 3 lignes : pourquoi cette offre précisément, avec 1 élément concret de JOB FACTS]",
      "",
      "[Corps — 4 à 5 lignes : ce que tu apportes concrètement, cite 1 projet de PROFILE FACTS, cite la stack commune entre profil et offre]",
      "",
      "[CTA — 1 à 2 lignes : disponibilité + invitation à échanger]",
      "",
      "[Signature : Prénom Nom du profil uniquement, sinon rien]",
      "",
      "Pas de 'Madame, Monsieur'. Pas de formule de politesse longue. Ton direct.",
    ].join("\n"),
  },
  short_message: {
    label: "Message court",
    rules: [
      "6 à 8 lignes au total, ton direct",
      "Ligne 1 : accroche factuelle sur le poste (cite le titre ou la techno clé)",
      "Lignes 2-5 : ce que tu apportes, 1 projet concret, stack, disponibilité",
      "Dernière ligne : call-to-action court",
      "Pas de formule de politesse. Pas de 'Madame, Monsieur'.",
      "Signature : Prénom Nom si fourni, sinon rien",
    ].join("\n"),
  },
  cover_letter: {
    label: "Lettre de motivation",
    rules: [
      "3 paragraphes rédigés, séparés chacun par une ligne vide. Pas de liste, pas de tirets, uniquement du texte continu.",
      "",
      "Paragraphe 1 — Accroche (6 à 7 lignes) : contexte de l'offre, ce qui t'a attiré dans CE poste précis, cite au moins 1 élément concret de JOB FACTS (techno, mission, contexte métier)",
      "",
      "Paragraphe 2 — Valeur (6 à 7 lignes) : ce que tu apportes concrètement, cite 2 projets de PROFILE FACTS par leur nom, mentionne la stack correspondante entre profil et offre, donne des faits — pas d'adjectifs vides",
      "",
      "Paragraphe 3 — Projection (6 à 7 lignes) : comment tu t'intègres dans ce contexte précis, ta disponibilité, ton TJM si fourni, call-to-action clair",
      "",
      "Commence directement par le texte du paragraphe 1 — pas de titre, pas d'objet, pas de 'Madame, Monsieur'",
      "Signature : Prénom Nom si fourni, sinon rien",
    ].join("\n"),
  },
}

const STYLE_TONE: Record<GenerationStyle, string> = {
  direct:  "Direct. Phrases courtes. Zéro remplissage.",
  soft:    "Naturel. Humain. Fluide.",
  premium: "Posé. Structuré. Sobre.",
}

function buildProfileBlock(p: SafeProfile): string {
  const lines: string[] = []
  if (p.name)         lines.push(`Nom : ${p.name}`)
  if (p.title)        lines.push(`Rôle : ${p.title}`)
  if (p.location)     lines.push(`Localisation CANDIDAT : ${p.location}`)
  if (p.experience)   lines.push(`Expérience : ${p.experience}`)
  if (p.availability) lines.push(`Disponibilité : ${p.availability}`)
  if (p.tjm)          lines.push(`TJM : ${p.tjm}€/jour`)
  if (p.stack.length) lines.push(`Stack : ${p.stack.join(", ")}`)
  if (p.bio)          lines.push(`Bio : ${p.bio}`)
  if (p.projects.length) {
    lines.push("Projets :")
    p.projects.forEach((pr) => lines.push(`  - ${pr.name}${pr.description ? ` : ${pr.description}` : ""}`))
  }
  return lines.length ? lines.join("\n") : "Aucune donnée fournie."
}

function buildPrompt(
    job:     SafeJob,
    profile: SafeProfile,
    style:   GenerationStyle,
    format:  GenerationFormat,
    retry:   boolean
): string {
  const fmt = FORMAT_CONFIG[format]

  return `
## PROFILE FACTS
Utilise UNIQUEMENT ces données pour parler du candidat. Rien d'autre.
${buildProfileBlock(profile)}

## JOB FACTS
Utilise UNIQUEMENT ces données pour parler du poste.
La localisation du poste N'EST PAS la localisation du candidat.
Titre : ${job.title}
Entreprise : ${job.company}
Description : ${job.description}

## FORMAT : ${fmt.label}
${fmt.rules}

## STYLE
${STYLE_TONE[style]}

## RÈGLES ABSOLUES${retry ? " — RETRY STRICT, première version rejetée pour hallucination" : ""}
- N'utilise QUE les données de PROFILE FACTS et JOB FACTS
- Zéro invention : pas d'années d'expérience inventées, pas de technos, pas de projets, pas de noms
- Si un champ est absent de PROFILE FACTS → ne pas le mentionner, même vaguement
- La localisation du candidat = uniquement "Localisation CANDIDAT" dans PROFILE FACTS
- Ne jamais confondre ville du poste et ville du candidat
- Signature = uniquement "Nom" de PROFILE FACTS si présent, sinon aucune signature
- Pas de superlatifs sans fait (pas de "expert reconnu", "solide expérience", "grande maîtrise")
- Pas de "je m'appelle" en ouverture
- OBLIGATOIRE : mentionne au moins 1 élément concret de JOB FACTS (techno spécifique, contexte métier, mission précise) — montre que tu as lu cette offre et pas une autre
- OBLIGATOIRE : mentionne au moins 1 élément concret de PROFILE FACTS (projet livré, techno du stack, disponibilité) — ancre dans le réel
- Un texte générique applicable à n'importe quelle offre est un échec

Génère 2 variantes différentes. Réponds UNIQUEMENT avec ce JSON valide, sans markdown :
{"message1": "variante 1 ici", "message2": "variante 2 ici"}
`.trim()
}

// ─── Validation ───────────────────────────────────────────────────────────────

const SUSPECT_TECHS = new Set([
  "vue", "angular", "svelte", "django", "rails", "laravel", "symfony",
  "flutter", "kotlin", "swift", "rust", "golang", "aws", "azure", "gcp",
  "docker", "kubernetes", "graphql", "redux", "mobx", "contentstack",
  "contentful", "wordpress", "shopify", "magento", "salesforce", "jquery",
])

// French first names that models tend to hallucinate
const COMMON_INVENTED_NAMES = new Set([
  "thomas", "nicolas", "julien", "pierre", "alexandre", "maxime", "antoine",
  "baptiste", "lucas", "hugo", "léo", "leo", "paul", "gabriel", "arthur",
  "sophie", "marie", "camille", "julie", "céline", "celine", "emma", "lea", "léa",
])

function validateVariant(
    text:    string,
    profile: SafeProfile,
    job:     SafeJob
): { valid: boolean; reason?: string } {
  const lower = text.toLowerCase()

  // 1. Années d'expérience inventées
  if (!profile.experience) {
    if (/\b\d+\s*(ans?|années?)\s*(d['']expérience|de\s+(développement|travail|carrière|freelance))/i.test(text)) {
      return { valid: false, reason: "Années d'expérience inventées" }
    }
  }

  // 2. Prénom inventé en signature (hors nom du profil)
  if (profile.name) {
    const allowedName = profile.name.toLowerCase()
    for (const name of COMMON_INVENTED_NAMES) {
      if (name === allowedName) continue
      // Check if the invented name appears as a standalone word near end of text
      if (new RegExp(`\\b${name}\\b`, "i").test(text.slice(-100))) {
        return { valid: false, reason: `Prénom inventé en signature : "${name}"` }
      }
    }
  }

  // 3. Technos inventées
  const knownTerms = new Set([
    ...profile.stack.map((t) => t.toLowerCase()),
    ...job.description.toLowerCase().split(/\W+/).filter((t) => t.length > 2),
    ...job.title.toLowerCase().split(/\W+/).filter((t) => t.length > 2),
  ])
  for (const tech of SUSPECT_TECHS) {
    if (lower.includes(tech) && !knownTerms.has(tech)) {
      return { valid: false, reason: `Technologie inventée : "${tech}"` }
    }
  }

  // 4. Localisation candidat déformée
  if (profile.location) {
    const profileCity = profile.location.split(/[,\s]/)[0].toLowerCase()
    const jobWords    = (job.description + " " + job.title).match(/\b[A-ZÀÂÉÈÊÎÔÙÛ][a-zàâéèêîôùû]{3,}\b/g) || []
    for (const word of jobWords) {
      const wl = word.toLowerCase()
      if (wl === profileCity) continue
      if (new RegExp(`(basé[·e]?|situé[e]?|travaille)\\s+[àa]\\s+${wl}`, "i").test(text)) {
        return { valid: false, reason: `Localisation déformée : "${word}" attribuée au candidat` }
      }
    }
  }

  // 5. Longueur excessive
  const wordCount = text.trim().split(/\s+/).length
  if (wordCount > 350) {
    return { valid: false, reason: `Texte trop long : ${wordCount} mots` }
  }

  return { valid: true }
}

// ─── AI call ──────────────────────────────────────────────────────────────────

async function callGroq(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
  })
  return res.choices[0]?.message?.content || ""
}

function parseVariants(raw: string): string[] {
  // Strip markdown fences
  let cleaned = raw.replace(/```json|```/g, "").trim()

  // Extract first JSON object
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objMatch) cleaned = objMatch[0]

  // Strategy 1: direct parse
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.message1 || parsed.message2) {
      return [parsed.message1, parsed.message2]
          .filter((v) => typeof v === "string" && v.trim())
    }
  } catch { /* fallthrough */ }

  // Strategy 2: replace literal control chars then parse
  try {
    const sanitized = cleaned
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")  // remove non-printable
        .replace(/(?<!\\)\n/g, "\\n")                      // escape bare newlines
        .replace(/(?<!\\)\r/g, "")                           // remove bare CR
        .replace(/(?<!\\)\t/g, " ")                          // replace bare tabs
    const parsed = JSON.parse(sanitized)
    if (parsed.message1 || parsed.message2) {
      return [parsed.message1, parsed.message2]
          .filter((v) => typeof v === "string" && v.trim())
          .map((v: string) => v.replace(/\\n/g, "\n"))
    }
  } catch { /* fallthrough */ }

  // Strategy 3: regex extract values directly — no JSON.parse
  try {
    const results: string[] = []
    const pattern = /"message\d"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/g
    let match
    while ((match = pattern.exec(cleaned)) !== null) {
      results.push(match[1].replace(/\\n/g, "\n").replace(/\\"/g, "\""))
    }
    if (results.length > 0) return results
  } catch { /* fallthrough */ }

  throw new Error("parseVariants: impossible d'extraire les variantes")
}

// ─── Core generation ──────────────────────────────────────────────────────────

async function generateVariants(
    job:     SafeJob,
    profile: SafeProfile,
    style:   GenerationStyle,
    format:  GenerationFormat
): Promise<string[]> {
  // Pass 1
  const raw1      = await callGroq(buildPrompt(job, profile, style, format, false))
  const variants1 = parseVariants(raw1)

  const validated: string[] = []
  let   needsRetry = false

  for (const v of variants1) {
    const check = validateVariant(v, profile, job)
    if (check.valid) {
      validated.push(v)
    } else {
      console.warn(`[generate] rejeté — ${check.reason}`)
      needsRetry = true
    }
  }

  // Pass 2 (strict) if needed
  if (needsRetry && validated.length < 2) {
    try {
      const raw2      = await callGroq(buildPrompt(job, profile, style, format, true))
      const variants2 = parseVariants(raw2)
      for (const v of variants2) {
        const check = validateVariant(v, profile, job)
        if (check.valid && validated.length < 2) validated.push(v)
      }
    } catch (err) {
      console.error("[generate] retry failed:", err)
    }
  }

  // Fallback: return raw pass 1 rather than crashing
  return validated.length > 0 ? validated.slice(0, 2) : variants1.slice(0, 2)
}

// ─── Route ────────────────────────────────────────────────────────────────────

const VALID_STYLES  = new Set<GenerationStyle>(["direct", "soft", "premium"])
const VALID_FORMATS = new Set<GenerationFormat>(["email", "short_message", "cover_letter"])

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { jobs, style, format, profile } = body as {
      jobs:     any[]
      style?:   string
      format?:  string
      profile?: Partial<UserProfile>
    }

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return Response.json({ error: "jobs requis (array)" }, { status: 400 })
    }
    if (jobs.length > 5) {
      return Response.json({ error: "Max 5 jobs par requête" }, { status: 400 })
    }

    const resolvedStyle:  GenerationStyle  = VALID_STYLES.has(style   as GenerationStyle)  ? (style  as GenerationStyle)  : "direct"
    const resolvedFormat: GenerationFormat = VALID_FORMATS.has(format as GenerationFormat) ? (format as GenerationFormat) : "email"

    const safeProfile = normalizeSafeProfile(profile)
    const results: GenerateResult[] = []

    for (const job of jobs) {
      const safeJob = normalizeSafeJob(job)
      try {
        const variants = await generateVariants(safeJob, safeProfile, resolvedStyle, resolvedFormat)
        results.push({ id: crypto.randomUUID(), title: safeJob.title, company: safeJob.company, description: safeJob.description, variants })
        await new Promise((r) => setTimeout(r, 150))
      } catch (err) {
        console.error("[generate] job error:", err)
        results.push({ id: crypto.randomUUID(), title: safeJob.title, company: safeJob.company, description: safeJob.description, variants: ["Erreur génération"] })
      }
    }

    return Response.json({ results })

  } catch (err) {
    console.error("[generate] route error:", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}