# Pawfolio

Warm cat health tracker for three cats.

## Run

Install deps:

```bash
bun install
```

Copy config:

```bash
cp .env.example .env
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

If unset, dev default is `pawfolio`. Production requires `OWNER_UNLOCK_CODE`.

Config:

```text
PORT=3001
OWNER_UNLOCK_CODE=pawfolio
PAWFOLIO_DATA_DIR=data/cats
PAWFOLIO_UPLOADS_DIR=data/uploads
VITE_DEV_API_URL=http://localhost:3001
```

Data:

```text
data/cats/teddy.json
data/cats/toffee.json
data/cats/toey.json
data/uploads/
```

## Checks

```bash
bun run lint
bun run format:check
bun test
bun run build
bun run check
```

## Agent Docs

- `AGENTS.md`: shared agent rules.
- `CONTEXT.md`: domain glossary.
- `PRODUCT.md`: product/design direction.
- `docs/adr/`: architectural decisions.
- `.scratch/`: local markdown issues and ignored logs.
