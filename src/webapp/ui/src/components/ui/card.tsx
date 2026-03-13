import * as React from "react"

import { cn } from "@/lib/utils"

type CardElevation = "flat" | "raised" | "outlined";
type CardTone = "default" | "info" | "warning" | "error" | "success";

const elevationClasses: Record<CardElevation, string> = {
  flat: "border-transparent shadow-none",
  raised: "border-transparent shadow-md",
  outlined: "border shadow-none",
};

const toneClasses: Record<CardTone, string> = {
  default: "bg-card text-card-foreground",
  info: "bg-info/10 border-info/30 text-card-foreground",
  warning: "bg-warning/10 border-warning/30 text-card-foreground",
  error: "bg-destructive/10 border-destructive/30 text-card-foreground",
  success: "bg-success/10 border-success/30 text-card-foreground",
};

interface CardProps extends React.ComponentProps<"div"> {
  elevation?: CardElevation;
  tone?: CardTone;
  clickable?: boolean;
}

function Card({
  className,
  elevation = "outlined",
  tone = "default",
  clickable,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-elevation={elevation}
      data-tone={tone}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        "flex flex-col gap-6 rounded-xl py-6",
        elevationClasses[elevation],
        toneClasses[tone],
        clickable && "cursor-pointer transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
export type { CardElevation, CardTone, CardProps }
