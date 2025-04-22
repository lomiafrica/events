"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button, ButtonProps } from "./button"

export function ThemeToggle({ variant = "outline", size = "icon", className, ...props }: ButtonProps) {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      {...props}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

