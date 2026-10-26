import md5 from "crypto-js/md5"

export type CodecMode = "encode" | "decode"

const encoder = new TextEncoder()
// `fatal` makes invalid UTF-8 throw instead of silently producing U+FFFD.
const decoder = new TextDecoder("utf-8", { fatal: true })

function decodeUtf8(bytes: Uint8Array, format: string): string {
  try {
    return decoder.decode(bytes)
  } catch {
    throw new Error(`The ${format} input is not valid UTF-8 text`)
  }
}

function bytesFromDigits(input: string, radix: 2 | 16): Uint8Array {
  const digits = input.replace(/\s+/g, "")
  const width = radix === 16 ? 2 : 8
  const valid = radix === 16 ? /^[0-9a-f]*$/i : /^[01]*$/
  const name = radix === 16 ? "Hex" : "Binary"
  if (!valid.test(digits))
    throw new Error(`${name} input may only contain ${radix === 16 ? "0-9 and A-F" : "0 and 1"}`)
  if (digits.length % width) throw new Error(`${name} input must be whole bytes (${width} digits each)`)
  const bytes = new Uint8Array(digits.length / width)
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(digits.slice(index * width, (index + 1) * width), radix)
  }
  return bytes
}

export function base64(input: string, mode: CodecMode): string {
  if (mode === "encode") {
    let binary = ""
    for (const byte of encoder.encode(input)) binary += String.fromCharCode(byte)
    return btoa(binary)
  }
  let binary: string
  try {
    binary = atob(input.replace(/\s+/g, ""))
  } catch {
    throw new Error("That is not valid Base64")
  }
  return decodeUtf8(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    "Base64"
  )
}

export function url(input: string, mode: CodecMode): string {
  if (mode === "encode") return encodeURIComponent(input)
  try {
    return decodeURIComponent(input)
  } catch {
    throw new Error("That text contains an invalid % escape")
  }
}

export function hex(input: string, mode: CodecMode): string {
  if (mode === "encode")
    return Array.from(encoder.encode(input), (byte) => byte.toString(16).padStart(2, "0")).join("")
  return decodeUtf8(bytesFromDigits(input, 16), "Hex")
}

export function binary(input: string, mode: CodecMode): string {
  if (mode === "encode")
    return Array.from(encoder.encode(input), (byte) => byte.toString(2).padStart(8, "0")).join(" ")
  return decodeUtf8(bytesFromDigits(input, 2), "Binary")
}

/** Character codes (Unicode code points), space separated. ASCII text maps to its ASCII values. */
export function characterCodes(input: string, mode: CodecMode): string {
  if (mode === "encode") return Array.from(input, (character) => character.codePointAt(0)).join(" ")
  const codes = input.trim().split(/\s+/).filter(Boolean)
  return codes
    .map((code) => {
      const value = Number(code)
      if (!/^\d+$/.test(code) || value > 0x10ffff) throw new Error(`"${code}" is not a character code`)
      return String.fromCodePoint(value)
    })
    .join("")
}

export function caesar(input: string, mode: CodecMode, shift: number): string {
  const offset = (((mode === "encode" ? shift : -shift) % 26) + 26) % 26
  return input.replace(/[a-z]/gi, (letter) => {
    const base = letter <= "Z" ? 65 : 97
    return String.fromCharCode(((letter.charCodeAt(0) - base + offset) % 26) + base)
  })
}

export const rot13 = (input: string) => caesar(input, "encode", 13)

const MORSE_CODE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  _: "..--.-",
  '"': ".-..-.",
  $: "...-..-",
  "@": ".--.-.",
}
const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE_CODE).map(([letter, code]) => [code, letter]))

export function morse(input: string, mode: CodecMode): string {
  if (mode === "encode") {
    return input
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .map((word) => Array.from(word, (character) => MORSE_CODE[character] ?? character).join(" "))
      .join(" / ")
  }
  return input
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .split(/\s+/)
        .map((code) => MORSE_REVERSE[code] ?? code)
        .join("")
    )
    .join(" ")
}

export const md5Hash = (input: string) => md5(input).toString()

export async function sha256Hash(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
