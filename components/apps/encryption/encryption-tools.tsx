"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import CryptoJS from "crypto-js"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { doc, getDoc } from "firebase/firestore"

// Morse Code mapping
const MORSE_CODE: Record<string, string> = {
  "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.",
  "G": "--.", "H": "....", "I": "..", "J": ".---", "K": "-.-", "L": ".-..",
  "M": "--", "N": "-.", "O": "---", "P": ".--.", "Q": "--.-", "R": ".-.",
  "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-",
  "Y": "-.--", "Z": "--..", "0": "-----", "1": ".----", "2": "..---",
  "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...",
  "8": "---..", "9": "----.", ".": ".-.-.-", ",": "--..--", "?": "..--..",
  "'": ".----.", "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-",
  "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.",
  "-": "-....-", "_": "..--.-", '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
  " ": "/"
}

const MORSE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_CODE).map(([k, v]) => [v, k])
)

interface CipherCardProps {
  title: string
  description: string
  inputValue: string
  outputValue: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  mode?: "encode" | "decode"
  onModeChange?: (mode: "encode" | "decode") => void
  onCopy: () => void
  onConvert: () => void
  placeholder: string
  fontSize: number
  children?: React.ReactNode
}

const CipherCard = ({
  title,
  description,
  inputValue,
  outputValue,
  onInputChange,
  mode,
  onModeChange,
  onCopy,
  onConvert,
  placeholder,
  fontSize,
  children,
}: CipherCardProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex gap-2">
          {mode !== undefined && onModeChange && (
            <>
              <Button
                variant={mode === "encode" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange("encode")}
              >
                Encode
              </Button>
              <Button
                variant={mode === "decode" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange("decode")}
              >
                Decode
              </Button>
            </>
          )}
          {children}
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label>Input</Label>
        <Textarea
          placeholder={placeholder}
          value={inputValue}
          onChange={onInputChange}
          className="font-mono min-h-[120px]"
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onConvert} disabled={!inputValue}>
          Convert
        </Button>
        {outputValue && (
          <Button variant="outline" onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Label>Output</Label>
        <Textarea
          readOnly
          value={outputValue}
          className="font-mono min-h-[120px] bg-muted"
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>
    </CardContent>
  </Card>
)

interface EncryptionSettings {
  autoConvert: boolean
  clearOnTabChange: boolean
  defaultTab: string
  fontSize: number
}

const DEFAULT_SETTINGS: EncryptionSettings = {
  autoConvert: true,
  clearOnTabChange: false,
  defaultTab: "base64",
  fontSize: 14,
}

export function EncryptionTools() {
  const { user } = useAuth()
  const [settings, setSettings] = React.useState<EncryptionSettings>(DEFAULT_SETTINGS)

  // Load settings from Firestore if authenticated, otherwise use defaults
  React.useEffect(() => {
    if (!user || !db) {
      setSettings(DEFAULT_SETTINGS)
      return
    }

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, "users", user.uid, "encryptionSettings", "default")
        const snapshot = await getDoc(settingsRef)
        if (snapshot.exists()) {
          const data = snapshot.data()
          setSettings({ ...DEFAULT_SETTINGS, ...data })
        } else {
          // No settings found, use defaults
          setSettings(DEFAULT_SETTINGS)
        }
      } catch (error) {
        console.error("Error loading settings:", error)
        setSettings(DEFAULT_SETTINGS)
      }
    }

    loadSettings()
  }, [user])

  // Base64
  const [base64Input, setBase64Input] = React.useState("")
  const [base64Output, setBase64Output] = React.useState("")
  const [base64Mode, setBase64Mode] = React.useState<"encode" | "decode">("encode")

  // URL
  const [urlInput, setUrlInput] = React.useState("")
  const [urlOutput, setUrlOutput] = React.useState("")
  const [urlMode, setUrlMode] = React.useState<"encode" | "decode">("encode")

  // Hex
  const [hexInput, setHexInput] = React.useState("")
  const [hexOutput, setHexOutput] = React.useState("")
  const [hexMode, setHexMode] = React.useState<"encode" | "decode">("encode")

  // Binary
  const [binaryInput, setBinaryInput] = React.useState("")
  const [binaryOutput, setBinaryOutput] = React.useState("")
  const [binaryMode, setBinaryMode] = React.useState<"encode" | "decode">("encode")

  // ASCII
  const [asciiInput, setAsciiInput] = React.useState("")
  const [asciiOutput, setAsciiOutput] = React.useState("")
  const [asciiMode, setAsciiMode] = React.useState<"encode" | "decode">("encode")

  // Caesar Cipher
  const [caesarInput, setCaesarInput] = React.useState("")
  const [caesarOutput, setCaesarOutput] = React.useState("")
  const [caesarShift, setCaesarShift] = React.useState(13)
  const [caesarMode, setCaesarMode] = React.useState<"encode" | "decode">("encode")

  // ROT13
  const [rot13Input, setRot13Input] = React.useState("")
  const [rot13Output, setRot13Output] = React.useState("")

  // Morse Code
  const [morseInput, setMorseInput] = React.useState("")
  const [morseOutput, setMorseOutput] = React.useState("")
  const [morseMode, setMorseMode] = React.useState<"encode" | "decode">("encode")

  // MD5 Hash
  const [md5Input, setMd5Input] = React.useState("")
  const [md5Output, setMd5Output] = React.useState("")

  // SHA-256 Hash
  const [sha256Input, setSha256Input] = React.useState("")
  const [sha256Output, setSha256Output] = React.useState("")

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  // Live conversion with useMemo (only when autoConvert is enabled)
  const base64OutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !base64Input) return ""
    try {
      if (base64Mode === "encode") {
        return btoa(base64Input)
      } else {
        return atob(base64Input)
      }
    } catch (error) {
      return ""
    }
  }, [base64Input, base64Mode, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setBase64Output(base64OutputMemo)
    }
  }, [base64OutputMemo, settings.autoConvert])

  const urlOutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !urlInput) return ""
    try {
      if (urlMode === "encode") {
        return encodeURIComponent(urlInput)
      } else {
        return decodeURIComponent(urlInput)
      }
    } catch (error) {
      return ""
    }
  }, [urlInput, urlMode, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setUrlOutput(urlOutputMemo)
    }
  }, [urlOutputMemo, settings.autoConvert])

  const hexOutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !hexInput) return ""
    try {
      if (hexMode === "encode") {
        return Array.from(hexInput)
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      } else {
        const cleaned = hexInput.replace(/\s/g, "")
        if (cleaned.length % 2 !== 0) return ""
        return cleaned
          .match(/.{1,2}/g)
          ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
          .join("") || ""
      }
    } catch (error) {
      return ""
    }
  }, [hexInput, hexMode, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setHexOutput(hexOutputMemo)
    }
  }, [hexOutputMemo, settings.autoConvert])

  const binaryOutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !binaryInput) return ""
    try {
      if (binaryMode === "encode") {
        return Array.from(binaryInput)
          .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
          .join(" ")
      } else {
        const cleaned = binaryInput.replace(/\s/g, "")
        if (cleaned.length % 8 !== 0) return ""
        return cleaned
          .match(/.{8}/g)
          ?.map((byte) => String.fromCharCode(parseInt(byte, 2)))
          .join("") || ""
      }
    } catch (error) {
      return ""
    }
  }, [binaryInput, binaryMode, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setBinaryOutput(binaryOutputMemo)
    }
  }, [binaryOutputMemo, settings.autoConvert])

  const asciiOutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !asciiInput) return ""
    try {
      if (asciiMode === "encode") {
        return Array.from(asciiInput)
          .map((c) => c.charCodeAt(0).toString())
          .join(" ")
      } else {
        return asciiInput
          .split(/\s+/)
          .map((num) => String.fromCharCode(parseInt(num, 10)))
          .join("")
      }
    } catch (error) {
      return ""
    }
  }, [asciiInput, asciiMode, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setAsciiOutput(asciiOutputMemo)
    }
  }, [asciiOutputMemo, settings.autoConvert])

  const caesarOutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !caesarInput) return ""
    try {
      const shift = caesarMode === "encode" ? caesarShift : (26 - caesarShift) % 26
      return Array.from(caesarInput)
        .map((char) => {
          if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0)
            const base = code >= 65 && code <= 90 ? 65 : 97
            return String.fromCharCode(((code - base + shift) % 26) + base)
          }
          return char
        })
        .join("")
    } catch (error) {
      return ""
    }
  }, [caesarInput, caesarShift, caesarMode, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setCaesarOutput(caesarOutputMemo)
    }
  }, [caesarOutputMemo, settings.autoConvert])

  const rot13OutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !rot13Input) return ""
    try {
      return Array.from(rot13Input)
        .map((char) => {
          if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0)
            const base = code >= 65 && code <= 90 ? 65 : 97
            return String.fromCharCode(((code - base + 13) % 26) + base)
          }
          return char
        })
        .join("")
    } catch (error) {
      return ""
    }
  }, [rot13Input, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setRot13Output(rot13OutputMemo)
    }
  }, [rot13OutputMemo, settings.autoConvert])

  const morseOutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !morseInput) return ""
    try {
      if (morseMode === "encode") {
        return Array.from(morseInput.toUpperCase())
          .map((char) => MORSE_CODE[char] || char)
          .join(" ")
      } else {
        return morseInput
          .split(" / ")
          .map((word) =>
            word
              .split(" ")
              .map((code) => MORSE_REVERSE[code] || code)
              .join("")
          )
          .join(" ")
      }
    } catch (error) {
      return ""
    }
  }, [morseInput, morseMode, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setMorseOutput(morseOutputMemo)
    }
  }, [morseOutputMemo, settings.autoConvert])

  const md5OutputMemo = React.useMemo(() => {
    if (!settings.autoConvert || !md5Input) return ""
    try {
      return CryptoJS.MD5(md5Input).toString()
    } catch (error) {
      return ""
    }
  }, [md5Input, settings.autoConvert])

  React.useEffect(() => {
    if (settings.autoConvert) {
      setMd5Output(md5OutputMemo)
    }
  }, [md5OutputMemo, settings.autoConvert])

  React.useEffect(() => {
    if (!settings.autoConvert || !sha256Input) {
      setSha256Output("")
      return
    }
    const computeHash = async () => {
      try {
        const encoder = new TextEncoder()
        const data = encoder.encode(sha256Input)
        const hashBuffer = await crypto.subtle.digest("SHA-256", data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
        setSha256Output(hashHex)
      } catch (error) {
        setSha256Output("")
      }
    }
    computeHash()
  }, [sha256Input, settings.autoConvert])

  // Manual conversion functions (used when autoConvert is disabled or when user clicks Convert button)
  const convertBase64 = () => {
    if (!base64Input) return
    try {
      if (base64Mode === "encode") {
        setBase64Output(btoa(base64Input))
      } else {
        setBase64Output(atob(base64Input))
      }
    } catch (error) {
      toast.error("Invalid Base64 input")
    }
  }

  const convertUrl = () => {
    if (!urlInput) return
    try {
      if (urlMode === "encode") {
        setUrlOutput(encodeURIComponent(urlInput))
      } else {
        setUrlOutput(decodeURIComponent(urlInput))
      }
    } catch (error) {
      toast.error("Invalid URL-encoded input")
    }
  }

  const convertHex = () => {
    if (!hexInput) return
    try {
      if (hexMode === "encode") {
        setHexOutput(Array.from(hexInput)
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(""))
      } else {
        const cleaned = hexInput.replace(/\s/g, "")
        if (cleaned.length % 2 !== 0) {
          toast.error("Invalid hex string (length must be even)")
          return
        }
        setHexOutput(cleaned
          .match(/.{1,2}/g)
          ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
          .join("") || "")
      }
    } catch (error) {
      toast.error("Invalid hex input")
    }
  }

  const convertBinary = () => {
    if (!binaryInput) return
    try {
      if (binaryMode === "encode") {
        setBinaryOutput(Array.from(binaryInput)
          .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
          .join(" "))
      } else {
        const cleaned = binaryInput.replace(/\s/g, "")
        if (cleaned.length % 8 !== 0) {
          toast.error("Invalid binary string (length must be multiple of 8)")
          return
        }
        setBinaryOutput(cleaned
          .match(/.{8}/g)
          ?.map((byte) => String.fromCharCode(parseInt(byte, 2)))
          .join("") || "")
      }
    } catch (error) {
      toast.error("Invalid binary input")
    }
  }

  const convertAscii = () => {
    if (!asciiInput) return
    try {
      if (asciiMode === "encode") {
        setAsciiOutput(Array.from(asciiInput)
          .map((c) => c.charCodeAt(0).toString())
          .join(" "))
      } else {
        setAsciiOutput(asciiInput
          .split(/\s+/)
          .map((num) => String.fromCharCode(parseInt(num, 10)))
          .join(""))
      }
    } catch (error) {
      toast.error("Invalid ASCII input")
    }
  }

  const convertCaesar = () => {
    if (!caesarInput) return
    try {
      const shift = caesarMode === "encode" ? caesarShift : (26 - caesarShift) % 26
      setCaesarOutput(Array.from(caesarInput)
        .map((char) => {
          if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0)
            const base = code >= 65 && code <= 90 ? 65 : 97
            return String.fromCharCode(((code - base + shift) % 26) + base)
          }
          return char
        })
        .join(""))
    } catch (error) {
      toast.error("Invalid input")
    }
  }

  const convertRot13 = () => {
    if (!rot13Input) return
    try {
      setRot13Output(Array.from(rot13Input)
        .map((char) => {
          if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0)
            const base = code >= 65 && code <= 90 ? 65 : 97
            return String.fromCharCode(((code - base + 13) % 26) + base)
          }
          return char
        })
        .join(""))
    } catch (error) {
      toast.error("Invalid input")
    }
  }

  const convertMorse = () => {
    if (!morseInput) return
    try {
      if (morseMode === "encode") {
        setMorseOutput(Array.from(morseInput.toUpperCase())
          .map((char) => MORSE_CODE[char] || char)
          .join(" "))
      } else {
        setMorseOutput(morseInput
          .split(" / ")
          .map((word) =>
            word
              .split(" ")
              .map((code) => MORSE_REVERSE[code] || code)
              .join("")
          )
          .join(" "))
      }
    } catch (error) {
      toast.error("Invalid Morse code input")
    }
  }

  const convertMd5 = () => {
    if (!md5Input) return
    try {
      setMd5Output(CryptoJS.MD5(md5Input).toString())
    } catch (error) {
      toast.error("Error generating MD5 hash")
    }
  }

  const convertSha256 = async () => {
    if (!sha256Input) return
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(sha256Input)
      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
      setSha256Output(hashHex)
    } catch (error) {
      toast.error("Error generating SHA-256 hash")
    }
  }

  const handleTabChange = (value: string) => {
    if (settings.clearOnTabChange) {
      setBase64Input("")
      setBase64Output("")
      setUrlInput("")
      setUrlOutput("")
      setHexInput("")
      setHexOutput("")
      setBinaryInput("")
      setBinaryOutput("")
      setAsciiInput("")
      setAsciiOutput("")
      setCaesarInput("")
      setCaesarOutput("")
      setRot13Input("")
      setRot13Output("")
      setMorseInput("")
      setMorseOutput("")
      setMd5Input("")
      setMd5Output("")
      setSha256Input("")
      setSha256Output("")
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
        <h2 className="text-2xl font-bold mb-2">Encryption & Encoding Tools</h2>
        <p className="text-muted-foreground">
          Encode, decode, and hash text using various encryption and encoding methods
        </p>
      </div>

      <Tabs 
        defaultValue={settings.defaultTab} 
        className="w-full"
        onValueChange={handleTabChange}
      >
        <div className="space-y-2">
          <TabsList className="grid w-full grid-cols-5 max-w-full overflow-x-auto">
            <TabsTrigger value="base64">Base64</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="hex">Hex</TabsTrigger>
            <TabsTrigger value="binary">Binary</TabsTrigger>
            <TabsTrigger value="ascii">ASCII</TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-5 max-w-full overflow-x-auto">
            <TabsTrigger value="caesar">Caesar</TabsTrigger>
            <TabsTrigger value="rot13">ROT13</TabsTrigger>
            <TabsTrigger value="morse">Morse</TabsTrigger>
            <TabsTrigger value="md5">MD5</TabsTrigger>
            <TabsTrigger value="sha256">SHA-256</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="base64" className="space-y-4 mt-6">
          <CipherCard
            title="Base64 Encode/Decode"
            description="Encode text to Base64 or decode Base64 to text"
            inputValue={base64Input}
            outputValue={base64Output}
            onInputChange={(e) => setBase64Input(e.target.value)}
            mode={base64Mode}
            onModeChange={setBase64Mode}
            onCopy={() => copyToClipboard(base64Output, "Base64")}
            onConvert={convertBase64}
            placeholder={base64Mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
            fontSize={settings.fontSize}
          />
        </TabsContent>

        <TabsContent value="url" className="space-y-4 mt-6">
          <CipherCard
            title="URL Encode/Decode"
            description="Encode text to URL encoding or decode URL-encoded text"
            inputValue={urlInput}
            outputValue={urlOutput}
            onInputChange={(e) => setUrlInput(e.target.value)}
            mode={urlMode}
            onModeChange={setUrlMode}
            onCopy={() => copyToClipboard(urlOutput, "URL")}
            onConvert={convertUrl}
            placeholder={urlMode === "encode" ? "Enter text to encode..." : "Enter URL-encoded text..."}
            fontSize={settings.fontSize}
          />
        </TabsContent>

        <TabsContent value="hex" className="space-y-4 mt-6">
          <CipherCard
            title="Hex Encode/Decode"
            description="Encode text to hexadecimal or decode hex to text"
            inputValue={hexInput}
            outputValue={hexOutput}
            onInputChange={(e) => setHexInput(e.target.value)}
            mode={hexMode}
            onModeChange={setHexMode}
            onCopy={() => copyToClipboard(hexOutput, "Hex")}
            onConvert={convertHex}
            placeholder={hexMode === "encode" ? "Enter text to encode..." : "Enter hex string..."}
            fontSize={settings.fontSize}
          />
        </TabsContent>

        <TabsContent value="binary" className="space-y-4 mt-6">
          <CipherCard
            title="Binary Encode/Decode"
            description="Encode text to binary or decode binary to text"
            inputValue={binaryInput}
            outputValue={binaryOutput}
            onInputChange={(e) => setBinaryInput(e.target.value)}
            mode={binaryMode}
            onModeChange={setBinaryMode}
            onCopy={() => copyToClipboard(binaryOutput, "Binary")}
            onConvert={convertBinary}
            placeholder={binaryMode === "encode" ? "Enter text to encode..." : "Enter binary string..."}
            fontSize={settings.fontSize}
          />
        </TabsContent>

        <TabsContent value="ascii" className="space-y-4 mt-6">
          <CipherCard
            title="ASCII Encode/Decode"
            description="Encode text to ASCII codes or decode ASCII codes to text"
            inputValue={asciiInput}
            outputValue={asciiOutput}
            onInputChange={(e) => setAsciiInput(e.target.value)}
            mode={asciiMode}
            onModeChange={setAsciiMode}
            onCopy={() => copyToClipboard(asciiOutput, "ASCII")}
            onConvert={convertAscii}
            placeholder={asciiMode === "encode" ? "Enter text to encode..." : "Enter ASCII codes (space-separated)..."}
            fontSize={settings.fontSize}
          />
        </TabsContent>

        <TabsContent value="caesar" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Caesar Cipher</CardTitle>
                  <CardDescription>
                    Encrypt or decrypt text using a Caesar cipher with a custom shift value
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={caesarMode === "encode" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCaesarMode("encode")}
                  >
                    Encode
                  </Button>
                  <Button
                    variant={caesarMode === "decode" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCaesarMode("decode")}
                  >
                    Decode
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Shift Value (1-25)</Label>
                <Input
                  type="number"
                  min="1"
                  max="25"
                  value={caesarShift}
                  onChange={(e) => setCaesarShift(Math.max(1, Math.min(25, parseInt(e.target.value) || 1)))}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>Input</Label>
                <Textarea
                  placeholder="Enter text to encrypt/decrypt..."
                  value={caesarInput}
                  onChange={(e) => setCaesarInput(e.target.value)}
                  className="font-mono min-h-[120px]"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={convertCaesar} disabled={!caesarInput}>
                  Convert
                </Button>
                {caesarOutput && (
                  <Button variant="outline" onClick={() => copyToClipboard(caesarOutput, "Caesar")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Output</Label>
                <Textarea
                  readOnly
                  value={caesarOutput}
                  className="font-mono min-h-[120px] bg-muted"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rot13" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>ROT13 Cipher</CardTitle>
                <CardDescription>Rotate letters 13 positions in the alphabet (encode and decode are the same)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Input</Label>
                <Textarea
                  placeholder="Enter text to encode/decode..."
                  value={rot13Input}
                  onChange={(e) => setRot13Input(e.target.value)}
                  className="font-mono min-h-[120px]"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={convertRot13} disabled={!rot13Input}>
                  Convert
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Output</Label>
                  {rot13Output && (
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(rot13Output, "ROT13")}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  )}
                </div>
                <Textarea
                  readOnly
                  value={rot13Output}
                  className="font-mono min-h-[120px] bg-muted"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="morse" className="space-y-4 mt-6">
          <CipherCard
            title="Morse Code"
            description="Encode text to Morse code or decode Morse code to text"
            inputValue={morseInput}
            outputValue={morseOutput}
            onInputChange={(e) => setMorseInput(e.target.value)}
            mode={morseMode}
            onModeChange={setMorseMode}
            onCopy={() => copyToClipboard(morseOutput, "Morse")}
            onConvert={convertMorse}
            placeholder={morseMode === "encode" ? "Enter text to encode..." : "Enter Morse code (use / to separate words)..."}
            fontSize={settings.fontSize}
          />
        </TabsContent>

        <TabsContent value="md5" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>MD5 Hash</CardTitle>
                <CardDescription>Generate MD5 hash of text (one-way hashing)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Input</Label>
                <Textarea
                  placeholder="Enter text to hash..."
                  value={md5Input}
                  onChange={(e) => setMd5Input(e.target.value)}
                  className="font-mono min-h-[120px]"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={convertMd5} disabled={!md5Input}>
                  Convert
                </Button>
                {md5Output && (
                  <Button variant="outline" onClick={() => copyToClipboard(md5Output, "MD5")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>MD5 Hash</Label>
                <Textarea
                  readOnly
                  value={md5Output}
                  className="font-mono min-h-[120px] bg-muted"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sha256" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>SHA-256 Hash</CardTitle>
                <CardDescription>Generate SHA-256 hash of text (one-way hashing)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Input</Label>
                <Textarea
                  placeholder="Enter text to hash..."
                  value={sha256Input}
                  onChange={(e) => setSha256Input(e.target.value)}
                  className="font-mono min-h-[120px]"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={convertSha256} disabled={!sha256Input}>
                  Convert
                </Button>
                {sha256Output && (
                  <Button variant="outline" onClick={() => copyToClipboard(sha256Output, "SHA-256")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>SHA-256 Hash</Label>
                <Textarea
                  readOnly
                  value={sha256Output}
                  className="font-mono min-h-[120px] bg-muted"
                  style={{ fontSize: `${settings.fontSize}px` }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}