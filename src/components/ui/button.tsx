import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
          variant === "secondary" && "bg-muted text-foreground hover:bg-muted/80",
          variant === "ghost" && "hover:bg-muted text-foreground",
          variant === "destructive" && "bg-destructive text-white hover:opacity-90",
          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-9 px-4 text-sm",
          size === "lg" && "h-10 px-5",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
