// Encoders and decoders for the Data Encoding tool. Everything here is a
// pure function over strings: no DOM, no network, no storage, and nothing
// that evaluates its input. Text is treated as UTF-8 bytes throughout.
//
// This file is also run directly by Node's test runner, so it uses only
// erasable TypeScript syntax and imports nothing from the app.

export type EncodingOperation =
  | "base64"
  | "base64url"
  | "url"
  | "double-url"
  | "hex"
  | "html"
  | "base32"
  | "binary"
  | "ascii"
  | "unicode"
  | "jwt"

export type EncodingMode = "encode" | "decode"

export type EncodingGroup = "Common" | "Binary & Text" | "Web / Security"

export interface EncodingDefinition {
  id: EncodingOperation
  name: string
  description: string
  group: EncodingGroup
  /** JWT can only be decoded. */
  modes: readonly EncodingMode[]
  /** An extra switch for the encode direction, where one makes sense. */
  encodeAll?: { label: string; description: string }
  /** Clearly sample data, offered while the input is empty. */
  samples: Partial<Record<EncodingMode, string>>
}

export interface TransformOptions {
  /** Encode every character, not only the ones that need it. */
  encodeAll?: boolean
}

export interface TransformSection {
  title: string
  content: string
}

export interface TransformResult {
  output: string
  /** Something worth knowing about the output; not an error. */
  note?: string
  /** The output in labelled parts, for results that have a structure. */
  sections?: TransformSection[]
}

/** Input that cannot be transformed. `hint` says what was expected. */
export class EncodingError extends Error {
  hint: string | undefined

  constructor(message: string, hint?: string) {
    super(message)
    this.name = "EncodingError"
    this.hint = hint
  }
}

const BOTH = ["encode", "decode"] as const

export const ENCODINGS: readonly EncodingDefinition[] = [
  {
    id: "base64",
    name: "Base64",
    description: "Standard Base64 encoding",
    group: "Common",
    modes: BOTH,
    samples: { encode: "hello world", decode: "aGVsbG8gd29ybGQ=" },
  },
  {
    id: "base64url",
    name: "Base64URL",
    description: "URL-safe alphabet, no padding",
    group: "Common",
    modes: BOTH,
    samples: { encode: "subjects?_d=1", decode: "c3ViamVjdHM_X2Q9MQ" },
  },
  {
    id: "url",
    name: "URL Encoding",
    description: "Percent-encode URL characters",
    group: "Common",
    modes: BOTH,
    encodeAll: {
      label: "Encode every character",
      description:
        "Also encode letters, digits and dots: ../ becomes %2e%2e%2f",
    },
    samples: { encode: "hello world", decode: "hello%20world" },
  },
  {
    id: "double-url",
    name: "Double URL Encoding",
    description: "Percent-encode twice",
    group: "Common",
    modes: BOTH,
    encodeAll: {
      label: "Encode every character",
      description: "../ becomes %252e%252e%252f",
    },
    samples: { encode: "../", decode: "%252e%252e%252f" },
  },
  {
    id: "hex",
    name: "Hex",
    description: "Represent text as hexadecimal bytes",
    group: "Common",
    modes: BOTH,
    samples: { encode: "hello", decode: "68656c6c6f" },
  },
  {
    id: "html",
    name: "HTML Entity",
    description: "Escape characters as HTML entities",
    group: "Common",
    modes: BOTH,
    encodeAll: {
      label: "Encode every character",
      description: "Write each character as a numeric entity",
    },
    samples: {
      encode: '<a href="/">Home</a>',
      decode: "&lt;b&gt;bold&lt;/b&gt; &#38; &#x26;",
    },
  },
  {
    id: "base32",
    name: "Base32",
    description: "RFC 4648 Base32",
    group: "Binary & Text",
    modes: BOTH,
    samples: { encode: "hello", decode: "NBSWY3DP" },
  },
  {
    id: "binary",
    name: "Binary",
    description: "Text as 8-bit groups",
    group: "Binary & Text",
    modes: BOTH,
    samples: { encode: "hi", decode: "01101000 01101001" },
  },
  {
    id: "ascii",
    name: "ASCII",
    description: "Decimal character codes",
    group: "Binary & Text",
    modes: BOTH,
    samples: { encode: "Node", decode: "78 111 100 101" },
  },
  {
    id: "unicode",
    name: "Unicode",
    description: "\\uXXXX escape sequences",
    group: "Binary & Text",
    modes: BOTH,
    samples: { encode: "año", decode: "\\u0061\\u00f1\\u006f" },
  },
  {
    id: "jwt",
    name: "JWT Payload",
    description: "Decode a token's header and payload",
    group: "Web / Security",
    modes: ["decode"],
    samples: {
      // A made-up token signed with nothing: sample data only.
      decode:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlNhbXBsZSBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.c2FtcGxlLXNpZ25hdHVyZQ",
    },
  },
]

export const ENCODING_GROUPS: readonly EncodingGroup[] = [
  "Common",
  "Binary & Text",
  "Web / Security",
]

export function getEncoding(id: EncodingOperation): EncodingDefinition {
  const found = ENCODINGS.find((encoding) => encoding.id === id)
  if (!found) {
    throw new EncodingError("Unknown encoding.")
  }
  return found
}

// ---------------------------------------------------------------- bytes

function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

const NOT_TEXT_NOTE =
  "The decoded bytes are not valid UTF-8 text. Unreadable bytes are shown as �."

/** Bytes as text. Data that is not UTF-8 is still shown, with a note. */
function fromBytes(bytes: Uint8Array): TransformResult {
  try {
    return { output: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  } catch {
    return {
      output: new TextDecoder("utf-8").decode(bytes),
      note: NOT_TEXT_NOTE,
    }
  }
}

function byteHex(byte: number) {
  return byte.toString(16).padStart(2, "0")
}

// --------------------------------------------------------------- base64

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function decodeBase64(input: string): Uint8Array {
  const value = input.replace(/\s+/g, "")
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new EncodingError(
      "Invalid Base64 input.",
      "Expected only A–Z, a–z, 0–9, + and /, with optional = padding. For - and _ use Base64URL."
    )
  }
  const body = value.replace(/=+$/, "")
  if (body.length % 4 === 1) {
    throw new EncodingError(
      "Invalid Base64 input.",
      "The length is not possible for Base64: a character is missing or extra."
    )
  }
  return base64ToBytes(body.padEnd(Math.ceil(body.length / 4) * 4, "="))
}

function encodeBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function decodeBase64Url(input: string, what = "Base64URL"): Uint8Array {
  const value = input.replace(/\s+/g, "")
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(value)) {
    throw new EncodingError(
      `Invalid ${what} input.`,
      "Expected only A–Z, a–z, 0–9, - and _. For + and / use Base64."
    )
  }
  const body = value.replace(/=+$/, "")
  if (body.length % 4 === 1) {
    throw new EncodingError(
      `Invalid ${what} input.`,
      "The length is not possible: a character is missing or extra."
    )
  }
  return base64ToBytes(
    body
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(body.length / 4) * 4, "=")
  )
}

// ------------------------------------------------------------------ url

function encodeUrl(text: string, all: boolean): string {
  if (!all) {
    return encodeURIComponent(text)
  }
  let output = ""
  for (const byte of toBytes(text)) {
    output += `%${byteHex(byte)}`
  }
  return output
}

function decodeUrl(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    throw new EncodingError(
      "Malformed percent encoding.",
      "Every % must be followed by two hexadecimal digits that form valid UTF-8."
    )
  }
}

// ------------------------------------------------------------------ hex

function decodeHex(input: string): Uint8Array {
  // Accept the usual ways hex is written: 0x41, \x41, 41:42, 41 42.
  const value = input.replace(/0x|\\x/gi, "").replace(/[\s:,-]+/g, "")
  if (!/^[0-9a-fA-F]*$/.test(value) || value.length % 2 !== 0) {
    throw new EncodingError(
      "Invalid hexadecimal input.",
      "Expected pairs of hexadecimal characters."
    )
  }
  const bytes = new Uint8Array(value.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

// ----------------------------------------------------------------- html

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  sect: "§",
  para: "¶",
  deg: "°",
  plusmn: "±",
  times: "×",
  divide: "÷",
  middot: "·",
  bull: "•",
  larr: "←",
  rarr: "→",
  tab: "\t",
  newline: "\n",
}

function encodeHtml(text: string, all: boolean): string {
  if (!all) {
    return text.replace(/[&<>"']/g, (char) => ESCAPES[char])
  }
  let output = ""
  for (const char of text) {
    output += `&#x${(char.codePointAt(0) ?? 0).toString(16)};`
  }
  return output
}

function codePoint(value: number, source: string): string {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) {
    return source
  }
  try {
    return String.fromCodePoint(value)
  } catch {
    return source
  }
}

// Entities are replaced by their characters as plain text; the result is
// never parsed as markup. Unknown names are left as written.
function decodeHtml(text: string): string {
  return text.replace(
    /&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g,
    (source: string, body: string) => {
      if (body[0] === "#") {
        const hex = body[1] === "x" || body[1] === "X"
        return codePoint(
          Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10),
          source
        )
      }
      return (
        NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()] ?? source
      )
    }
  )
}

// --------------------------------------------------------------- base32

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function encodeBase32(bytes: Uint8Array): string {
  let output = ""
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32[(buffer >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32[(buffer << (5 - bits)) & 31]
  }
  return output.padEnd(Math.ceil(output.length / 8) * 8, "=")
}

function decodeBase32(input: string): Uint8Array {
  const value = input.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase()
  // 1, 3 and 6 leftover characters cannot come from whole bytes.
  if (!/^[A-Z2-7]*$/.test(value) || [1, 3, 6].includes(value.length % 8)) {
    throw new EncodingError(
      "Invalid Base32 input.",
      "Expected only A–Z and 2–7, with optional = padding."
    )
  }
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of value) {
    buffer = (buffer << 5) | BASE32.indexOf(char)
    bits += 5
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Uint8Array.from(bytes)
}

// --------------------------------------------------------------- binary

function decodeBinary(input: string): Uint8Array {
  const value = input.replace(/[\s,]+/g, "")
  if (!/^[01]*$/.test(value) || value.length % 8 !== 0) {
    throw new EncodingError(
      "Invalid binary input.",
      "Expected groups of eight 0s and 1s."
    )
  }
  const bytes = new Uint8Array(value.length / 8)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 8, index * 8 + 8), 2)
  }
  return bytes
}

// ---------------------------------------------------------------- ascii

function encodeCharCodes(text: string): string {
  return Array.from(text, (char) => String(char.codePointAt(0))).join(" ")
}

function decodeCharCodes(input: string): string {
  const parts = input.split(/[\s,;]+/).filter(Boolean)
  let output = ""
  for (const part of parts) {
    const code = /^0x[0-9a-f]+$/i.test(part)
      ? Number.parseInt(part.slice(2), 16)
      : /^[0-9]+$/.test(part)
        ? Number.parseInt(part, 10)
        : Number.NaN
    if (!Number.isInteger(code) || code > 0x10ffff) {
      throw new EncodingError(
        "Invalid character code.",
        `"${part.slice(0, 20)}" is not a character code. Expected numbers separated by spaces or commas.`
      )
    }
    output += String.fromCodePoint(code)
  }
  return output
}

// -------------------------------------------------------------- unicode

function encodeUnicode(text: string): string {
  let output = ""
  // UTF-16 units, so characters outside the basic plane become the usual
  // surrogate pair of escapes.
  for (let index = 0; index < text.length; index += 1) {
    output += `\\u${text.charCodeAt(index).toString(16).padStart(4, "0")}`
  }
  return output
}

function decodeUnicode(text: string): string {
  return text.replace(
    /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
    (source: string, braced?: string, unit?: string, byte?: string) =>
      braced !== undefined
        ? codePoint(Number.parseInt(braced, 16), source)
        : String.fromCharCode(Number.parseInt(unit ?? byte ?? "", 16))
  )
}

// ------------------------------------------------------------------ jwt

function prettyJson(bytes: Uint8Array, part: string): string {
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new EncodingError(
      `The JWT ${part} is not text.`,
      "It decoded to bytes that are not valid UTF-8."
    )
  }
  try {
    // Parsed as data only, to indent it. Nothing in it is ever run.
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    throw new EncodingError(
      `The JWT ${part} is not valid JSON.`,
      "It decoded correctly, but what it contains is not a JSON object."
    )
  }
}

const TIME_CLAIMS: Record<string, string> = {
  iat: "Issued",
  nbf: "Not valid before",
  exp: "Expires",
}

function describeTimes(payload: string): string | undefined {
  const claims = JSON.parse(payload) as unknown
  if (!claims || typeof claims !== "object") {
    return undefined
  }
  const lines: string[] = []
  for (const [claim, label] of Object.entries(TIME_CLAIMS)) {
    const value = (claims as Record<string, unknown>)[claim]
    if (typeof value === "number" && Number.isFinite(value)) {
      const date = new Date(value * 1000)
      if (!Number.isNaN(date.getTime())) {
        lines.push(`${label}: ${date.toISOString()}`)
      }
    }
  }
  return lines.length > 0 ? lines.join("\n") : undefined
}

/** Splits a JWT and decodes its header and payload. Verifies nothing. */
function decodeJwt(input: string): TransformResult {
  const token = input.trim().replace(/^Bearer\s+/i, "")
  const segments = token.split(".")
  if (segments.length !== 3 || !segments[0] || !segments[1]) {
    throw new EncodingError(
      "Malformed JWT.",
      "Expected three parts separated by dots: header.payload.signature."
    )
  }
  const header = prettyJson(
    decodeBase64Url(segments[0], "JWT header"),
    "header"
  )
  const payload = prettyJson(
    decodeBase64Url(segments[1], "JWT payload"),
    "payload"
  )
  const signature = segments[2] || "(empty)"
  const sections = [
    { title: "Header", content: header },
    { title: "Payload", content: payload },
    { title: "Signature (not verified)", content: signature },
  ]
  return {
    output: sections
      .map((section) => `${section.title}\n${section.content}`)
      .join("\n\n"),
    sections,
    note: describeTimes(payload),
  }
}

// ------------------------------------------------------------- dispatch

function text(output: string): TransformResult {
  return { output }
}

/** Runs one encoding or decoding step. Throws EncodingError on bad input. */
export function transform(
  operation: EncodingOperation,
  mode: EncodingMode,
  input: string,
  options: TransformOptions = {}
): TransformResult {
  const encode = mode === "encode"
  const all = options.encodeAll === true

  switch (operation) {
    case "base64":
      return encode
        ? text(bytesToBase64(toBytes(input)))
        : fromBytes(decodeBase64(input))
    case "base64url":
      return encode
        ? text(encodeBase64Url(toBytes(input)))
        : fromBytes(decodeBase64Url(input))
    case "url":
      return text(encode ? encodeUrl(input, all) : decodeUrl(input))
    case "double-url":
      return text(
        encode
          ? encodeUrl(encodeUrl(input, all), false)
          : decodeUrl(decodeUrl(input))
      )
    case "hex":
      return encode
        ? text(Array.from(toBytes(input), byteHex).join(""))
        : fromBytes(decodeHex(input))
    case "html":
      return text(encode ? encodeHtml(input, all) : decodeHtml(input))
    case "base32":
      return encode
        ? text(encodeBase32(toBytes(input)))
        : fromBytes(decodeBase32(input))
    case "binary":
      return encode
        ? text(
            Array.from(toBytes(input), (byte) =>
              byte.toString(2).padStart(8, "0")
            ).join(" ")
          )
        : fromBytes(decodeBinary(input))
    case "ascii":
      return text(encode ? encodeCharCodes(input) : decodeCharCodes(input))
    case "unicode":
      return text(encode ? encodeUnicode(input) : decodeUnicode(input))
    case "jwt":
      if (encode) {
        throw new EncodingError(
          "A JWT can only be decoded here.",
          "Creating a token needs a signing key, which this tool does not handle."
        )
      }
      return decodeJwt(input)
  }
}

export interface TransformStep {
  operation: EncodingOperation
  mode: EncodingMode
  options?: TransformOptions
}

/**
 * Feeds the output of each step into the next: URL-decode, then
 * Base64-decode, and so on. The tool runs one step today; this is the seam
 * for chains later.
 */
export function transformChain(
  steps: readonly TransformStep[],
  input: string
): TransformResult {
  let result: TransformResult = { output: input }
  for (const step of steps) {
    result = transform(step.operation, step.mode, result.output, step.options)
  }
  return result
}

// ------------------------------------------------------------ detection

export interface EncodingGuess {
  operation: EncodingOperation
  name: string
}

// Cheap shape checks, most specific first. A format is only suggested if
// decoding it actually works and gives readable text.
const SHAPES: readonly [EncodingOperation, (value: string) => boolean][] = [
  ["jwt", (value) => /^(Bearer\s+)?[\w-]{2,}\.[\w-]{2,}\.[\w-]*$/i.test(value)],
  ["double-url", (value) => /%25[0-9a-f]{2}/i.test(value)],
  ["url", (value) => /%[0-9a-f]{2}/i.test(value)],
  ["html", (value) => /&(#\d+|#x[0-9a-f]+|[a-z]{2,});/i.test(value)],
  [
    "unicode",
    (value) => /\\u[0-9a-f]{4}|\\u\{[0-9a-f]+\}|\\x[0-9a-f]{2}/i.test(value),
  ],
  ["binary", (value) => /^[01\s]{8,}$/.test(value)],
  [
    "hex",
    (value) =>
      /^(?:(?:0x|\\x)?[0-9a-f]{2}[\s:,-]*){3,}$/i.test(value) &&
      /[a-f]/i.test(value),
  ],
  [
    "base32",
    (value) => /^[A-Z2-7]{8,}=*$/.test(value) && value.length % 8 === 0,
  ],
  ["base64url", (value) => /^[\w-]{8,}$/.test(value) && /[-_]/.test(value)],
  [
    "base64",
    (value) =>
      /^[A-Za-z0-9+/]{8,}={0,2}$/.test(value) &&
      value.length % 4 === 0 &&
      // Plain lowercase or uppercase words are valid Base64 but rarely are.
      /[A-Z]/.test(value) &&
      /[a-z0-9+/=]/.test(value),
  ],
]

/**
 * The encodings a piece of text looks like it is in, best guess first. Used
 * to offer "decode as" shortcuts; it never changes anything by itself.
 */
export function detectEncodings(input: string, limit = 3): EncodingGuess[] {
  const value = input.trim()
  if (value.length < 4 || value.length > 100_000) {
    return []
  }
  const guesses: EncodingGuess[] = []
  for (const [operation, looksRight] of SHAPES) {
    if (guesses.length >= limit || !looksRight(value)) {
      continue
    }
    try {
      const result = transform(operation, "decode", value)
      // Unreadable bytes, or nothing actually decoded: not a useful guess.
      if (
        !result.note?.startsWith("The decoded bytes") &&
        result.output !== value
      ) {
        guesses.push({ operation, name: getEncoding(operation).name })
      }
    } catch {
      // It only looked like it.
    }
  }
  return guesses
}
