"use client";

import { useEffect, useState } from "react";
import { Candidature } from "@/types";

const STATUSES = ["draft", "sent", "interview", "rejected"] as const;
type CandidatureStatus = (typeof STATUSES)[number];

const STATUS_LABELS: Record<CandidatureStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  interview: "Entretien",
  rejected: "Refusé",
};
const STATUS_STYLES: Record<CandidatureStatus, string> = {
  draft: "status-saved",
  sent: "status-applied",
  interview: "status-interview",
  rejected: "status-saved",
};

function load(): Candidature[] {
  try {
    return JSON.parse(localStorage.getItem("candidatures") || "[]");
  } catch {
    return [];
  }
}

function persist(data: Candidature[]) {
  localStorage.setItem("candidatures", JSON.stringify(data));
}

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<Record<string, "ok" | "err">>(
    {},
  );

  useEffect(() => {
    setTimeout(() => setCandidatures(load()), 0);
    const sync = () => setCandidatures(load());
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updateStatus = (id: string, status: CandidatureStatus) => {
    const updated = candidatures.map((c) =>
      c.id === id ? { ...c, status } : c,
    );
    setCandidatures(updated);
    persist(updated);
  };

  const send = async (c: Candidature) => {
    if (!c.coverLetter) return;
    setSending(c.id);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "ibnmg120@gmail.com",
          jobTitle: c.job.title,
          company: c.job.company,
          message: c.coverLetter,
        }),
      });
      if (res.ok) {
        setSendResult((p) => ({ ...p, [c.id]: "ok" }));
        updateStatus(c.id, "sent");
      } else {
        setSendResult((p) => ({ ...p, [c.id]: "err" }));
      }
    } catch {
      setSendResult((p) => ({ ...p, [c.id]: "err" }));
    } finally {
      setSending(null);
    }
  };

  const remove = (id: string) => {
    const updated = candidatures.filter((c) => c.id !== id);
    setCandidatures(updated);
    persist(updated);
  };

  return (
    <div className="page">
      <div className="topbar">
        <span className="page-title">Candidatures</span>
        <div className="topbar-actions">
          <a href="/offres" className="btn btn-primary">
            + Depuis une offre
          </a>
        </div>
      </div>

      <div className="page-content">
        {candidatures.length === 0 ? (
          <p className="empty-state">
            Aucune candidature — trouve une offre et clique "Candidater"
          </p>
        ) : (
          <div className="jobs-list">
            {candidatures.map((c) => (
              <div
                key={c.id}
                className="job-row"
                style={{ gap: 10, alignItems: "center" }}
              >
                {/* Infos */}
                <div className="job-info" style={{ flex: 1 }}>
                  <p className="job-title">{c.job.title}</p>
                  <p className="job-meta">
                    {c.job.company} ·{" "}
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                    {c.style && (
                      <span style={{ marginLeft: 6, opacity: 0.5 }}>
                        {c.style}
                      </span>
                    )}
                  </p>
                </div>

                {/* Statut dropdown */}
                <select
                  value={c.status}
                  onChange={(e) =>
                    updateStatus(c.id, e.target.value as CandidatureStatus)
                  }
                  className={`job-status ${STATUS_STYLES[c.status as CandidatureStatus] || "status-saved"}`}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>

                {/* Envoyer */}
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 10, padding: "3px 8px", minWidth: 64 }}
                  disabled={sending === c.id || sendResult[c.id] === "ok"}
                  onClick={() => send(c)}
                >
                  {sending === c.id
                    ? "..."
                    : sendResult[c.id] === "ok"
                      ? "✓ Envoyé"
                      : sendResult[c.id] === "err"
                        ? "⚠ Retry"
                        : "Envoyer"}
                </button>

                {/* Supprimer */}
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: "3px 6px", opacity: 0.4 }}
                  onClick={() => remove(c.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
