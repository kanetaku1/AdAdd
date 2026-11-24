"use client"

const DATA_CATEGORIES = [
    { value: "素材", label: "素材" },
    { value: "仮完成", label: "仮完成" },
    { value: "完成", label: "完成" },
] as const

export type DataCategory = (typeof DATA_CATEGORIES)[number]["value"]

export function DataCategorySelector({
    value,
    onChange,
}: {
    value: DataCategory | null
    onChange: (category: DataCategory) => void
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">データ区分</label>
            <div className="flex gap-1">
                {DATA_CATEGORIES.map((cat) => (
                    <button
                        key={cat.value}
                        type="button"
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                            value === cat.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border"
                        }`}
                        onClick={() => onChange(cat.value)}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
