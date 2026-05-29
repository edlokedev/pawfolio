# Pawfolio Agent Rules

## Voice

Use `caveman` always. Terse, exact, no fluff. Keep technical terms exact. Drop filler.

## Start Every Question Or Task

Use `grill-with-docs` first.

- Read `CONTEXT.md`, `CONTEXT-MAP.md` if present, `docs/adr/`, and relevant code.
- If answer discoverable from repo, inspect instead of asking.
- If ambiguity remains, ask one sharp question with recommended answer.
- When term resolved, update `CONTEXT.md` inline.
- Create ADR only when decision is hard to reverse, surprising, and trade-off based.

## Implementation

Use `tdd` for implementation.

- Confirm public interface and key behaviors.
- Red-green one vertical slice at time.
- Test behavior through public interface, not internals.
- Refactor only when green.
- After code changes, run `bun run lint`, `bun run format:check`, and relevant tests before done.
- `bun run check` must include Oxlint and Oxfmt check.

## Context7

Use Context7 MCP for current docs whenever user asks about library, framework, SDK, API, CLI tool, or cloud service.

Steps:

1. `resolve-library-id` unless exact `/org/project` ID given.
2. Pick best match by exact name, relevance, snippets, reputation, score.
3. `query-docs` with full user question.
4. Answer from fetched docs.

Skip Context7 for refactors, scripts from scratch, business logic debugging, code review, general programming concepts.

## Agent Skills

### Issue Tracker

Local markdown issues live under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage Labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain Docs

Single-context repo: root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.
