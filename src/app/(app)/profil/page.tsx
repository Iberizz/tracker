"use client"

import { useState, useEffect, useCallback } from "react"
import { UserProfile, UserProject, DEFAULT_PROFILE, PROFILE_STORAGE_KEY } from "@/types/profile"

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="profile-field">
            <div className="profile-field-header">
                <label className="profile-label">{label}</label>
                {hint && <span className="profile-hint">{hint}</span>}
            </div>
            {children}
        </div>
    )
}

function StackInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const [input, setInput] = useState("")

    const add = () => {
        const trimmed = input.trim()
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed])
        }
        setInput("")
    }

    const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {value.map((tag) => (
                    <span key={tag} className="stack-tag">
            {tag}
                        <button onClick={() => remove(tag)} className="stack-tag-remove" type="button">×</button>
          </span>
                ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
                <input
                    className="gen-textarea"
                    style={{ height: 32, padding: "0 10px", flex: 1, fontSize: 12 }}
                    placeholder="React, TypeScript, Supabase…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
                />
                <button type="button" className="btn btn-ghost" onClick={add} style={{ fontSize: 11 }}>
                    + Ajouter
                </button>
            </div>
        </div>
    )
}

function ProjectsInput({ value, onChange }: { value: UserProject[]; onChange: (v: UserProject[]) => void }) {
    const add = () => onChange([...value, { name: "", description: "" }])

    const update = (i: number, field: keyof UserProject, val: string) => {
        const next = [...value]
        next[i] = { ...next[i], [field]: val }
        onChange(next)
    }

    const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {value.map((p, i) => (
                <div key={i} className="gen-card" style={{ gap: 8, padding: 12, position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => remove(i)}
                        className="btn btn-ghost"
                        style={{ position: "absolute", top: 8, right: 8, fontSize: 10, padding: "2px 6px", opacity: 0.5 }}
                    >
                        ✕
                    </button>
                    <input
                        className="gen-textarea"
                        style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                        placeholder="Nom du projet"
                        value={p.name}
                        onChange={(e) => update(i, "name", e.target.value)}
                    />
                    <textarea
                        className="gen-textarea"
                        style={{ height: 60, fontSize: 12, resize: "vertical" }}
                        placeholder="Description courte (stack, URL, contexte)"
                        value={p.description}
                        onChange={(e) => update(i, "description", e.target.value)}
                    />
                </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={add} style={{ fontSize: 11, alignSelf: "flex-start" }}>
                + Ajouter un projet
            </button>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilPage() {
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
    const [saved, setSaved] = useState(false)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
            if (raw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) })
        } catch { /* ignore */ }
        setLoaded(true)
    }, [])

    const set = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
        setSaved(false)
        setProfile((prev) => ({ ...prev, [key]: value }))
    }, [])

    const save = () => {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
        setSaved(true)
    }

    if (!loaded) return null

    return (
        <div className="page">
            <div className="topbar">
                <span className="page-title">Profil</span>
                <div className="topbar-actions">
                    <button className="btn btn-primary" onClick={save} style={{ fontSize: 11 }}>
                        {saved ? "✓ Sauvegardé" : "Sauvegarder"}
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680 }}>

                {/* Identité */}
                <section className="profile-section">
                    <p className="profile-section-title">Identité</p>
                    <div className="profile-grid-2">
                        <Field label="Nom">
                            <input className="gen-textarea" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                                   placeholder="Jean Dupont" value={profile.name}
                                   onChange={(e) => set("name", e.target.value)} />
                        </Field>
                        <Field label="Titre">
                            <input className="gen-textarea" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                                   placeholder="Développeur Frontend React/Next.js" value={profile.title}
                                   onChange={(e) => set("title", e.target.value)} />
                        </Field>
                        <Field label="Localisation">
                            <input className="gen-textarea" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                                   placeholder="Paris, France" value={profile.location}
                                   onChange={(e) => set("location", e.target.value)} />
                        </Field>
                        <Field label="TJM cible" hint="€/jour">
                            <input className="gen-textarea" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                                   type="number" placeholder="500" value={profile.tjm}
                                   onChange={(e) => set("tjm", e.target.value === "" ? "" : Number(e.target.value))} />
                        </Field>
                    </div>
                    <Field label="Disponibilité">
                        <input className="gen-textarea" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                               placeholder="Disponible immédiatement / à partir du 01/06" value={profile.availability}
                               onChange={(e) => set("availability", e.target.value)} />
                    </Field>
                </section>

                {/* Pitch */}
                <section className="profile-section">
                    <p className="profile-section-title">Pitch</p>
                    <Field label="Bio" hint="injectée dans le prompt Groq">
            <textarea className="gen-textarea" style={{ height: 90, fontSize: 12, resize: "vertical" }}
                      placeholder="Ex : Freelance frontend 4 ans d'expérience, spécialisé React/Next.js, avec des livraisons récentes dans l'immobilier et l'e-commerce."
                      value={profile.bio}
                      onChange={(e) => set("bio", e.target.value)} />
                    </Field>
                    <Field label="Expérience">
                        <input className="gen-textarea" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                               placeholder="4 ans en freelance, 2 ans en agence" value={profile.experience}
                               onChange={(e) => set("experience", e.target.value)} />
                    </Field>
                </section>

                {/* Stack */}
                <section className="profile-section">
                    <p className="profile-section-title">Stack</p>
                    <Field label="Technologies" hint="Entrée ou clic pour ajouter">
                        <StackInput value={profile.stack} onChange={(v) => set("stack", v)} />
                    </Field>
                </section>

                {/* Projets */}
                <section className="profile-section">
                    <p className="profile-section-title">Projets</p>
                    <ProjectsInput value={profile.projects} onChange={(v) => set("projects", v)} />
                </section>

                <div style={{ paddingBottom: 24 }}>
                    <button className="btn btn-primary" onClick={save} style={{ height: 38, fontSize: 12, minWidth: 140 }}>
                        {saved ? "✓ Sauvegardé" : "Sauvegarder le profil"}
                    </button>
                </div>
            </div>
        </div>
    )
}