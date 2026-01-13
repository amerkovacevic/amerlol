"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Copy, Download, Upload, X, Check } from "lucide-react"
import { toast } from "sonner"

interface DiffLine {
  type: "equal" | "insert" | "delete"
  content: string
  lineNumber?: number
}

export function DiffChecker() {
  const [originalText, setOriginalText] = React.useState("")
  const [changedText, setChangedText] = React.useState("")
  const [diffResult, setDiffResult] = React.useState<DiffLine[]>([])
  const [showDiff, setShowDiff] = React.useState(false)

  // Improved diff algorithm using Myers' algorithm approach
  const calculateDiff = React.useCallback((original: string, changed: string) => {
    const originalLines = original.split("\n")
    const changedLines = changed.split("\n")
    const result: DiffLine[] = []

    // Build a map of line positions for faster lookup
    const originalMap = new Map<string, number[]>()
    originalLines.forEach((line, index) => {
      if (!originalMap.has(line)) {
        originalMap.set(line, [])
      }
      originalMap.get(line)!.push(index)
    })

    const changedMap = new Map<string, number[]>()
    changedLines.forEach((line, index) => {
      if (!changedMap.has(line)) {
        changedMap.set(line, [])
      }
      changedMap.get(line)!.push(index)
    })

    // Find longest common subsequence using dynamic programming
    const m = originalLines.length
    const n = changedLines.length
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0))

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (originalLines[i - 1] === changedLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        }
      }
    }

    // Reconstruct the diff
    let i = m
    let j = n
    const diff: Array<{ type: "equal" | "insert" | "delete"; content: string; origLine?: number; changedLine?: number }> = []

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && originalLines[i - 1] === changedLines[j - 1]) {
        diff.unshift({
          type: "equal",
          content: originalLines[i - 1],
          origLine: i,
          changedLine: j,
        })
        i--
        j--
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({
          type: "insert",
          content: changedLines[j - 1],
          changedLine: j,
        })
        j--
      } else if (i > 0) {
        diff.unshift({
          type: "delete",
          content: originalLines[i - 1],
          origLine: i,
        })
        i--
      }
    }

    return diff.map((line) => ({
      type: line.type,
      content: line.content,
      lineNumber: line.type === "equal" ? line.origLine : line.type === "insert" ? line.changedLine : line.origLine,
    }))
  }, [])

  const handleFindDifference = () => {
    if (!originalText && !changedText) {
      toast.error("Please enter text in at least one field")
      return
    }

    const diff = calculateDiff(originalText, changedText)
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
      <div>
        <h2 className="text-2xl font-bold mb-2">Text Diff Checker</h2>
        <p className="text-muted-foreground">
          Compare two text files and find the differences between them
        </p>
      </div>

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
                  <label className="cursor-pointer flex items-center">
                    <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <input
                      type="file"
                      accept=".txt,.md,.js,.ts,.tsx,.jsx,.json,.css,.html"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "original")}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
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
                placeholder="Enter original text here..."
                className="min-h-[400px] font-mono text-sm"
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
                  <label className="cursor-pointer flex items-center">
                    <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <input
                      type="file"
                      accept=".txt,.md,.js,.ts,.tsx,.jsx,.json,.css,.html"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "changed")}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
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
                placeholder="Enter changed text here..."
                className="min-h-[400px] font-mono text-sm"
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
              <pre className="font-mono text-sm whitespace-pre-wrap">
                {diffResult.map((line, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 ${getLineClassName(line.type)}`}
                  >
                    <span className="text-muted-foreground mr-2 select-none">
                      {getLinePrefix(line.type)}
                    </span>
                    <span>{line.content || " "}</span>
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
