import { Job } from "@/types"
import { parseRSSFeed } from "@/api/parser"

export async function fetchTestJobs(): Promise<Partial<Job>[]> {
    try {
        const res = await fetch("https://stackoverflow.com/jobs/feed")

        if (!res.ok) return []

        const xml = await res.text()

        return parseRSSFeed(xml, "test")
    } catch {
        return []
    }
}