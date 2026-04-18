import { fetchSerpApiJobs } from "./sources/serpapi"

export async function fetchAllJobs() {
    const jobs = await fetchSerpApiJobs()

    return jobs.sort((a, b) => {
        const scoreA = (a.matchScore ?? 0) + freshnessBoost(a.createdAt)
        const scoreB = (b.matchScore ?? 0) + freshnessBoost(b.createdAt)
        return scoreB - scoreA
    })
}

function freshnessBoost(date?: string): number {
    if (!date) return 0
    const age = (Date.now() - new Date(date).getTime()) / 3600000
    if (age < 24) return 30
    if (age < 72) return 15
    if (age < 168) return 5
    return 0
}