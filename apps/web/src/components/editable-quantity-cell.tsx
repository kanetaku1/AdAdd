"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Inline-editable quantity cell (spec/frontend.md UI Principle 4;
 * Contract Menu List / Yearly Company Detail). Click-to-edit number;
 * saves on blur or Enter. Values <= 0 are rejected locally.
 * Dashed border + pencil mark that the cell is editable at rest.
 */
export function EditableQuantityCell({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(String(value))
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  function commit() {
    const next = Number(draft)
    setEditing(false)
    if (!Number.isFinite(next) || next <= 0 || next === value) return
    onChange(Math.floor(next))
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        min={1}
        className="h-8 w-16"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          }
          if (e.key === "Escape") {
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      title={disabled ? undefined : "クリックして編集"}
      aria-label={`数量 ${value}${disabled ? "" : "（編集）"}`}
      className={cn(
        "inline-flex h-8 min-w-12 items-center justify-between gap-1.5 rounded-md border border-dashed px-2 text-sm",
        disabled
          ? "cursor-default border-transparent opacity-50"
          : "cursor-pointer border-muted-foreground/35 text-foreground hover:border-foreground/50 hover:bg-muted"
      )}
      disabled={disabled}
      onClick={() => {
        if (!disabled) setEditing(true)
      }}
    >
      <span>{value}</span>
      {!disabled && (
        <Pencil
          className="size-3 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </button>
  )
}
