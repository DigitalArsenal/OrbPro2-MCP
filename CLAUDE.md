# Claude Code Instructions for OrbPro2-MCP

## Design principles

Before any code or structural change, read the stack's design principles and follow their hard rule (refactor to the principle first, then change behavior): `../../../docs/policies/design-principles.md` inside the spacedatanetwork-stack checkout, or https://github.com/DigitalArsenal/spacedatanetwork-stack/blob/main/docs/policies/design-principles.md.

## CRITICAL: File System Boundaries

**NEVER modify files outside this repository.**

- Only read/write/edit files within `/Users/tj/software/OrbPro2-MCP/`
- You may READ files in sibling directories for reference
- You must NEVER WRITE or EDIT files outside this repository
- If asked to update documentation in other repos, inform the user and provide the content for them to apply manually

## Key Directories

- `/src` - TypeScript source code
- `/packages/mcp-server-cpp` - C++/WASM MCP server
- `/training` - LLM training data and scripts
