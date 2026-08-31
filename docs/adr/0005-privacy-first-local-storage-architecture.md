# ADR 0005: Privacy-First Ephemeral Storage & Extensible Future Architecture

## Status
**Accepted**

## Context
Privacy Layer operates as the privacy gateway between user data and AI models. The platform must guarantee zero telemetry, local data isolation, and ephemeral session lifecycles, while maintaining a clean, modular architecture for future integrations (Browser Extensions, API Gateway, CLI, VS Code Extension, Cursor Extension, Enterprise Policy Engine, Audit Logs, Team Management).

## Decision

1. **Ephemeral Local Mapping Store**:
   - Sensitive text-to-placeholder mappings (`placeholderToRawMap`) are stored locally in an in-memory / session-bounded encrypted store with automated TTL purging (default: 60 minutes).
   - Once a session expires or is manually purged by the user, the mapping dictionary is permanently deleted.

2. **Extensible Module Architecture**:
   - Core engine functions (`shieldPrompt`, `revealResponse`, `runMultiLayerDetectionPipeline`, `learnedCacheStore`) are strictly decoupled from Next.js HTTP routes and React UI components.
   - Clean interface contracts are defined in `src/lib/extensibility/types.ts` so future modules can plug into the privacy engine without refactoring core logic:
     - `BrowserExtensionAdapter`: Intercepts web inputs in ChatGPT / Claude web apps.
     - `APIGatewayMiddleware`: Proxy layer for enterprise AI API traffic.
     - `CLIOptions`: Command-line tool for pipeline scripts.
     - `IDEExtensionPlugin`: VS Code and Cursor extension bindings.
     - `EnterprisePolicyEngine`: Centralized policy enforcement.
     - `AuditLogCollector`: Zero-pii compliance logging.

## Consequences
- Complete zero-trust local execution.
- Easy integration with IDE extensions, CLI tools, and enterprise gateways in future releases.
- Clean SOLID principles across the codebase.
