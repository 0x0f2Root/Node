import type { Metadata } from "next"

import { ReverseShell } from "@/components/tools/reverse-shell/reverse-shell"

export const metadata: Metadata = {
  title: "Reverse Shell Generator",
  description:
    "Generate common reverse shell payloads for authorized security testing, CTFs, labs, and technical environments.",
}

export default function ReverseShellPage() {
  return <ReverseShell />
}
