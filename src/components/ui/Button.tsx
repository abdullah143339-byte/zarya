"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-gradient-primary text-white hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] focus:ring-primary":
              variant === "primary",
            "glass border border-border hover:bg-surface text-foreground hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]":
              variant === "secondary",
            "hover:bg-surface text-foreground hover:text-primary":
              variant === "ghost",
            "bg-gradient-to-r from-accent to-primary text-white hover:shadow-lg hover:shadow-accent/25 hover:scale-[1.02] active:scale-[0.98]":
              variant === "accent",
            "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20":
              variant === "danger",
          },
          {
            "h-8 px-3 text-xs gap-1.5": size === "sm",
            "h-10 px-5 text-sm gap-2": size === "md",
            "h-12 px-8 text-base gap-2.5": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
