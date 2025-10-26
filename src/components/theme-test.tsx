import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ThemeTest() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Theme Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Primary Colors</CardTitle>
            <CardDescription>Testing primary color scheme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="default">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Background & Text</CardTitle>
            <CardDescription>Testing background and foreground colors</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">This is foreground text</p>
            <p className="text-muted-foreground">This is muted foreground text</p>
            <div className="bg-accent p-2 rounded mt-2">
              <p className="text-accent-foreground">Accent background with text</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Color Variables Test</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="bg-primary text-primary-foreground p-2 rounded">Primary</div>
          <div className="bg-secondary text-secondary-foreground p-2 rounded">Secondary</div>
          <div className="bg-accent text-accent-foreground p-2 rounded">Accent</div>
          <div className="bg-muted text-muted-foreground p-2 rounded">Muted</div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          If you can see different colors and the theme looks styled (not just white), 
          then the tweakcn theme is working! Try toggling dark mode to see both variants.
        </p>
      </div>
    </div>
  );
}
