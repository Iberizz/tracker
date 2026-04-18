import { useState } from "react";
import { UserProfile, PROFILE_STORAGE_KEY } from "@/types/profile";

type GenerationStyle = "direct" | "soft" | "premium";
type GenerationFormat = "email" | "short_message" | "cover_letter";

function loadProfile(): Partial<UserProfile> | undefined {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function useGenerator() {
  const [jobInput, setJobInput] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<GenerationStyle>("direct");
  const [format, setFormat] = useState<GenerationFormat>("email");
  const [error, setError] = useState<string | null>(null);

  // backward compat alias
  const result = variants[0] ?? "";

  const generate = async () => {
    if (!jobInput.trim()) return;
    setLoading(true);
    setVariants([]);
    setError(null);

    try {
      const profile = loadProfile();

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: [{ title: jobInput, company: "", description: jobInput }],
          style,
          format,
          ...(profile ? { profile } : {}),
        }),
      });

      const data = await res.json();
      const raw = data?.results?.[0]?.variants ?? [];

      const parsed: string[] = raw.map((v: unknown) =>
        typeof v === "object" && v !== null
          ? Object.values(v as object)
              .map(String)
              .join("\n\n")
          : String(v),
      );

      if (parsed.length === 0) {
        setError("Aucun résultat");
        return;
      }

      setVariants(parsed);
    } catch (err) {
      console.error(err);
      setError("Erreur génération");
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async (message: string) => {
    await navigator.clipboard.writeText(message);
  };

  return {
    jobInput,
    setJobInput,
    result, // backward compat
    variants,
    loading,
    style,
    setStyle,
    format,
    setFormat,
    error,
    generate,
    copyMessage,
  };
}
