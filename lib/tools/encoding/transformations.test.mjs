// Run with `pnpm test`. Node's own test runner is used, and the module is
// compiled with the TypeScript the project already has, so the
// transformation layer needs no test dependency. That works because
// transformations.ts imports nothing.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, test } from "node:test"
import ts from "typescript"

const source = readFileSync(
  new URL("./transformations.ts", import.meta.url),
  "utf8"
)
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText
const { ENCODINGS, EncodingError, detectEncodings, transform, transformChain } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  )

const encode = (operation, input, options) =>
  transform(operation, "encode", input, options).output
const decode = (operation, input) =>
  transform(operation, "decode", input).output

function rejects(operation, input, message) {
  assert.throws(
    () => transform(operation, "decode", input),
    (error) => {
      assert.ok(error instanceof EncodingError, "throws an EncodingError")
      assert.match(error.message, message)
      return true
    }
  )
}

describe("Base64", () => {
  test("encodes and decodes", () => {
    assert.equal(encode("base64", "hello"), "aGVsbG8=")
    assert.equal(decode("base64", "aGVsbG8="), "hello")
  })
  test("handles UTF-8, whitespace and missing padding", () => {
    assert.equal(decode("base64", encode("base64", "año €")), "año €")
    assert.equal(decode("base64", "aGVs\nbG8"), "hello")
  })
  test("rejects invalid input", () => {
    rejects("base64", "aGVsbG8_", /Invalid Base64/)
    rejects("base64", "a", /Invalid Base64/)
  })
  test("notes bytes that are not text", () => {
    assert.match(transform("base64", "decode", "//4=").note, /not valid UTF-8/)
  })
})

describe("Base64URL", () => {
  test("uses the URL-safe alphabet without padding", () => {
    assert.equal(encode("base64url", "subjects?_d=1"), "c3ViamVjdHM_X2Q9MQ")
    assert.equal(encode("base64", "subjects?_d=1"), "c3ViamVjdHM/X2Q9MQ==")
  })
  test("decodes with or without padding", () => {
    assert.equal(decode("base64url", "c3ViamVjdHM_X2Q9MQ"), "subjects?_d=1")
    assert.equal(decode("base64url", "c3ViamVjdHM_X2Q9MQ=="), "subjects?_d=1")
  })
  test("rejects the standard alphabet", () => {
    rejects("base64url", "c3ViamVjdHM/X2Q9MQ", /Invalid Base64URL/)
  })
})

describe("URL encoding", () => {
  test("encodes and decodes", () => {
    assert.equal(encode("url", "hello world"), "hello%20world")
    assert.equal(decode("url", "hello%20world"), "hello world")
    assert.equal(decode("url", encode("url", "a&b=c/d?é")), "a&b=c/d?é")
  })
  test("can encode every character", () => {
    assert.equal(encode("url", "../"), "..%2F")
    assert.equal(encode("url", "../", { encodeAll: true }), "%2e%2e%2f")
  })
  test("rejects malformed percent encoding", () => {
    rejects("url", "100%", /Malformed percent encoding/)
    rejects("url", "%zz", /Malformed percent encoding/)
  })
})

describe("Double URL encoding", () => {
  test("applies two levels", () => {
    assert.equal(encode("double-url", "a b"), "a%2520b")
    assert.equal(
      encode("double-url", "../", { encodeAll: true }),
      "%252e%252e%252f"
    )
  })
  test("removes two levels", () => {
    assert.equal(decode("double-url", "%252e%252e%252f"), "../")
    assert.equal(decode("double-url", encode("double-url", "x/y z")), "x/y z")
    // One level only: decoding once more leaves it unchanged.
    assert.equal(decode("double-url", "%2e%2e%2f"), "../")
  })
})

describe("Hex", () => {
  test("encodes and decodes", () => {
    assert.equal(encode("hex", "hello"), "68656c6c6f")
    assert.equal(decode("hex", "68656c6c6f"), "hello")
  })
  test("accepts common ways of writing hex", () => {
    assert.equal(decode("hex", "68 65 6C 6C 6F"), "hello")
    assert.equal(decode("hex", "0x68 0x69"), "hi")
    assert.equal(decode("hex", "\\x68\\x69"), "hi")
  })
  test("rejects invalid input", () => {
    rejects("hex", "abc", /Invalid hexadecimal/)
    rejects("hex", "zz", /Invalid hexadecimal/)
  })
})

describe("HTML entities", () => {
  test("encodes the characters that matter", () => {
    assert.equal(encode("html", "<"), "&lt;")
    assert.equal(
      encode("html", `<a href="x">'&'</a>`),
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
    )
  })
  test("decodes named and numeric entities", () => {
    assert.equal(decode("html", "&lt;"), "<")
    assert.equal(decode("html", "&#60;&#x3c;&#X3C;&amp;&copy;"), "<<<&©")
    assert.equal(decode("html", encode("html", "<b>&</b>")), "<b>&</b>")
  })
  test("can encode every character, and leaves unknown names alone", () => {
    assert.equal(encode("html", "a<", { encodeAll: true }), "&#x61;&#x3c;")
    assert.equal(decode("html", "&nosuchentity; &"), "&nosuchentity; &")
  })
})

describe("Base32", () => {
  test("matches the RFC 4648 vectors", () => {
    assert.equal(encode("base32", "f"), "MY======")
    assert.equal(encode("base32", "foobar"), "MZXW6YTBOI======")
    assert.equal(encode("base32", "hello"), "NBSWY3DP")
  })
  test("is symmetric, case-insensitive and padding-optional", () => {
    for (const sample of ["", "a", "ab", "abc", "abcd", "abcde", "año €"]) {
      assert.equal(decode("base32", encode("base32", sample)), sample)
    }
    assert.equal(decode("base32", "mzxw6ytboi"), "foobar")
  })
  test("rejects invalid input", () => {
    rejects("base32", "MZXW1", /Invalid Base32/)
    rejects("base32", "M", /Invalid Base32/)
  })
})

describe("Binary", () => {
  test("encodes and decodes", () => {
    assert.equal(encode("binary", "hi"), "01101000 01101001")
    assert.equal(decode("binary", "01101000 01101001"), "hi")
    assert.equal(decode("binary", "0110100001101001"), "hi")
  })
  test("rejects invalid input", () => {
    rejects("binary", "0110100", /Invalid binary/)
    rejects("binary", "01101002", /Invalid binary/)
  })
})

describe("ASCII character codes", () => {
  test("encodes and decodes", () => {
    assert.equal(encode("ascii", "Node"), "78 111 100 101")
    assert.equal(decode("ascii", "78 111 100 101"), "Node")
    assert.equal(decode("ascii", "78,111, 0x64 101"), "Node")
  })
  test("rejects what is not a code", () => {
    rejects("ascii", "78 x", /Invalid character code/)
    rejects("ascii", "99999999", /Invalid character code/)
  })
})

describe("Unicode escapes", () => {
  test("encodes and decodes", () => {
    assert.equal(encode("unicode", "a"), "\\u0061")
    assert.equal(decode("unicode", "\\u0061"), "a")
    assert.equal(decode("unicode", encode("unicode", "año 😀")), "año 😀")
  })
  test("understands braces and \\x, and leaves other text alone", () => {
    assert.equal(
      decode("unicode", "\\u{1F600} \\x41 plain \\n"),
      "😀 A plain \\n"
    )
  })
})

describe("JWT", () => {
  const part = (value) => encode("base64url", JSON.stringify(value))
  const token = `${part({ alg: "HS256", typ: "JWT" })}.${part({
    sub: "1234567890",
    name: "Sample User",
    iat: 1516239022,
  })}.c2lnbmF0dXJl`

  test("decodes the header and payload and keeps the signature apart", () => {
    const result = transform("jwt", "decode", token)
    assert.deepEqual(
      result.sections.map((section) => section.title),
      ["Header", "Payload", "Signature (not verified)"]
    )
    assert.deepEqual(JSON.parse(result.sections[0].content), {
      alg: "HS256",
      typ: "JWT",
    })
    assert.equal(JSON.parse(result.sections[1].content).name, "Sample User")
    assert.equal(result.sections[2].content, "c2lnbmF0dXJl")
    assert.match(result.note, /Issued: 2018-01-18T01:30:22\.000Z/)
  })
  test("accepts a Bearer prefix and pretty-prints", () => {
    const result = transform("jwt", "decode", `Bearer ${token}\n`)
    assert.match(result.sections[1].content, /\n {2}"sub": "1234567890"/)
  })
  test("rejects malformed tokens", () => {
    rejects("jwt", "not-a-token", /Malformed JWT/)
    rejects("jwt", "a.b", /Malformed JWT/)
    rejects("jwt", "$$$.e30.x", /Invalid JWT header/)
    rejects("jwt", `${encode("base64url", "not json")}.e30.x`, /not valid JSON/)
  })
  test("cannot be encoded", () => {
    assert.throws(() => transform("jwt", "encode", "{}"), EncodingError)
  })
})

describe("the engine", () => {
  test("every sample round-trips or decodes cleanly", () => {
    for (const encoding of ENCODINGS) {
      for (const mode of encoding.modes) {
        const sample = encoding.samples[mode]
        assert.ok(sample, `${encoding.id} has a ${mode} sample`)
        assert.doesNotThrow(() => transform(encoding.id, mode, sample))
      }
    }
  })
  test("chains steps", () => {
    const result = transformChain(
      [
        { operation: "url", mode: "decode" },
        { operation: "base64", mode: "decode" },
        { operation: "hex", mode: "decode" },
      ],
      "NjE2Mg%3D%3D"
    )
    assert.equal(result.output, "ab")
  })
  test("never evaluates its input", () => {
    globalThis.__encodingToolRan = false
    const payload = "globalThis.__encodingToolRan = true"
    for (const encoding of ENCODINGS) {
      for (const mode of encoding.modes) {
        try {
          transform(encoding.id, mode, payload)
          transform(encoding.id, mode, encode("base64", payload))
        } catch (error) {
          assert.ok(error instanceof EncodingError)
        }
      }
    }
    assert.equal(globalThis.__encodingToolRan, false)
  })
})

describe("detection", () => {
  const guess = (input) => detectEncodings(input).map((item) => item.operation)

  test("recognises common encoded shapes", () => {
    assert.deepEqual(guess("aGVsbG8gd29ybGQ="), ["base64"])
    assert.deepEqual(guess("hello%20world"), ["url"])
    assert.equal(guess("%252e%252e%252f")[0], "double-url")
    assert.deepEqual(guess("&lt;b&gt;"), ["html"])
    assert.deepEqual(guess("\\u0061\\u00f1"), ["unicode"])
    assert.deepEqual(guess("01101000 01101001"), ["binary"])
    assert.equal(guess("68656c6c6f")[0], "hex")
    assert.equal(guess("NBSWY3DPEBLW64TMMQ======")[0], "base32")
    assert.equal(guess("c3ViamVjdHM_X2Q9MQ")[0], "base64url")
  })
  test("recognises a JWT first", () => {
    const part = (value) =>
      transform("base64url", "encode", JSON.stringify(value)).output
    assert.equal(
      guess(`${part({ alg: "none" })}.${part({ sub: "1" })}.sig`)[0],
      "jwt"
    )
  })
  test("stays quiet for ordinary text", () => {
    assert.deepEqual(guess("hello world"), [])
    assert.deepEqual(guess("password"), [])
    assert.deepEqual(guess("12345678"), [])
    assert.deepEqual(guess(""), [])
  })
})
