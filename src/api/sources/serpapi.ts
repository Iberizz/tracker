import { Job } from "@/types";
import crypto from "crypto";

export async function fetchSerpApiJobs(): Promise<Partial<Job>[]> {
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", "développeur React Next.js freelance");
  url.searchParams.set("location", "France");
  url.searchParams.set("hl", "fr");
  url.searchParams.set("gl", "fr");
  url.searchParams.set("api_key", process.env.SERPAPI_KEY || "");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[SerpAPI] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (data.error) {
      console.warn("[SerpAPI]", data.error);
      return [];
    }

    const items: any[] = data.jobs_results || [];
    console.log(`[SerpAPI] ${items.length} offres`);

    return dedupe(
      items.map((item) => ({
        id: crypto
          .createHash("md5")
          .update(item.job_id || item.title)
          .digest("hex")
          .slice(0, 12),
        title: item.title,
        company: item.company_name || "Inconnu",
        location: item.location || "France",
        type: "freelance" as const,
        url:
          item.related_links?.[0]?.link ||
          `https://www.google.com/search?q=${encodeURIComponent(item.title)}`,
        description: item.description?.slice(0, 2000) || "",
        source: "other" as const,
        status: "saved" as const,
        matchScore: computeMatchScore(item.title, item.description || ""),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    );
  } catch (err) {
    console.warn("[SerpAPI] Fatal", err);
    return [];
  }
}

function computeMatchScore(title: string, description: string): number {
  const text = (title + " " + description).toLowerCase();
  const keywords = [
    "react",
    "next",
    "typescript",
    "frontend",
    "javascript",
    "tailwind",
    "vite",
  ];
  const matches = keywords.filter((k) => text.includes(k)).length;
  return Math.round((matches / keywords.length) * 100);
}

function dedupe(jobs: Partial<Job>[]): Partial<Job>[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const k = `${j.title}-${j.company}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
