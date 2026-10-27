"use client"

import * as React from "react"
import { Copy, Download, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { useAppSettings } from "@/components/apps/settings-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { calculateTextDiff, type DiffLine } from "@/lib/apps/text-diff"
import { copyText, downloadText } from "@/lib/browser"

const ACCEPTED_FILES = ".txt,.md,.js,.ts,.tsx,.jsx,.json,.css,.html"
const MAX_FILE_BYTES = 5 * 1024 * 1024

const LINE_STYLES: Record<DiffLine["type"], { prefix: string; className: string }> = {
  insert: { prefix: "+", className: "border-l-4 border-green-500 bg-green-500/20 dark:bg-green-500/30" },
  delete: { prefix: "-", className: "border-l-4 border-red-500 bg-red-500/20 dark:bg-red-500/30" },
  equal: { prefix: " ", className: "bg-transparent" },
}

export function DiffChecker() {
  const settings = useAppSettings("diffchecker")
  const [originalText, setOriginalText] = React.useState("")
  const [changedText, setChangedText] = React.useState("")
  const [diffResult, setDiffResult] = React.useState<DiffLine[] | null>(null)

  const findDifference = () => {
    if (!originalText && !changedText) {
      toast.error("Please enter text in at least one field")
      return
    }
    try {
      setDiffResult(calculateTextDiff(originalText, changedText, settings))
      toast.success("Difference calculated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comparison failed")
    }
  }

  const clearAll = () => {
    setOriginalText("")
    setChangedText("")
    setDiffResult(null)
  }

  const downloadDiff = () => {
    if (!diffResult) return
    downloadText(
      diffResult.map((line) => `${LINE_STYLES[line.type].prefix} ${line.content}`).join("\n"),
      "diff-result.txt"
    )
    toast.success("Diff result downloaded")
  }

  if (diffResult) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Diff Result</CardTitle>
              <CardDescription>Green lines are additions, red lines are deletions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadDiff}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDiffResult(null)}>
                <X className="mr-2 h-4 w-4" />
                Back to Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-auto rounded-lg border bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap font-mono" style={{ fontSize: settings.fontSize }}>
              {diffResult.map((line, index) => (
                <div key={index} className={`px-2 py-1 ${LINE_STYLES[line.type].className}`}>
                  <span className="mr-2 select-none text-muted-foreground">
                    {LINE_STYLES[line.type].prefix}
                  </span>
                  {settings.showLineNumbers && (
                    <span className="mr-4 inline-block w-10 select-none text-muted-foreground">
                      {line.lineNumber}
                    </span>
                  )}
                  <span>{line.content || " "}</span>
                </div>
              ))}
            </pre>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TextPanel
          name="original"
          title="Original Text"
          description="Enter or paste the original text"
          value={originalText}
          onChange={setOriginalText}
          fontSize={settings.fontSize}
        />
        <TextPanel
          name="changed"
          title="Changed Text"
          description="Enter or paste the modified text"
          value={changedText}
          onChange={setChangedText}
          fontSize={settings.fontSize}
        />
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={findDifference} size="lg" className="min-w-[200px]">
          Find Difference
        </Button>
        <Button onClick={clearAll} variant="outline" size="lg">
          <X className="mr-2 h-4 w-4" />
          Clear All
        </Button>
      </div>
    </div>
  )
}

function TextPanel({
  name,
  title,
  description,
  value,
  onChange,
  fontSize,
}: {
  name: "original" | "changed"
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  fontSize: number
}) {
  const loadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Files must be smaller than 5 MB")
      return
    }
    try {
      onChange(await file.text())
      toast.success("File loaded successfully")
    } catch {
      toast.error("That file could not be read")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative flex cursor-pointer items-center rounded-sm p-2 focus-within:ring-2 focus-within:ring-ring">
              <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              <input
                type="file"
                accept={ACCEPTED_FILES}
                className="absolute inset-0 w-full cursor-pointer opacity-0"
                aria-label={`Upload ${name} text file`}
                onChange={loadFile}
              />
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`Copy ${name} text`}
              onClick={() => copyText(value, `${title} copied to clipboard`)}
              disabled={!value}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${name} text`}
          placeholder={`Enter ${name} text here...`}
          className="min-h-[400px] font-mono"
          style={{ fontSize }}
        />
      </CardContent>
    </Card>
  )
}
