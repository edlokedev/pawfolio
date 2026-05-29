# Pawfolio

Warm cat health tracker for three cats.

## Run

Install deps:

```bash
bun install
```

Start API:

```bash
bun run dev:api
```

Start web:

```bash
bun run dev:web
```

Open:

```text
http://localhost:5173
```

API:

```text
http://localhost:3001/api/cats
```

## Checks

```bash
bun test
bun run build
```

## Agent Docs

- `AGENTS.md`: shared agent rules.
- `CONTEXT.md`: domain glossary.
- `PRODUCT.md`: product/design direction.
- `docs/adr/`: architectural decisions.
- `.scratch/`: local markdown issues and ignored logs.
