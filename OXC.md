# Oxc Configuration

This project uses [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting and [oxc](https://oxc.rs/) for code formatting.

## Installed Packages

- `oxlint` - Fast JavaScript/TypeScript linter (1.42.0)
- `oxc` - JavaScript Oxidation Compiler with formatting capabilities (1.0.1)

## Configuration Files

### .oxlintrc.json
Linting configuration with plugins for:
- `import` - Import/export rules
- `typescript` - TypeScript-specific rules
- `unicorn` - Various helpful rules

Key rules enabled:
- `no-unused-vars` (error)
- `no-debugger` (error)
- `no-console` (warn)
- `no-double-equals` (error)
- `no-explicit-any` (warn)
- And more...

### oxc.json
Formatter configuration:
- Indent: 2 spaces
- Line width: 100 characters
- Line ending: LF

## Available Commands

### npm/pnpm scripts

```bash
# Type checking
pnpm run typecheck

# Linting
pnpm run lint          # Check for issues
pnpm run lint:fix      # Auto-fix issues

# Formatting (experimental)
pnpm run format        # Format all files
pnpm run format:check  # Check formatting without writing
```

### Just commands

```bash
just typecheck        # TypeScript type checking
just lint             # Run oxlint
just lint-fix         # Auto-fix linting issues
just format           # Format code with oxc
just format-check     # Check formatting
just check            # Run all quality checks (typecheck + lint + format-check)
```

## Notes

- The oxc formatter is currently experimental and may have some limitations
- oxlint is extremely fast and catches many common issues
- Console warnings are set to "warn" level since this is a CLI tool that uses console output
- Ignored directories: `dist/`, `node_modules/`, `out/`
