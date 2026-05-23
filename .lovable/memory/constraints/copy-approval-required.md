# Copy Approval Required

All user-facing text changes must be approved by the user before implementation.

## Scope
- Headings (h1, h2, h3, etc.)
- Button labels and text
- Form labels and placeholder text
- Error messages and success notifications
- Tooltips and microcopy
- SEO meta titles and descriptions
- Any other text visible to the end-user

## Exemptions
- Code comments
- Internal logs
- Backend-only strings (IDs, slugs, keys)
- File names
- Variable and function names

## Process
1. Identify all affected text strings in the requested task.
2. Present the proposed changes in the chat as `Old text → New text` with the file path.
3. Wait for explicit user approval (e.g., "OK", "Go ahead").
4. Only after approval, apply the changes to the source files.
