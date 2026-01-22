# Claude Code Instructions for OrbPro2-ModSim

## CRITICAL: File System Boundaries

**NEVER modify files outside this repository.**

- Only read/write/edit files within `/Users/tj/software/OrbPro2-ModSim/`
- You may READ files in sibling directories (e.g., `../flatbuffers/`, `../OrbPro/`) for reference
- You must NEVER WRITE or EDIT files outside this repository
- If asked to update documentation in other repos, inform the user and provide the content for them to apply manually

## Key Directories

- `/core` - Thin plugin loader (minimal code)
- `/schemas` - x-flatbuffer IDL files
- `/plugins` - Plugin implementations
- `/sdk` - Plugin development kit
