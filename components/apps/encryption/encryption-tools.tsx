"use client"

import * as React from "react"
import { Copy } from "lucide-react"
import { useAppSettings } from "@/components/apps/settings-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { AppSettings } from "@/lib/apps/settings"
import * as codecs from "@/lib/apps/codecs"
import { copyText } from "@/lib/browser"
import { useResettableState } from "@/lib/hooks/use-resettable-state"

type ToolId = AppSettings<"encryption">["defaultTab"]
type Mode = codecs.CodecMode

interface Tool {
  id: ToolId
  tab: string
  title: string
  description: string
  /** Tools without modes (hashes, ROT13) always run the same transformation. */
  reversible: boolean
  placeholder: Record<Mode, string>
  run: (input: string, mode: Mode, shift: number) => string | Promise<string>
}

const textPlaceholder = "Enter text to encode..."

const TOOLS: Tool[] = [
  {
    id: "base64",
    tab: "Base64",
    title: "Base64 Encode/Decode",
    description: "Encode text to Base64 or decode Base64 to text",
    reversible: true,
    placeholder: { encode: textPlaceholder, decode: "Enter Base64 to decode..." },
    run: (input, mode) => codecs.base64(input, mode),
  },
  {
    id: "url",
    tab: "URL",
    title: "URL Encode/Decode",
    description: "Encode text to URL encoding or decode URL-encoded text",
    reversible: true,
    placeholder: { encode: textPlaceholder, decode: "Enter URL-encoded text..." },
    run: (input, mode) => codecs.url(input, mode),
  },
  {
    id: "hex",
    tab: "Hex",
    title: "Hex Encode/Decode",
    description: "Encode text to hexadecimal UTF-8 bytes or decode hex to text",
    reversible: true,
    placeholder: { encode: textPlaceholder, decode: "Enter hex string..." },
    run: (input, mode) => codecs.hex(input, mode),
  },
  {
    id: "binary",
    tab: "Binary",
    title: "Binary Encode/Decode",
    description: "Encode text to binary UTF-8 bytes or decode binary to text",
    reversible: true,
    placeholder: { encode: textPlaceholder, decode: "Enter binary string..." },
    run: (input, mode) => codecs.binary(input, mode),
  },
  {
    id: "ascii",
    tab: "ASCII",
    title: "ASCII Encode/Decode",
    description: "Encode text to character codes or decode character codes to text",
    reversible: true,
    placeholder: { encode: textPlaceholder, decode: "Enter ASCII codes (space-separated)..." },
    run: (input, mode) => codecs.characterCodes(input, mode),
  },
  {
    id: "caesar",
    tab: "Caesar",
    title: "Caesar Cipher",
    description: "Encrypt or decrypt text using a Caesar cipher with a custom shift value",
    reversible: true,
    placeholder: { encode: "Enter text to encrypt...", decode: "Enter text to decrypt..." },
    run: (input, mode, shift) => codecs.caesar(input, mode, shift),
  },
  {
    id: "rot13",
    tab: "ROT13",
    title: "ROT13 Cipher",
    description: "Rotate letters 13 positions in the alphabet (encode and decode are the same)",
    reversible: false,
    placeholder: { encode: "Enter text to encode/decode...", decode: "Enter text to encode/decode..." },
    run: (input) => codecs.rot13(input),
  },
  {
    id: "morse",
    tab: "Morse",
    title: "Morse Code",
    description: "Encode text to Morse code or decode Morse code to text",
    reversible: true,
    placeholder: { encode: textPlaceholder, decode: "Enter Morse code (use / to separate words)..." },
    run: (input, mode) => codecs.morse(input, mode),
  },
  {
    id: "md5",
    tab: "MD5",
    title: "MD5 Hash",
    description: "Generate MD5 hash of text (one-way hashing)",
    reversible: false,
    placeholder: { encode: "Enter text to hash...", decode: "Enter text to hash..." },
    run: (input) => codecs.md5Hash(input),
  },
  {
    id: "sha256",
    tab: "SHA-256",
    title: "SHA-256 Hash",
    description: "Generate SHA-256 hash of text (one-way hashing)",
    reversible: false,
    placeholder: { encode: "Enter text to hash...", decode: "Enter text to hash..." },
    run: (input) => codecs.sha256Hash(input),
  },
]

interface ToolState {
  input: string
  output: string
  error: string
  mode: Mode
}

const EMPTY_TOOL: ToolState = { input: "", output: "", error: "", mode: "encode" }

export function EncryptionTools() {
  const settings = useAppSettings("encryption")
  // Follows the saved default tool until the user picks another tab.
  const [activeTool, setActiveTool] = useResettableState<ToolId>(settings.defaultTab, settings.defaultTab)
  const [tools, setTools] = React.useState<Partial<Record<ToolId, ToolState>>>({})
  const [caesarShift, setCaesarShift] = React.useState(13)
  // Async hashes can resolve out of order; only the latest request per tool may write.
  const latestRun = React.useRef<Partial<Record<ToolId, number>>>({})

  const update = (id: ToolId, patch: Partial<ToolState>) =>
    setTools((current) => ({ ...current, [id]: { ...EMPTY_TOOL, ...current[id], ...patch } }))

  const convert = async (tool: Tool, input: string, mode: Mode, shift = caesarShift) => {
    const run = (latestRun.current[tool.id] ?? 0) + 1
    latestRun.current[tool.id] = run
    let result: Pick<ToolState, "output" | "error">
    try {
      result = { output: input ? await tool.run(input, mode, shift) : "", error: "" }
    } catch (error) {
      result = { output: "", error: error instanceof Error ? error.message : "That input could not be converted" }
    }
    if (latestRun.current[tool.id] === run) update(tool.id, result)
  }

  const edit = (tool: Tool, patch: Partial<Pick<ToolState, "input" | "mode">>, shift = caesarShift) => {
    const next = { ...EMPTY_TOOL, ...tools[tool.id], ...patch }
    update(tool.id, patch)
    if (settings.autoConvert) void convert(tool, next.input, next.mode, shift)
  }

  const changeTab = (value: string) => {
    setActiveTool(value as ToolId)
    if (settings.clearOnTabChange) {
      latestRun.current = {}
      setTools({})
    }
  }

  return (
    <Tabs value={activeTool} onValueChange={changeTab} className="w-full">
      <div className="space-y-2">
        {[TOOLS.slice(0, 5), TOOLS.slice(5)].map((row) => (
          <TabsList key={row[0].id} className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
            {row.map((tool) => (
              <TabsTrigger key={tool.id} value={tool.id}>
                {tool.tab}
              </TabsTrigger>
            ))}
          </TabsList>
        ))}
      </div>

      {TOOLS.map((tool) => {
        const state = tools[tool.id] ?? EMPTY_TOOL
        const textStyle = { fontSize: `${settings.fontSize}px` }
        return (
          <TabsContent key={tool.id} value={tool.id} className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle>{tool.title}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </div>
                  {tool.reversible && (
                    <div className="flex gap-2" role="group" aria-label={`${tool.tab} direction`}>
                      {(["encode", "decode"] as const).map((mode) => (
                        <Button
                          key={mode}
                          size="sm"
                          variant={state.mode === mode ? "default" : "outline"}
                          aria-pressed={state.mode === mode}
                          onClick={() => edit(tool, { mode })}
                          className="capitalize"
                        >
                          {mode}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {tool.id === "caesar" && (
                  <div className="space-y-2">
                    <Label htmlFor="caesar-shift">Shift Value (1-25)</Label>
                    <Input
                      id="caesar-shift"
                      type="number"
                      min={1}
                      max={25}
                      value={caesarShift}
                      onChange={(event) => {
                        const shift = Math.max(1, Math.min(25, parseInt(event.target.value, 10) || 1))
                        setCaesarShift(shift)
                        edit(tool, {}, shift)
                      }}
                      className="w-32"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor={`${tool.id}-input`}>Input</Label>
                  <Textarea
                    id={`${tool.id}-input`}
                    placeholder={tool.placeholder[state.mode]}
                    value={state.input}
                    onChange={(event) => edit(tool, { input: event.target.value })}
                    className="min-h-[120px] font-mono"
                    style={textStyle}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => convert(tool, state.input, state.mode)} disabled={!state.input}>
                    Convert
                  </Button>
                  {state.output && (
                    <Button variant="outline" onClick={() => copyText(state.output, `${tool.tab} output copied`)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${tool.id}-output`}>Output</Label>
                  <Textarea
                    id={`${tool.id}-output`}
                    readOnly
                    value={state.output}
                    aria-invalid={Boolean(state.error)}
                    aria-describedby={state.error ? `${tool.id}-error` : undefined}
                    className="min-h-[120px] bg-muted font-mono"
                    style={textStyle}
                  />
                  {state.error && (
                    <p id={`${tool.id}-error`} role="alert" className="text-sm text-destructive">
                      {state.error}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
