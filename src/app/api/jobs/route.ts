import { fetchAllJobs } from "@/api/fetchJobs"

export async function GET() {
    try {
        const jobs = await fetchAllJobs()
        return Response.json(jobs)
    } catch (e) {
        console.error("API jobs error:", e)
        return Response.json([], { status: 500 })
    }
}