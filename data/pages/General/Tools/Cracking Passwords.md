---
tags:
  - "Cracking Passwords"
  - "Passwords"
---

<Callout type="info" title="How to extract and crack ZIP file passwords with zip2john and John the Ripper">
  [https://keydecryptor.com/blog/zip2john-tutorial](https://keydecryptor.com/blog/zip2john-tutorial)
</Callout>

# John the Ripper, `zip2john` & Hashcat — Cheat Sheet

> For authorized password recovery, CTFs, and systems you own or have explicit permission to test.

## 1. Quick Mental Model

- **John the Ripper (`john`)**: Password-recovery tool supporting wordlist and incremental attacks.
- **`zip2john`**: Utility included with John the Ripper that extracts password-verification data from protected ZIP archives.
- **Hashcat (`hashcat`)**: Password-recovery tool optimized for supported CPU and GPU backends. It requires the correct hash mode.

### Typical ZIP workflow

1. Extract the ZIP hash using `zip2john`.
2. Save the output to a text file.
3. Test it with John or, if compatible, Hashcat.
4. Display recovered passwords.

---

## 2. Find the Tools

```bash
command -v john
command -v zip2john
command -v hashcat

john --list=formats
hashcat --version
```

### Add John utilities to PATH (Zsh)

If the utilities are located in `/usr/local/bin/john`:

```bash
echo 'export PATH="/usr/local/bin/john:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

`PATH` searches each listed directory, not its subdirectories.

Check the executable:

```bash
ls -l /usr/local/bin/john/zip2john
file /usr/local/bin/john/zip2john
```

Run it using its full path if necessary:

```bash
/usr/local/bin/john/zip2john
```

---

## 3. Extract a ZIP Hash with `zip2john`

### Save the extracted hash

```bash
zip2john archive.zip > zip.hash
```

Using the full path:

```bash
/usr/local/bin/john/zip2john archive.zip > zip.hash
```

Inspect the output:

```bash
head -n 2 zip.hash
wc -l zip.hash
```

**Important:** Keep the complete extracted hash line intact. The output may include filenames and format-specific fields.

### Common mistakes

- **No password hashes loaded:** The output might be malformed, unsupported, or contain unexpected text.
- **Wrong file path:** Verify the archive exists using `ls -l archive.zip`.
- **ZIP encryption differences:** Supported formats depend on the encryption scheme and tool version.
- **Wrong file contents:** `zip.hash` must contain the output from `zip2john`, not the ZIP archive's binary data.

---

## 4. John the Ripper Basics

### Wordlist attack

```bash
john --wordlist=/path/to/wordlist.txt zip.hash
```

### Show recovered passwords

```bash
john --show zip.hash
```

### Resume an interrupted session

```bash
john --restore
```

### List supported formats

```bash
john --list=formats
```

### Specify a format

Only use this when you know the correct format:

```bash
john --format=FORMAT_NAME \
  --wordlist=/path/to/wordlist.txt hashes.txt
```

### Manage sessions

```bash
john --session=zip-recovery \
  --wordlist=/path/to/wordlist.txt zip.hash

john --status
john --restore=zip-recovery
```

---

## 5. Hashcat Basics

Hashcat requires a hash mode (`-m`) that matches the exact hash format.

### Check version and devices

```bash
hashcat --version
hashcat -I
```

### View available modes

```bash
hashcat --help
```

You can also consult the official [Hashcat example hashes](https://hashcat.net/wiki/doku.php?id=example_hashes).

### Wordlist attack

```bash
hashcat -m MODE -a 0 hashes.txt /path/to/wordlist.txt
```

Options:

- `-m MODE`: Hash type or mode.
- `-a 0`: Straight (wordlist) attack.
- `hashes.txt`: Hashes in the expected input format.
- `wordlist.txt`: Candidate passwords.

### Apply rules to a wordlist

```bash
hashcat -m MODE -a 0 hashes.txt \
  /path/to/wordlist.txt \
  -r /path/to/rules.rule
```

### Show recovered results

```bash
hashcat -m MODE hashes.txt --show
```

### Restore a session

```bash
hashcat --restore
```

### Benchmark supported algorithms

```bash
hashcat -b
```

**Important:** `zip2john` output is not guaranteed to be compatible with Hashcat. Identify the ZIP encryption scheme and use the corresponding Hashcat mode and input format.

---

## 6. John vs. Hashcat

| Task | John the Ripper | Hashcat |
|---|---|---|
| General password recovery | `john hashes.txt` | `hashcat -m MODE hashes.txt ...` |
| Wordlist attack | `--wordlist=...` | `-a 0 ... wordlist.txt` |
| Show recovered passwords | `john --show hashes.txt` | `hashcat -m MODE hashes.txt --show` |
| Resume work | `john --restore` | `hashcat --restore` |
| Format selection | Often detects formats; supports `--format=` | Requires the appropriate `-m` mode |
| ZIP workflow | Convenient with `zip2john` | Requires a supported mode and compatible input |

---

## 7. Complete ZIP Recovery Workflow

```bash
# 1. Extract hash material from the ZIP
zip2john archive.zip > zip.hash

# 2. Check the extracted data
wc -l zip.hash
head -n 1 zip.hash

# 3. Run an authorized wordlist attack
john --wordlist=/path/to/wordlist.txt zip.hash

# 4. Display recovered results
john --show zip.hash
```

If you want to use Hashcat instead, first identify the ZIP encryption scheme and verify the expected input format. Do not assume the raw `zip2john` output can be passed directly to Hashcat.

---

## 8. Troubleshooting

### `zsh: command not found: zip2john`

```bash
echo "$PATH"
command -v zip2john
ls -l /usr/local/bin/john/zip2john
```

Add the directory containing the utility to your PATH:

```bash
echo 'export PATH="/usr/local/bin/john:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Permission denied

Check permissions:

```bash
ls -l /usr/local/bin/john/zip2john
```

If the trusted script or executable lacks execute permission:

```bash
chmod u+x /usr/local/bin/john/zip2john
```

### John reports no hashes loaded

```bash
wc -c zip.hash
head -n 2 zip.hash
```

- Confirm the file is not empty.
- Recreate the hash from the original ZIP archive.
- Check whether your John build supports the archive format.
- Avoid editing or truncating the extracted hash.

### Hashcat reports `Token length exception`

- The input might not match the selected `-m` mode.
- The hash may be in John-specific rather than Hashcat-compatible format.
- Verify the expected format in the [official example hashes](https://hashcat.net/wiki/doku.php?id=example_hashes).

### Inspect a ZIP archive

```bash
unzip -l archive.zip
```

This lists archive contents but does not conclusively identify every encryption detail.

---

## 9. Good Practices

- Only recover passwords from files and systems you own or are authorized to test.
- Preserve the original archive and hash files.
- Record tool versions, selected formats, wordlists, and session names.
- Avoid exposing recovered passwords in logs or shared terminals.
- Recovery time depends on password strength, encryption, hardware, and candidate strategy.

---

## References

- [John the Ripper](https://www.openwall.com/john/)
- [John documentation](https://www.openwall.com/john/doc/)
- [Hashcat](https://hashcat.net/hashcat/)
- [Hashcat example hashes](https://hashcat.net/wiki/doku.php?id=example_hashes)
- [Hashcat FAQ](https://hashcat.net/wiki/doku.php?id=frequently_asked_questions)
