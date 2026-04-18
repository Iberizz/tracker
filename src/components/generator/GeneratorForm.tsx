'use client'


import {useGenerator} from "@/components/generator/useGenerator";

export default function GeneratorForm() {
    const { jobInput, setJobInput, result, loading, style, setStyle, generate, copyMessage } = useGenerator()

    return (
        <div className="page">
            <div className="topbar">
                <span className="page-title">Lettres de motivation</span>
            </div>

            <div className="page-content" style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 12 }}>

                <div className="gen-card">
                    <label className="nav-label">Offre — colle le texte ou la description</label>
                    <textarea
                        value={jobInput}
                        onChange={(e) => setJobInput(e.target.value)}
                        placeholder="Développeur React Senior | Startup SaaS | Mission Next.js..."
                        className="gen-textarea"
                    />
                </div>

                <div className="gen-card" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <span className="nav-label" style={{ margin: 0, minWidth: 80 }}>Style</span>
                    <div style={{ display: "flex", gap: 6 }}>
                        {(["direct", "soft", "premium"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStyle(s)}
                                className={`btn ${style === s ? "btn-primary" : "btn-ghost"}`}
                                style={{ textTransform: "capitalize" }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={generate}
                    disabled={loading || !jobInput.trim()}
                    className="btn btn-primary"
                    style={{ height: 40, fontSize: 12, opacity: loading || !jobInput.trim() ? 0.4 : 1 }}
                >
                    {loading ? "Génération en cours..." : "→ Générer la candidature"}
                </button>

                {result && (
                    <div className="gen-card" style={{ gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="nav-label" style={{ margin: 0 }}>Résultat</span>
                            <button className="btn btn-ghost" onClick={() => copyMessage(result)}>Copier</button>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                            {result}
                        </p>
                    </div>
                )}

            </div>
        </div>
    )
}