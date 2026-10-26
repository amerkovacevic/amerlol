import { describe, expect, it } from "vitest"
import * as codecs from "../lib/apps/codecs"

const reversible = [codecs.base64, codecs.url, codecs.hex, codecs.binary, codecs.characterCodes]

describe("text codecs", () => {
  it.each(reversible.map((codec) => [codec.name, codec] as const))(
    "%s round-trips Unicode text",
    (_name, codec) => {
      for (const text of ["hello", "Café ünïcode", "emoji 👋🏽 and 漢字", ""]) {
        expect(codec(codec(text, "encode"), "decode")).toBe(text)
      }
    }
  )

  it("encodes UTF-8 bytes rather than UTF-16 code units", () => {
    expect(codecs.base64("é", "encode")).toBe("w6k=")
    expect(codecs.hex("é", "encode")).toBe("c3a9")
    expect(codecs.binary("A", "encode")).toBe("01000001")
    expect(codecs.characterCodes("Hi", "encode")).toBe("72 105")
  })

  it("explains malformed input instead of returning garbage", () => {
    expect(() => codecs.base64("not base64!", "decode")).toThrow(/valid Base64/)
    expect(() => codecs.hex("abc", "decode")).toThrow(/whole bytes/)
    expect(() => codecs.hex("zz", "decode")).toThrow(/0-9 and A-F/)
    expect(() => codecs.binary("0102", "decode")).toThrow(/0 and 1/)
    expect(() => codecs.hex("ff", "decode")).toThrow(/UTF-8/)
    expect(() => codecs.url("%E0%A4%A", "decode")).toThrow(/% escape/)
    expect(() => codecs.characterCodes("65 abc", "decode")).toThrow(/"abc"/)
  })

  it("shifts only letters and preserves case for Caesar and ROT13", () => {
    expect(codecs.caesar("Hello, World!", "encode", 3)).toBe("Khoor, Zruog!")
    expect(codecs.caesar("Khoor, Zruog!", "decode", 3)).toBe("Hello, World!")
    expect(codecs.rot13(codecs.rot13("Round trip"))).toBe("Round trip")
  })

  it("separates Morse words with a slash", () => {
    expect(codecs.morse("SOS hi", "encode")).toBe("... --- ... / .... ..")
    expect(codecs.morse("... --- ...  /  .... ..", "decode")).toBe("SOS HI")
  })

  it("produces standard hash digests", async () => {
    expect(codecs.md5Hash("abc")).toBe("900150983cd24fb0d6963f7d28e17f72")
    expect(await codecs.sha256Hash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })
})
