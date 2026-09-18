
## Critical: The `|` vs `||` Corruption

The OpenCode `edit` tool has a known bug: it collapses `||` (logical OR) 
down to `|` (bitwise OR) during diff comparison, then refuses to write 
because oldString === newString.

Rule: **If you see a single `|` where `||` belongs in TypeScript code, 
STOP editing that file with `edit`. Instead:**

1. Read the entire file
2. Fix all corrupted pipes in your head
3. Use the `write` tool to replace the whole file

Do not attempt to fix it with more `edit` calls — each attempt collapses 
the pipe again and the tool reports "no changes to apply."
