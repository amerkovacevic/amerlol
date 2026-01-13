"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function StyleguideContent() {
  return (
    <main className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto space-y-16"
      >
        <div>
          <h1 className="font-space-grotesk text-4xl md:text-5xl font-bold mb-4">
            Styleguide
          </h1>
          <p className="text-muted-foreground text-lg">
            Design system components and patterns
          </p>
        </div>

        <section>
          <h2 className="font-space-grotesk text-3xl font-bold mb-6">Typography</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h1 className="font-space-grotesk text-4xl font-bold mb-2">
                  Heading 1 (Space Grotesk)
                </h1>
                <h2 className="font-space-grotesk text-3xl font-bold mb-2">
                  Heading 2 (Space Grotesk)
                </h2>
                <h3 className="font-space-grotesk text-2xl font-bold mb-2">
                  Heading 3 (Space Grotesk)
                </h3>
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
                <Button
                  onClick={() => toast.success("Toast demo!")}
                >
                  Show Toast
                </Button>
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
                <p className="text-sm text-muted-foreground">
                  Card content area with some example text.
                </p>
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
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 rounded-lg border bg-card cursor-pointer"
                >
                  Hover me (scale)
                </motion.div>
                <motion.div
                  animate={{
                    x: [0, 20, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="p-4 rounded-lg border bg-card"
                >
                  Animated (slide)
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </section>
      </motion.div>
    </main>
  )
}