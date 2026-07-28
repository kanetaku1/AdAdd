"use client"

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"
import { ListFilter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FilterPanelContext = createContext<(() => void) | null>(null)

type ColumnFilterTriggerProps = {
  label?: string
  icon?: ReactNode
  active?: boolean
  open?: boolean
  onToggle: () => void
}

export function ColumnFilterTrigger({
  label,
  icon,
  active = false,
  open = false,
  onToggle,
}: ColumnFilterTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-sm transition-colors hover:bg-muted",
        (active || open) && "border-primary/40 bg-primary/5 text-primary"
      )}
      onClick={onToggle}
    >
      {icon}
      {label ? <span>{label}</span> : null}
      <ListFilter
        className={cn(
          "size-3.5 shrink-0",
          active || open ? "text-primary" : "text-muted-foreground"
        )}
      />
    </button>
  )
}

type ColumnFilterPopoverProps = {
  label?: string
  icon?: ReactNode
  active?: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
  children: React.ReactNode
}

/** Filter trigger with a vertically stacked popup panel below. */
export function ColumnFilterPopover({
  label,
  icon,
  active = false,
  open,
  onToggle,
  onClose,
  children,
}: ColumnFilterPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open, onClose])

  return (
    <FilterPanelContext.Provider value={onClose}>
      <div ref={rootRef} className="relative">
        <ColumnFilterTrigger
          label={label}
          icon={icon}
          active={active}
          open={open}
          onToggle={onToggle}
        />
        {open && (
          <div className="absolute top-full left-0 z-30 mt-1 max-h-64 min-w-44 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            <ColumnFilterOptions>{children}</ColumnFilterOptions>
          </div>
        )}
      </div>
    </FilterPanelContext.Provider>
  )
}

type ColumnFilterOptionsProps = {
  children: React.ReactNode
}

export function ColumnFilterOptions({ children }: ColumnFilterOptionsProps) {
  return <div className="flex flex-col gap-0.5">{children}</div>
}

type ColumnFilterOptionProps = {
  selected?: boolean
  onSelect: () => void
  children: React.ReactNode
}

export function ColumnFilterOption({
  selected = false,
  onSelect,
  children,
}: ColumnFilterOptionProps) {
  const close = useContext(FilterPanelContext)

  return (
    <Button
      type="button"
      variant={selected ? "secondary" : "ghost"}
      size="sm"
      className="h-8 w-full justify-start font-normal"
      onClick={() => {
        onSelect()
        close?.()
      }}
    >
      {children}
    </Button>
  )
}
