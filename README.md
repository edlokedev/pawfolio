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

Owner unlock:

```bash
OWNER_UNLOCK_CODE=pawfolio bun run dev:api
```

If unset, dev default is `pawfolio`.

Data:

```text
data/cats/luna.json
data/cats/mochi.json
data/cats/nori.json
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
