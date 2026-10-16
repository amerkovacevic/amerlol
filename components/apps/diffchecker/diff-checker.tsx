"use client"

import * as React from "react"
import { useAppSettings } from "@/components/apps/settings-provider"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Copy, Download, Upload, X, Check } from "lucide-react"
import { calculateTextDiff } from "@/lib/apps/text-diff"
import { toast } from "sonner"

interface DiffLine {
  type: "equal" | "insert" | "delete"
  content: string
  lineNumber?: number
}

export function DiffChecker() {
  const settings = useAppSettings("diffchecker")
  const [originalText, setOriginalText] = React.useState("")
  const [changedText, setChangedText] = React.useState("")
  const [diffResult, setDiffResult] = React.useState<DiffLine[]>([])
  const [showDiff, setShowDiff] = React.useState(false)

  const handleFindDifference = () => {
    if (!originalText && !changedText) {
      toast.error("Please enter text in at least one field")
      return
    }

    let diff: DiffLine[]
    try { diff = calculateTextDiff(originalText, changedText, settings) } catch (error) { toast.error(error instanceof Error ? error.message : "Comparison failed"); return }
    setDiffResult(diff)
    setShowDiff(true)
    toast.success("Difference calculated")
  }

  const handleClear = () => {
    setOriginalText("")
    setChangedText("")
    setDiffResult([])
    setShowDiff(false)
  }

  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(originalText)
    toast.success("Original text copied to clipboard")
  }

  const handleCopyChanged = () => {
    navigator.clipboard.writeText(changedText)
    toast.success("Changed text copied to clipboard")
  }

  const handleDownloadDiff = () => {
    const diffText = diffResult
      .map((line) => {
        const prefix = line.type === "insert" ? "+" : line.type === "delete" ? "-" : " "
        return `${prefix} ${line.content}`
      })
      .join("\n")

    const blob = new Blob([diffText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "diff-result.txt"
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Diff result downloaded")
  }

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "original" | "changed"
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (type === "original") {
        setOriginalText(content)
      } else {
        setChangedText(content)
      }
      toast.success("File loaded successfully")
    }
    reader.readAsText(file)
  }

  const getLineClassName = (type: DiffLine["type"]) => {
    switch (type) {
      case "insert":
        return "bg-green-500/20 dark:bg-green-500/30 border-l-4 border-green-500"
      case "delete":
        return "bg-red-500/20 dark:bg-red-500/30 border-l-4 border-red-500"
      default:
        return "bg-transparent"
    }
  }

  const getLinePrefix = (type: DiffLine["type"]) => {
    switch (type) {
      case "insert":
        return "+"
      case "delete":
        return "-"
      default:
        return " "
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
{!showDiff ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Text */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Original Text</CardTitle>
                  <CardDescription>Enter or paste the original text</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative cursor-pointer flex items-center rounded-sm p-2 focus-within:ring-2 focus-within:ring-ring">
                    <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <input
                      type="file"
                      accept=".txt,.md,.js,.ts,.tsx,.jsx,.json,.css,.html"
                      className="absolute inset-0 w-full cursor-pointer opacity-0"
                      aria-label="Upload original text file"
                      onChange={(e) => handleFileUpload(e, "original")}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Copy original text"
                    onClick={handleCopyOriginal}
                    disabled={!originalText}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                aria-label="original text" placeholder="Enter original text here..."
                className="min-h-[400px] font-mono text-sm" style={{ fontSize: settings.fontSize }}
              />
            </CardContent>
          </Card>

          {/* Changed Text */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Changed Text</CardTitle>
                  <CardDescription>Enter or paste the modified text</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative cursor-pointer flex items-center rounded-sm p-2 focus-within:ring-2 focus-within:ring-ring">
                    <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <input
                      type="file"
                      accept=".txt,.md,.js,.ts,.tsx,.jsx,.json,.css,.html"
                      className="absolute inset-0 w-full cursor-pointer opacity-0"
                      aria-label="Upload changed text file"
                      onChange={(e) => handleFileUpload(e, "changed")}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Copy changed text"
                    onClick={handleCopyChanged}
                    disabled={!changedText}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={changedText}
                onChange={(e) => setChangedText(e.target.value)}
                aria-label="changed text" placeholder="Enter changed text here..."
                className="min-h-[400px] font-mono text-sm" style={{ fontSize: settings.fontSize }}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Diff Result</CardTitle>
                <CardDescription>
                  Green lines are additions, red lines are deletions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadDiff}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDiff(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Back to Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/50 p-4 overflow-auto max-h-[600px]">
              <pre className="font-mono text-sm whitespace-pre-wrap" style={{ fontSize: settings.fontSize }}>
                {diffResult.map((line, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 ${getLineClassName(line.type)}`}
                  >
                    <span className="text-muted-foreground mr-2 select-none">
                      {getLinePrefix(line.type)}
                    </span>
                    {settings.showLineNumbers && <span className="mr-4 inline-block w-10 select-none text-muted-foreground">{line.lineNumber}</span>}<span>{line.content || " "}</span>
                  </div>
                ))}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {!showDiff && (
        <div className="flex gap-4 justify-center">
          <Button onClick={handleFindDifference} size="lg" className="min-w-[200px]">
            Find Difference
          </Button>
          <Button onClick={handleClear} variant="outline" size="lg">
            <X className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      )}
    </motion.div>
  )
}
