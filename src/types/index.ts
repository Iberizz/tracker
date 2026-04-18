export type JobStatus = "saved" | "applied" | "interview" | "rejected" | "offer"

export interface Job {
  id: string
  title: string
  company: string
  location: string
  type: "freelance" | "cdi" | "cdd" | "stage"
  tjm?: number
  salary?: number
  url: string
  description: string
  source: "malt" | "linkedin" | "indeed" | "other" | "test" | "serpapi"
  status: JobStatus
  matchScore?: number
  coverLetter?: string
  notes?: string
  appliedAt?: string
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  name: string
  title: string
  skills: string[]
  experience: string
  bio: string
  tjmMin: number
  tjmMax: number
}

export interface GeneratedContent {
  coverLetter: string
  cvHighlights: string[]
}

export interface Candidature {
  id: string
  job: Partial<Job>
  coverLetter: string
  style: "direct" | "soft" | "premium"
  status: "draft" | "sent" | "interview" | "rejected"
  createdAt: string
}
