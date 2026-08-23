"use client"

import { Button, type buttonVariants } from "@/components/ui/button"
import { DialogTrigger } from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

type ButtonProps = ComponentProps<typeof Button>
type ButtonVariant = VariantProps<typeof buttonVariants>["variant"]
type ButtonSize = VariantProps<typeof buttonVariants>["size"]

/**
 * Row/toolbar action as an icon + tooltip (spec/frontend.md Principle 5).
 * `label` is both the tooltip and the accessible name — never rely on
 * visible text on list-table actions.
 */
export function IconActionButton({
  label,
  children,
  variant = "ghost",
  size = "icon-sm",
  className,
  ...props
}: Omit<ButtonProps, "size" | "children"> & {
  label: string
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size={size}
            aria-label={label}
            className={cn(className)}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Same icon+tooltip action, composed as a DialogTrigger so the dialog
 * open handler lands on the button rather than the Tooltip root.
 */
export function IconActionDialogTrigger({
  label,
  children,
  variant = "outline",
  size = "icon-sm",
}: {
  label: string
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <DialogTrigger
            render={
              <Button size={size} variant={variant} aria-label={label} />
            }
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
