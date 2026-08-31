# ADR 0002: Placeholder Format Design and Lossless Reveal Engine

## Status
**Accepted**

## Context
When sensitive entities are detected in a user's prompt, they are replaced with structured placeholders before the prompt is sent to external AI providers (ChatGPT, Claude, Gemini, Cursor, etc.). When the AI responds, the **Reveal Engine** must restore all placeholders to their original sensitive values.

The Reveal step faces several challenges:
1. **AI Formatting Wrappers**: AI models frequently wrap placeholders in Markdown bold (`**[[PERSON_001]]**`), code spans (`` `[[PERSON_001]]` ``), bullet points, or table cells (`| [[PERSON_001]] |`).
2. **Placeholder Repetition**: An AI model might reference a placeholder multiple times across its generated response.
3. **Paragraph Reordering & Restructuring**: AI responses reorganize content, change word order, or introduce new surrounding text.
4. **Whitespace Variants**: AI models may insert subtle spaces inside bracket delimiters (e.g. `[[ PERSON_001 ]]` or `[PERSON_001]`).

## Decision
1. **Standardized Placeholder Syntax**: Use double square brackets with typed category shortcodes and zero-padded sequential counters: `[[CATEGORY_INDEX]]` (e.g., `[[PERSON_001]]`, `[[CONNECTION_STRING_001]]`, `[[PROJECT_001]]`).
   - Category-specific prefixes preserve semantic context for the AI without leaking sensitive data (e.g., the AI knows `[[PERSON_001]]` represents a person and `[[CONNECTION_STRING_001]]` represents a database connection URI).
2. **Flexible Pattern Matching in Reveal**:
   - The Reveal Engine uses flexible regular expression patterns matching single or double brackets, leading/trailing whitespace, and markdown syntax wrappers: `\[{1,2}\s*KEY\s*\]{1,2}`.
   - All occurrences of each placeholder key are replaced in a single pass across the entire AI response body.
3. **Lossless Restoration**:
   - Mappings are stored in an encrypted, session-bounded ephemeral vault (`placeholderToRawMap`).
   - Every single placeholder instance—regardless of repetition count, position, or markdown formatting—is restored losslessly to its exact original text.

## Consequences
- AI models maintain context while reading shielded prompts.
- Restored responses fit cleanly back into the user's workspace without leftover bracket artifacts.
- The Reveal step operates reliably across all major AI providers (ChatGPT, Claude, Gemini, Cursor, Copilot, DeepSeek).
