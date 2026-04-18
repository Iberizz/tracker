import { Job } from "@/types"
import crypto from "crypto"

type Source = Job["source"]

export function parseRSSFeed(xml: string, source: Source): Partial<Job>[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || []

  return items.map((item) => {
    const title = extractTag(item, "title")
    const link = extractTag(item, "link")
    const description = stripHTML(extractTag(item, "description"))
    const pubDate = extractTag(item, "pubDate")
    const author = extractTag(item, "author") || extractTag(item, "dc:creator") || ""

    const company = extractCompanyFromTitle(title) || author || "Inconnu"
    const cleanTitle = cleanJobTitle(title)
    const location = extractLocation(title + " " + description)
    const tjm = extractTJM(title + " " + description)

    return {
      id: crypto.createHash("md5").update(link || title).digest("hex").slice(0, 12),
      title: cleanTitle,
      company,
      location,
      type: detectType(title + " " + description),
      tjm,
      url: link,
      description: description.slice(0, 500),
      source,
      status: "saved",
      matchScore: computeMatchScore(cleanTitle, description),
      createdAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Partial<Job>
  }).filter((j) => j.title && j.title.length > 3)
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return (match?.[1] || match?.[2] || "").trim()
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function extractCompanyFromTitle(title: string): string {
  const match = title.match(/[-–—]\s*([^-–—]+)$/)
  return match ? match[1].trim() : ""
}

function cleanJobTitle(title: string): string {
  return title.replace(/[-–—]\s*[^-–—]+$/, "").trim() || title
}

function extractLocation(text: string): string {
  const locations = ["Paris", "Lyon", "Bordeaux", "Nantes", "Toulouse", "Lille", "Remote", "Télétravail", "France"]
  for (const loc of locations) {
    if (text.toLowerCase().includes(loc.toLowerCase())) return loc
  }
  return "France"
}

function extractTJM(text: string): number | undefined {
  const match = text.match(/(\d{3,4})\s*€?\s*\/?\s*(j|jour|day)/i)
  return match ? parseInt(match[1]) : undefined
}

function detectType(text: string): Job["type"] {
  const t = text.toLowerCase()
  if (t.includes("freelance") || t.includes("mission") || t.includes("tjm")) return "freelance"
  if (t.includes("cdi")) return "cdi"
  if (t.includes("cdd")) return "cdd"
  if (t.includes("stage") || t.includes("intern")) return "stage"
  return "freelance"
}

function computeMatchScore(title: string, description: string): number {
  const text = (title + " " + description).toLowerCase()
  const keywords = ["react", "next.js", "nextjs", "typescript", "tailwind", "frontend", "front-end", "vite", "vercel"]
  const matches = keywords.filter((k) => text.includes(k)).length
  return Math.round((matches / keywords.length) * 100)
}
