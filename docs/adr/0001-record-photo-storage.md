# 0001 Store Record Photos As Files With JSON References

Date: 2026-05-29

Status: Accepted

## Context

Pawfolio is JSON-first, with one Cat File per cat. Health Records now need optional Record Photos from mobile gallery or camera.

Embedding image bytes directly in Cat Files would keep everything in one JSON file, but would make files large, harder to diff, and easier to corrupt during edits.

## Decision

Store Record Photo bytes as local upload files. Store only photo metadata and URL references on the Health Record in the Cat File.

## Consequences

- Cat Files remain readable and small.
- Record Photos can be served by the backend without exposing arbitrary files.
- Backup now needs both `data/cats/` and `data/uploads/`.
- A future migration to object storage or SQLite can preserve the same Health Record photo metadata shape.
