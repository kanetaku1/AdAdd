"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/**
 * Click-to-edit text (spec/frontend.md UI Principle 4). Saves on blur or Enter
 * (Ctrl/Cmd+Enter when multiline). Escape cancels.
 */
export function EditableTextField({
  value,
  onChange,
  disabled,
  display,
  placeholder = "-",
  multiline = false,
  className,
  "aria-label": ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  display?: ReactNode
  placeholder?: string
  multiline?: boolean
  className?: string
  "aria-label"?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    if (multiline) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    } else {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, multiline])

  function startEditing() {
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const next = draft.trim() === value.trim() ? value : draft
    if (next === value) return
    onChange(next)
  }

  if (editing) {
    if (multiline) {
      return (
        <Textarea
          ref={textareaRef}
          aria-label={ariaLabel}
          className={cn("min-h-20", className)}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              commit()
            }
            if (e.key === "Escape") setEditing(false)
          }}
        />
      )
    }
    return (
      <Input
        ref={inputRef}
        aria-label={ariaLabel}
        className={className}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          }
          if (e.key === "Escape") setEditing(false)
        }}
      />
    )
  }

  const shown = display ?? (value ? value : placeholder)

  if (disabled) {
    return (
      <div className={cn("min-h-6 break-all", className)} aria-label={ariaLabel}>
        {shown}
      </div>
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel ? `${ariaLabel}（編集）` : "編集"}
      title="クリックして編集"
      className={cn(
        "min-h-6 w-full rounded-md px-1 py-0.5 text-left break-all hover:bg-muted",
        !value && "text-muted-foreground",
        className
      )}
      onClick={startEditing}
    >
      {shown}
    </button>
  )
}
