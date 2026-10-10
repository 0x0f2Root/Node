---
tags:
  - "Guide"
---

# Writing in Markdown and MDX

Node opens each page in a rich editor. Use the **Visual** tab for a
WYSIWYG‑style writing experience, or the **MDX** tab to edit the raw source
with line numbers and syntax highlighting — switch any time from the top‑right
of a page.

Everything you type **autosaves** to the page's file.

## Markdown basics

You can use all the usual Markdown:

- **Bold**, _italic_, `inline code`
- Lists, like this one
- [Links](https://www.markdownguide.org)
- > Blockquotes for callouts

Headings structure a page and also power search:

### A sub‑heading

Fenced code blocks are syntax‑highlighted:

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

## Images

Paste or drop an image into the editor and Node saves it under
`data/pages/assets/` and links it with a relative path, so your images travel
with your notes.

## Tags

Add one or more tags to a page from the control under its title. Tags group
related pages and show in the sidebar — this page is tagged **Guide**.
