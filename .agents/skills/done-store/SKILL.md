---
name: done-store
description: >
  Export current Cursor agent conversation to Markdown and mark session ended.
  Trigger: /done-store
---

## Purpose
When user types `/done-store`, export this session chat to a Markdown file in:
`<repo-root>/.conversations/`

After export, stop: respond with only the saved file path (and no extra work).

## Trigger
`/done-store`

## Where to store
Output directory (repo-relative):
`.conversations/`

If it doesn't exist, create it.

## How to export (algorithm for the assistant)
1. Find repo root:
   - Run `git rev-parse --show-toplevel` to get `<repo-root>`.
2. Find the newest Cursor transcript JSONL for this project:
   - Base path:
     `~/.cursor/projects/Users-zablon-Work-qebero-dev/agent-transcripts/`
   - Recursively select the newest `*.jsonl` by modification time.
3. Read the JSONL file line-by-line and parse each JSON object.
4. For each object where `role` is `user` or `assistant`:
   - Extract `message.content[*].type === "text"` only.
   - Concatenate extracted `text` fragments with blank lines.
   - If no extracted text, skip the entry.
5. Convert into Markdown:
   - Add a section per entry:
     - `## User` or `## Assistant`
     - then the concatenated text block in a fenced code block (keeps tags intact).
   - Keep ordering as in the JSONL.
6. File name:
   - Use transcript UUID (folder name) + current timestamp:
     `conversation-<uuid>-YYYYMMDD-HHMMSS.md`
7. Write file to:
   `<repo-root>/.conversations/<file-name>`
8. Reply to user:
   - `Saved: <absolute-path>`

## Notes
- Do not reference or “cite” transcript files directly in the user response; only report the saved Markdown path.
- If transcript parsing fails, report the error and do not write a partial file.

