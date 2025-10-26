import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Palette, Sun } from "lucide-react";
import { useTweakcnTheme } from "@/hooks/useTweakcnTheme";

export function ThemeSwitcher() {
  const { 
    currentTheme, 
    isDark, 
    switchTheme, 
    toggleMode, 
    getAvailableThemes 
  } = useTweakcnTheme();

  const availableThemes = getAvailableThemes();

  return (
    <div className="flex items-center gap-2">
      {/* Theme Mode Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleMode}
        className="h-9 w-9"
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle theme mode</span>
      </Button>

      {/* Theme Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="capitalize">{currentTheme}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableThemes.map((theme) => (
            <DropdownMenuItem
              key={theme}
              onClick={() => switchTheme(theme)}
              className="capitalize cursor-pointer"
            >
              {theme}
              {currentTheme === theme && (
                <span className="ml-auto text-xs text-muted-foreground">
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
