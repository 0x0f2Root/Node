---
tags:
  - "Guide"
---

# Developer tools

The **Tools** section in the sidebar collects small, local utilities for
technical and security work. Everything runs in your browser — nothing is sent
to a server.

## Data Encoding

Encode and decode common formats: Base64 / Base64URL, URL and double‑URL, Hex,
HTML entities, Base32, binary, ASCII character codes, Unicode escapes, and a
JWT payload decoder. Pick a format, choose **Encode** or **Decode**, and it
transforms as you go. Handy for debugging, CTFs and quick conversions.

## Reverse Shell generator

A reference generator for common reverse‑shell one‑liners (Bash, Netcat,
Python, PHP, PowerShell and more), for **authorized** security testing, CTFs
and labs. Set the listener **LHOST** and **LPORT** and every snippet updates
live; copy the one you need. It only generates text — it never runs anything.

## HackTheBox tracker (optional)

The Home page can show a HackTheBox profile tracker (rank, owns, challenge
progress) from a public profile. It's off until you add a profile in
**Settings → HackTheBox**. Listing individual solves needs a personal App
Token, read from a local `.env.local` file — see the README. Your token stays
on your machine and is never committed.

---

That's the tour. Delete this **Getting Started** workspace whenever you're
ready and make Node your own.
