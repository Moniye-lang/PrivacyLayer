# ADR 0003: Multi-Detector Confidence Fusion & Span Resolution

## Status
**Accepted**

## Context
Sensitivity detection in Privacy Layer is performed by multiple independent detectors operating over the same prompt text:
- Secret Scanner (high-entropy credentials, URIs, keys)
- User Dictionaries (permanently registered terms)
- General Regex Scanner (emails, phone numbers, cards, SSN, IBAN)
- Offline NER Gazetteers (multicultural names, locations, orgs, projects)
- Context Engine (surrounding word relational rules)
- Syntactic Engine (proper noun & identifier syntax)

Different detectors may flag overlapping character spans or disagree on entity categorization. A single detector alone is insufficient to determine entity classification with maximum confidence.

## Decision
We implement a **Multi-Detector Confidence Fusion Engine** (`stage5Fusion.ts`):
1. **Span Grouping**: Overlapping character intervals `[start, end]` identified across all detectors are aggregated into candidate span buckets.
2. **Detector Voting**: Each detector contributes an explicit vote (`DetectorVote`) containing its stage (`SECRET`, `DICTIONARY`, `REGEX`, `NER`, `CONTEXT`, `SYNTACTIC`), assigned `EntityType`, `confidence` score (0.0 - 1.0), and human-readable `reason`.
3. **Composite Confidence Formula**:
   - Votes are grouped per `EntityType`.
   - The base confidence for an entity type is the maximum confidence vote cast for that type.
   - A multi-detector agreement bonus (+0.03 per additional confirming detector) is added to reward consensus across independent detection methods up to a maximum cap of 0.99 (99%).
4. **Boundary Resolution**: When overlapping spans have different lengths, the engine prioritizes longer entity boundaries (e.g. "Acme Corporation" over "Acme").
5. **Full Transparency**: Every `DetectedEntity` retains the full array of detector `votes` so users can inspect exact scoring breakdown in the UI.

## Consequences
- High precision and minimal false positives.
- Clear, explainable diagnostic evidence for why an entity was masked.
- Smooth span resolution for multi-word entities and adjacent tokens.
