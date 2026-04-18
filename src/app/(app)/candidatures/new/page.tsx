"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { PROFILE_STORAGE_KEY } from "@/types/profile";

type GenerationStyle = "direct" | "soft" | "premium";
type GenerationFormat = "email" | "short_message" | "cover_letter";

const STYLES: { value: GenerationStyle; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "soft", label: "Soft" },
  { value: "premium", label: "Premium" },
];

const FORMATS: { value: GenerationFormat; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "short_message", label: "Message" },
  { value: "cover_letter", label: "Lettre" },
];

const RESULT_LABEL: Record<GenerationFormat, string> = {
  email: "Email",
  short_message: "Message",
  cover_letter: "Lettre",
};

function VariantCard({
  label,
  index,
  text,
  onSave,
  onSend,
  saved,
  sendState,
}: {
  label: string;
  index: number;
  text: string;
  onSave: () => void;
  saved: boolean;
  onSend: () => void;
  sendState: "idle" | "sending" | "ok" | "err";
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="gen-card" style={{ gap: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="nav-label" style={{ margin: 0 }}>
          {label} — variante {index + 1}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
              className="btn btn-ghost"
              onClick={onSave}
              disabled={saved}
              style={{ fontSize: 11 }}
          >
            {saved ? "✓ Sauvegardé" : "Sauvegarder"}
          </button>
              <button
                  className="btn btn-primary"
                  onClick={onSend}
                  style={{ fontSize: 11 }}
                  disabled={sendState === "sending" || sendState === "ok"}
              >
                {sendState === "sending" ? "Envoi..."
                    : sendState === "ok"   ? "✓ Envoyé"
                        : sendState === "err"  ? "⚠ Retry"
                            : "→ Envoyer"}
              </button>
        </div>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--foreground)",
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function NewCandidature() {
  const params = useSearchParams();

  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<GenerationStyle>("direct");
  const [format, setFormat] = useState<GenerationFormat>("email");
  const [saved, setSaved] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );

  const job = {
    title: params.get("title") || "",
    company: params.get("company") || "",
    description: params.get("description") || "",
  };

  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      setHasProfile(false);
      return;
    }
    try {
      const p = JSON.parse(raw);
      setHasProfile(!!(p?.name || p?.title || p?.stack?.length));
    } catch {
      setHasProfile(false);
    }
  }, []);

  const generate = async () => {
    setLoading(true);
    setVariants([]);
    setSaved(false);
    setSendState("idle");
    setError(null);
    try {
      const profile = JSON.parse(
        localStorage.getItem(PROFILE_STORAGE_KEY) || "{}",
      );
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: [job], style, format, profile }),
      });
      if (!res.ok) {
        setError("Erreur serveur — réessaie");
        return;
      }
      const data = await res.json();
      const raw = data?.results?.[0]?.variants ?? [];
      const parsed: string[] = raw.map((v: unknown) =>
        typeof v === "object" && v !== null
          ? Object.values(v).map(String).join("\n\n")
          : String(v),
      );
      if (parsed.length === 0) {
        setError("Aucun résultat généré");
        return;
      }
      setVariants(parsed);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    const existing = JSON.parse(localStorage.getItem("candidatures") || "[]");
    existing.unshift({
      id: crypto.randomUUID(),
      job,
      coverLetter: variants[0] ?? "",
      style,
      format,
      status: "draft",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("candidatures", JSON.stringify(existing));
    setSaved(true);
  };

  const send = async () => {
    if (!variants[0]) return;
    setSendState("sending");
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "ibnmg120@gmail.com",
          jobTitle: job.title,
          company: job.company,
          message: variants[0],
        }),
      });
      if (res.ok) {
        setSendState("ok");
        if (!saved) {
          const existing = JSON.parse(
            localStorage.getItem("candidatures") || "[]",
          );
          existing.unshift({
            id: crypto.randomUUID(),
            job,
            coverLetter: variants[0],
            style,
            format,
            status: "sent",
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem("candidatures", JSON.stringify(existing));
          setSaved(true);
        }
      } else {
        setSendState("err");
      }
    } catch {
      setSendState("err");
    }
  };

  return (
    <div className="page">
      <div className="topbar">
        <span className="page-title">
          Nouvelle candidature
          {job.title && (
            <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>
              {" "}
              · {job.title}
            </span>
          )}
        </span>
        <div className="topbar-actions">
          <a href="/candidatures" className="btn btn-ghost">
            ← Retour
          </a>
        </div>
      </div>

      <div
        className="page-content"
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        {!hasProfile && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 11,
              background: "rgba(234,179,8,0.08)",
              border: "1px solid rgba(234,179,8,0.2)",
              color: "#ca8a04",
            }}
          >
            ⚠ Profil incomplet —{" "}
            <a
              href="/profil"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              remplis ton profil
            </a>{" "}
            pour des candidatures personnalisées.
          </div>
        )}

        {job.company && (
          <div
            className="gen-card"
            style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
          >
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                {job.title}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {job.company}
              </p>
            </div>
          </div>
        )}

        <div
          className="gen-card"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <span className="nav-label" style={{ margin: 0, minWidth: 50 }}>
            Format
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {FORMATS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setFormat(value);
                  setVariants([]);
                  setError(null);
                  setSendState("idle");
                }}
                className={`btn ${format === value ? "btn-primary" : "btn-ghost"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="gen-card"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <span className="nav-label" style={{ margin: 0, minWidth: 50 }}>
            Style
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {STYLES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setStyle(value);
                  setVariants([]);
                  setError(null);
                  setSendState("idle");
                }}
                className={`btn ${style === value ? "btn-primary" : "btn-ghost"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="btn btn-primary"
          style={{ height: 40, fontSize: 12, opacity: loading ? 0.4 : 1 }}
        >
          {loading ? "Génération en cours..." : "→ Générer"}
        </button>

        {error && (
          <p style={{ fontSize: 11, color: "#ef4444", padding: "4px 0" }}>
            {error}
          </p>
        )}

        {variants.map((text, i) => (
          <VariantCard
            key={i}
            label={RESULT_LABEL[format]}
            index={i}
            text={text}
            onSave={save}
            saved={saved}
            onSend={send}
            sendState={sendState}
          />
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <NewCandidature />
    </Suspense>
  );
}
