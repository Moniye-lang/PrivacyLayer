# ADR 0001: 100% Deterministic Detection Engine Architecture

## Status
**Accepted**

## Context
Privacy Layer is a privacy-first platform designed to detect, mask, and restore sensitive information before prompts reach any AI model (ChatGPT, Claude, Gemini, Cursor, etc.). 

A common pitfall in modern privacy tools is using an upstream Large Language Model (LLM) or remote AI service to classify whether text contains sensitive data. Relying on remote LLMs for sensitive data detection creates severe privacy risks:
1. **Privacy Contradiction**: Sending raw sensitive data to a cloud LLM to ask "is this sensitive?" violates the user's primary security objective.
2. **Non-Determinism**: LLM outputs are non-deterministic, probabilistic, and can hallucinate or fluctuate across identical requests.
3. **High Latency & Costs**: Network roundtrips to remote LLM endpoints add 500ms - 3000ms latency to prompt shielding.
4. **Third-Party Trust**: Users must trust third-party AI APIs with raw unmasked prompts before shielding.

## Decision
We mandate a **100% Deterministic, Offline, Local Detection Engine**.
- **No Third-Party AI Models**: Never invoke OpenAI, Claude, Gemini, or any remote model for sensitivity detection.
- **Layered Multi-Detector Architecture**:
  1. **Secret Detector**: Regex & entropy patterns for database URIs (MongoDB, PostgreSQL, MySQL, Redis), API keys, JWT tokens, certificates, SSH keys, private keys, password assignments, and `.env` variables. Near 100% precision.
  2. **Personal Information Detector**: Regex & rule-based detection for emails, E.164/standard phone numbers, physical street addresses, and ZIP/postal codes.
  3. **Location Detector**: Offline bundled gazetteers for ISO countries, states, cities, and world regions.
  4. **Organization Detector**: Offline bundled gazetteers for companies, corporate departments, universities, and international bodies.
  5. **Project & Repository Detector**: Offline gazetteers & regex patterns for internal project codenames, repository names, and product names.
  6. **Financial Detector**: Regex & validation functions (Luhn algorithm, ISO 7064 IBAN check digit, ABA routing) for bank accounts, credit card numbers, IBANs, and crypto wallet addresses.
  7. **Source Code Detector**: Pattern matchers for environment variables, config files, hardcoded credentials, and database parameters inside code snippets.
  8. **Context Engine**: Deterministic grammar & surrounding word heuristics ("Tell Han", "Project Titan", "Repository Sentinel", "CEO David", "Company ABC Ltd").
  9. **Syntactic Rule Engine**: Structural capitalization and proper noun analysis.

## Consequences
- **Zero Latency**: Detection runs locally in sub-millisecond time (<5ms for typical prompts).
- **100% Predictable & Replicable**: The same input prompt always yields the exact same detection output.
- **Zero Data Leakage**: Prompts never leave the local environment during analysis.
- **Explainability**: Every detection decision includes an explicit breakdown of detector votes and confidence scoring.
