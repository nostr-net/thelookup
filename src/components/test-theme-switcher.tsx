import { Button } from "@/components/ui/button";
import { loadTweakcnTheme } from "@/lib/theme-manager";

export function TestThemeSwitcher() {
  return (
    <div className="flex gap-2 p-4">
      <Button 
        onClick={() => loadTweakcnTheme('default', 'light')}
        variant="outline"
      >
        Default Light
      </Button>
      <Button 
        onClick={() => loadTweakcnTheme('default', 'dark')}
        variant="outline"
      >
        Default Dark
      </Button>
      <Button 
        onClick={() => loadTweakcnTheme('cmh82wf67000h04jr3azxcy1u', 'light')}
        variant="outline"
      >
        Tweakcn Theme (Light)
      </Button>
      <Button 
        onClick={() => loadTweakcnTheme('cmh82wf67000h04jr3azxcy1u', 'dark')}
        variant="outline"
      >
        Tweakcn Theme (Dark)
      </Button>
    </div>
  );
}
