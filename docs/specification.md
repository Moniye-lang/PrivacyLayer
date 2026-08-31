# Privacy Layer — Formal Specification & Architecture Standards

## 1. Overview & Core Invariants

Privacy Layer is an enterprise-ready, deterministic trust layer designed to intercept, analyze, sanitize, and restore AI/LLM text streams without relying on external AI or probabilistic LLM/NER models.

### Key Architectural Invariants:
1. **Deterministic Execution**: Zero AI/LLM dependencies in detection, resolution, or restoration.
2. **Parallel Detection Pipeline**: Independent detectors execute concurrently (`Promise.all`), returning standardized candidate detections with explicit confidence, priority, and sanitized evidence descriptions.
3. **Identity-Based Span Resolution**: Overlapping text spans are resolved using an explicit **Entity Compatibility Matrix**. Overlaps between compatible entities are merged; incompatible entities are resolved strictly by priority authority.
4. **Strict Plaintext Isolation**: Plaintext values are accessible exclusively during `ShieldEngine` setup (prior to encryption) and `RevealEngine` execution (during substitution). Plaintext values are **never** logged, cached, serialized, API-returned, or stored in processing records. Working memory containing plaintext mappings is explicitly zeroized post-restoration.
5. **Pluggable Security & Persistence**: Data encryption at rest uses standard `EncryptionProvider` abstractions (`AESGCMEncryptionProvider` for production, `NoOpEncryptionProvider` for development). Session metadata is managed via `RevealStore` with activity-based TTL refresh.

---

## 2. Placeholder Grammar & Token Format

All masked entities in output prompts follow a strict grammar:

```
[[ENTITY_TYPE_INDEX]]
```

### Formatting Rules:
- **Enclosure**: Double square brackets `[[ ... ]]`.
- **ENTITY_TYPE**: Upper snake_case representation of the `EntityType` (e.g., `EMAIL_ADDRESS`, `API_KEY`, `PERSON_NAME`, `CONNECTION_STRING`).
- **INDEX**: 3-digit zero-padded 1-based incremental counter per entity type within a document session (e.g., `001`, `002`, `012`).

### Examples:
- `[[EMAIL_ADDRESS_001]]`
- `[[API_KEY_001]]`
- `[[PERSON_NAME_001]]`
- `[[PERSON_NAME_002]]`

---

## 3. Priority Level Hierarchy

Detection rules are assigned strict numeric priority levels (range 1-100). When candidate detections overlap or conflict, higher priority levels supersede lower ones.

| Level | Priority Constant | Numeric Value | Description / Source |
|---|---|---|---|
| 1 | `MANUAL` | 100 | Explicit manual overrides submitted by users |
| 2 | `REGEX` | 90 | High-precision regex pattern matchers & secret scanners |
| 3 | `DICTIONARY` | 80 | Multi-tier dictionary terms (User, Team, Org) |
| 4 | `CONTEXT` | 70 | Structural and syntactic context rules |
| 5 | `HEURISTIC` | 60 | Generalized heuristics and fallback pattern rules |

---

## 4. Entity Compatibility Matrix Rules

Overlapping candidate detections are evaluated through a pairwise **Compatibility Matrix**.

- **Compatible Entities**: Types that represent different perspectives of the same underlying credential or structure (e.g., `URL` and `CONNECTION_STRING`, `JWT_TOKEN` and `API_KEY`). When candidate spans overlap and are compatible, the spans are merged into a single span assigned to the higher-priority entity type.
- **Incompatible Entities**: Types that represent distinct domain entities (e.g., `PERSON_NAME` and `EMAIL_ADDRESS`, `PERSON_NAME` and `PROJECT_CODENAME`). Overlapping incompatible spans are NOT merged; the higher priority candidate overrides the conflicting region, preventing duplicate masking and preserving non-overlapping boundaries.

### Pairwise Compatibility Standard:
- `CONNECTION_STRING` ↔ `URL`, `PASSWORD`, `API_KEY` => **COMPATIBLE**
- `JWT_TOKEN` ↔ `API_KEY`, `SOURCE_CODE_SECRET` => **COMPATIBLE**
- `PERSON_NAME` ↔ `EMAIL_ADDRESS`, `PROJECT_CODENAME`, `ORGANIZATION` => **INCOMPATIBLE**
- `LOCATION` ↔ `ADDRESS` => **INCOMPATIBLE** (Specific span resolved by priority)

---

## 5. Span Resolver Algorithm

The `SpanResolver` takes candidate detections from parallel detectors and produces a non-overlapping, optimized set of `ResolvedDetection` items:

1. **Sort**: Candidates are ordered by starting position ascending, followed by span length descending, and priority descending.
2. **Compatibility & Merge**:
   - For consecutive overlapping spans $A$ and $B$:
     - If `CompatibilityMatrix.areCompatible(A.type, B.type)` is `true`:
       - Merge into a combined span `[min(A.start, B.start), max(A.end, B.end)]`.
       - Assign the entity type with the higher priority (`A.priority >= B.priority ? A.type : B.type`).
     - If `CompatibilityMatrix.areCompatible(A.type, B.type)` is `false`:
       - Resolve conflict by priority authority: candidate with higher priority takes precedence over the overlapping region.
3. **Deduplication**: Eliminate duplicate exact-match spans.

---

## 6. Security, Encryption & Reveal Guarantees

### Memory Zeroization Policy:
- Upon completion of `RevealEngine.restore(...)`, intermediate plaintext arrays, objects, and key-value mapping references are overwritten / zeroized (e.g., setting string values to `null`/empty and clearing references) to minimize plaintext lifecycle in V8 heap memory.

### Security Guarantees:
- **Zero Evidence Leakage**: Detector evidence strings MUST contain sanitized descriptions (e.g., `"Matches MongoDB connection format"`) and NEVER output sensitive substring matches.
- **Decoupled Reveal Engine**: `RevealEngine` requires only `sessionId` and `aiResponse`. It has zero dependency on detection modules or context rules.

---

## 7. `RevealSession` Lifecycle & Activity-Based TTL

A `RevealSession` represents encrypted mapping state associated with a masked document.

### Properties:
- `sessionId`: Unique identifier string (`shd_...`).
- `documentId`: Optional document/source correlation ID.
- `encryptedMappings`: AES-256-GCM encrypted payload containing original plaintext entity mappings.
- `createdAt`: ISO 8601 creation timestamp.
- `lastActivity`: ISO 8601 timestamp updated on every touch/reveal access.
- `expiresAt`: ISO 8601 expiration timestamp (calculated from `lastActivity + TTL`).

### TTL Refresh:
- Reading a session via `RevealStore.get(sessionId)` automatically updates `lastActivity` to `currentTime` and extends `expiresAt` by the configured TTL window.

---

## 8. Immutable `ProcessingRecord` Schema

Every masking operation generates an immutable `ProcessingRecord` for audit and governance:

```typescript
export interface ProcessingRecord {
  readonly recordId: string;
  readonly engineVersion: string;
  readonly detectorsExecuted: string[];
  readonly entitiesDetected: number;
  readonly entitiesMasked: number;
  readonly manualOverrideCount: number;
  readonly executionTimeMs: number;
  readonly timestamp: string;
}
```

**Invariant**: `ProcessingRecord` must NOT contain plaintext strings, prompt snippets, or placeholder mappings.

---

## 9. System Failure Behavior

- **Fail-Secure**: If encryption or reveal key verification fails, the engine throws an explicit `SecurityException` and refuses to emit partially decrypted plaintext.
- **Graceful Error Handling**: If an individual detector fails, the `ParallelDetectorManager` captures the error, logs telemetry, and continues execution with candidate detections from remaining parallel detectors.
