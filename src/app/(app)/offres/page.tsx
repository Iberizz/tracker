"use client"

import { useEffect, useState } from "react"
import { Job } from "@/types"

const SOURCE_LABELS: Record<string, string> = { indeed: "IND", linkedin: "LKD", other: "WEB" }

export default function OffresPage() {
  const [jobs, setJobs] = useState<Partial<Job>[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<string | null>(null)

  async function loadJobs() {
    setLoading(true)
    try {
      const res = await fetch("/api/jobs", { headers: { "Accept": "application/json" } })
      const data = await res.json()
      setJobs(data.jobs || data)
      setLastFetch(new Date().toLocaleTimeString("fr-FR"))
    } catch { console.error("Erreur fetch jobs") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadJobs() }, [])

  const stats = {
    total: jobs.length,
    newJobs: jobs.filter((j) => j.status === "saved").length,
    applied: jobs.filter((j) => j.status === "applied").length,
    avgTjm: jobs.filter((j) => j.tjm).length
        ? Math.round(jobs.filter((j) => j.tjm).reduce((a, j) => a + (j.tjm || 0), 0) / jobs.filter((j) => j.tjm).length)
        : 0,
  }

  return (
      <div className="page">
        <div className="topbar">
        <span className="page-title">
          Offres{lastFetch && <span style={{ color: "var(--muted-foreground)", fontWeight: 400, marginLeft: 8 }}>· {lastFetch}</span>}
        </span>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={loadJobs} disabled={loading}>
              {loading ? "..." : "↻ Actualiser"}
            </button>
          </div>
        </div>

        <div className="page-content">
          <div className="stats-grid">
            <div className="stat-card"><span className="stat-val">{loading ? "—" : stats.total}</span><span className="stat-label">Trouvées</span></div>
            <div className="stat-card"><span className="stat-val">{loading ? "—" : stats.newJobs}</span><span className="stat-label">Nouvelles</span></div>
            <div className="stat-card"><span className="stat-val">{loading ? "—" : stats.applied}</span><span className="stat-label">Candidatures</span></div>
            <div className="stat-card"><span className="stat-val">{loading ? "—" : stats.avgTjm ? `${stats.avgTjm}€` : "—"}</span><span className="stat-label">TJM moyen</span></div>
          </div>

          {loading ? (
              <div className="loading-rows">
                {[...Array(6)].map((_, i) => <div key={i} className="job-row-skeleton" />)}
              </div>
          ) : jobs.length === 0 ? (
              <p className="empty-state">Aucune offre trouvée.</p>
          ) : (
              <div className="jobs-list">
                {jobs.map((job) => (
                    <div key={job.id} className="job-row">
                      <div className="job-source-badge">{SOURCE_LABELS[job.source || "other"]}</div>
                      <div className="job-info">
                        <p className="job-title">{job.title}</p>
                        <p className="job-meta">{job.company} · {job.location}{job.createdAt && ` · ${formatDate(job.createdAt)}`}</p>
                      </div>
                      {job.tjm && <span className="job-tjm">{job.tjm}€/j</span>}
                      {job.matchScore !== undefined && <span className="job-score">{job.matchScore}%</span>}
                    <a
                      href={`/candidatures/new?title=${encodeURIComponent(job.title || "")}&company=${encodeURIComponent(job.company || "")}&description=${encodeURIComponent(job.description || "")}`}
                      className="btn btn-primary"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      >
                      Candidater
                    </a>
                  </div>
                  ))}
              </div>
            )}
        </div>
      </div>
  )
}

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "À l'instant"
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}