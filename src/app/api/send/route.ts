import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
    try {
        const { to, jobTitle, company, message } = await req.json()

        if (!to || !message) {
            return Response.json(
                { error: "Email et message requis." },
                { status: 400 }
            )
        }

        // ⚠️ sécurité (mode dev)
        if (to !== "ibnmg120@gmail.com") {
            return Response.json(
                {
                    error:
                        "Mode test : envoi autorisé uniquement vers ton email",
                },
                { status: 403 }
            )
        }

        // Extract subject
        const lines = message.split("\n")

        const subjectLine = lines.find((l: string) =>
            l.toLowerCase().startsWith("objet")
        )

        const subject = subjectLine
            ? subjectLine.replace(/objet\s*:/i, "").trim()
            : `Candidature freelance — ${jobTitle || company || "Mission"}`

        const body = lines
            .filter((l: string) => !l.toLowerCase().startsWith("objet"))
            .join("\n")
            .trim()

        const { data, error } = await resend.emails.send({
            from: "JobTracker <onboarding@resend.dev>",
            to,
            subject,
            text: body,
        })

        if (error) {
            return Response.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return Response.json({ success: true, data })

    } catch (error) {
        console.error("ERREUR RESEND:", error)

        return Response.json(
            { error: "Erreur serveur" },
            { status: 500 }
        )
    }
}