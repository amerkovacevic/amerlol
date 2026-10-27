"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function StyleguideContent() {
  return (
    <main id="main" className="container mx-auto px-4 py-20">
      <div className="animate-enter max-w-4xl mx-auto space-y-16">
        <div>
          <h1 className="font-space-grotesk text-4xl md:text-5xl font-bold mb-4">Styleguide</h1>
          <p className="text-muted-foreground text-lg">Design system components and patterns</p>
        </div>

        <section aria-labelledby="interaction-patterns">
          <h2 id="interaction-patterns" className="font-space-grotesk text-3xl font-bold mb-6">
            Interaction patterns
          </h2>
          <Card>
            <CardContent className="p-6 space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">One page title.</strong> The app shell owns the app name
                and description. Use task-specific headings inside each app, followed by the shared Overview
                and Settings navigation.
              </p>
              <p>
                <strong className="text-foreground">Consistent controls.</strong> Use shared buttons, fields,
                cards, tabs, and semantic color tokens. Keep app accents for decoration and use text or icons
                alongside status colors.
              </p>
              <p>
                <strong className="text-foreground">Accessible interaction.</strong> Name every field and icon
                button. Preserve keyboard focus, respect reduced motion, wrap controls on narrow screens, and
                keep long dialogs scrollable.
              </p>
              <p>
                <strong className="text-foreground">Helpful account reminders.</strong> Show a quiet,
                actionable reminder to guests explaining the benefit of signing in. Hide it for signed-in
                accounts and keep the main task available.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="font-space-grotesk text-3xl font-bold mb-6">Typography</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="font-space-grotesk text-4xl font-bold mb-2">Heading 1 (Space Grotesk)</p>
                <h2 className="font-space-grotesk text-3xl font-bold mb-2">Heading 2 (Space Grotesk)</h2>
                <h3 className="font-space-grotesk text-2xl font-bold mb-2">Heading 3 (Space Grotesk)</h3>
                <p className="text-base mb-2">
                  Body text (Inter) - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
                <p className="text-sm text-muted-foreground">
                  Small text (Inter) - Used for secondary information
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="font-space-grotesk text-3xl font-bold mb-6">Buttons</h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button onClick={() => toast.success("Toast demo!")}>Show Toast</Button>
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="font-space-grotesk text-3xl font-bold mb-6">Badges</h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="font-space-grotesk text-3xl font-bold mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card content area with some example text.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Another Card</CardTitle>
                <CardDescription>With different content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cards are versatile components for displaying content.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="font-space-grotesk text-3xl font-bold mb-6">Forms</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="example-input">Example Input</Label>
                  <Input id="example-input" placeholder="Enter text..." />
                </div>
                <div>
                  <Label htmlFor="example-disabled">Disabled Input</Label>
                  <Input id="example-disabled" disabled placeholder="Disabled..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="font-space-grotesk text-3xl font-bold mb-6">Motion</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-card cursor-pointer transition-transform motion-safe:hover:scale-105 motion-safe:active:scale-95">
                  Hover me (scale)
                </div>
                <div className="animate-enter p-4 rounded-lg border bg-card">
                  Entrance (.animate-enter, CSS only)
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
