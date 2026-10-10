import type { Metadata } from "next"

import { DataEncoding } from "@/components/tools/data-encoding/data-encoding"

export const metadata: Metadata = {
  title: "Data Encoding",
  description:
    "Encode and decode common data formats used during security testing, development, and technical analysis.",
}

export default function DataEncodingPage() {
  return <DataEncoding />
}
