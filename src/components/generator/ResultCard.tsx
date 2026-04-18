'use client'

type Props = {
    result: string
    index: number
    copiedIndex: number | null
    copyMessage: (message: string, index: number) => void
}

export default function ResultCard({
                                       result,
                                       index,
                                       copiedIndex,
                                       copyMessage,
                                   }: Props) {
    const isCopied = copiedIndex === index

    return (
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 space-y-4">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm text-gray-400">
                    Candidature #{index + 1}
                </h3>

                <button
                    onClick={() => copyMessage(result, index)}
                    className="text-xs px-3 py-1.5 rounded-md bg-[#060B16] border border-[#1F2937] hover:bg-slate-800 transition"
                >
                    {isCopied ? "Copié ✓" : "Copier"}
                </button>
            </div>

            {/* CONTENT */}
            <div className="bg-[#060B16] border border-[#1F2937] rounded-xl p-4">
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {result}
                </p>
            </div>

        </div>
    )
}