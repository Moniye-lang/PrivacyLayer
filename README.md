# Intelligence Driven Masking

**Context-Aware AI Data Protection Platform — "The Cloudflare for AI Prompts"**

An enterprise-grade, production-ready SaaS proxy that intercepts and masks sensitive data before it reaches Large Language Models. Combines deterministic regex/Luhn detection, semantic NLP context understanding, and custom enterprise policy enforcement in a non-blocking sub-15ms pipeline.

---

## Architecture

```
Client App → IDM Proxy → [Regex Layer] → [Semantic NLP] → [Policy Engine] → Safe Prompt → LLM API
```

Three detection layers, all running in parallel in a single non-blocking call:

| Layer | Method | Latency |
|---|---|---|
| 1 — Regex & Secret Scanner | Deterministic pattern matching + Luhn validation | <1ms |
| 2 — Semantic NLP Engine | Context-aware NER (codenames, PHI, legal, financial) | <5ms |
| 3 — Custom Policy Rules | Department-scoped BLOCK / ALWAYS_MASK / NEVER_MASK | <1ms |

---

## Quick Start

### Run Locally (No Database Required)

```bash
# Clone and install
git clone https://github.com/your-org/intelligence-driven-masking
cd intelligence-driven-masking
npm install

# Start dev server (uses in-memory fallback — no MongoDB/Redis needed)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Test the API Immediately

```bash
curl -X POST http://localhost:3000/api/v1/mask \
  -H "X-API-Key: sk_live_enterprise_demo" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The CEO approved Project Phoenix. Use sk-proj-abc123 for EMP-9021.",
    "strategy": "REPLACE"
  }'
```

Response:
```json
{
  "maskedPrompt": "The CEO approved [PROJECT_CODENAME_1]. Use [API_KEY_1] for [EMPLOYEE_ID_1].",
  "riskScore": 87,
  "entitiesDetectedCount": 3,
  "decision": "MASKED",
  "latency": { "regexMs": 0.8, "semanticMs": 2.1, "policyMs": 0.4, "totalMs": 3.3 }
}
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | No | MongoDB connection string. Falls back to in-memory store |
| `REDIS_URL` | No | Redis connection string. Falls back to in-memory rate limiter |
| `JWT_SECRET` | Yes (prod) | Secret for JWT signing |
| `DEFAULT_MASKING_STRATEGY` | No | `REPLACE` / `REDACT` / `HASH` / `PSEUDONYMIZE` |
| `MIN_CONFIDENCE_THRESHOLD` | No | Detection confidence threshold (default `0.85`) |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/mask` | Mask prompt synchronously (`<100ms SLA`) |
| `POST` | `/api/v1/mask/stream` | SSE streaming proxy |
| `POST` | `/api/v1/mask/batch` | Batch mask up to 50 prompts |
| `GET` | `/api/v1/analytics` | Aggregated security analytics |
| `GET` | `/api/v1/audit` | Searchable audit logs (CSV/JSON export) |
| `GET/POST` | `/api/v1/rules` | Manage custom rules & codenames |
| `GET` | `/api/v1/health` | Health check & engine status |

Full API documentation at `/docs`.

---

## Detection Coverage

**Regex Layer (16 patterns)**
- API Keys: OpenAI `sk-proj-*`, Anthropic `sk-ant-*`, AWS `AKIA*`, GitHub `ghp_*`, Stripe `sk_live_*`
- Secrets: JWT bearer tokens, DB connection strings (MongoDB, PostgreSQL, MySQL, Redis), hardcoded passwords
- PII: Credit cards (Luhn-validated), SSNs, email addresses, phone numbers
- Enterprise IDs: `EMP-XXXX`, `CUST-XXXX`, `ACC-XXXX`

**Semantic NLP Layer (6 context patterns)**
- Project codenames: "Project Phoenix", "Operation Titan" (exact + registry match)
- Executive approvals: "CEO authorized [Company Secret]"
- Financial metrics: ARR, MRR, EBITDA, valuation context
- Medical PHI: "diagnosed with", "patient history", "prescribed"
- Legal references: NDA, settlement, court order context
- Person names: Names near Dr., Counsel, Attorney, Patient

**4 Masking Strategies**
- `REPLACE` → `[PROJECT_CODENAME_1]` (default, numbered, structural)
- `REDACT` → `[REDACTED]` (uniform, irreversible)
- `HASH` → `[HASH_a8b2c1d0]` (fingerprint, deduplication-safe)
- `PSEUDONYMIZE` → `[PSEUDO_TOKEN_X9K2P]` (reversible, salt-keyed)

---

## Running Tests

```bash
npm test
```

41 tests across 4 suites:
- Layer 1 Regex Detectors (16 tests)
- Layer 2 Semantic NLP Engine (9 tests)
- Policy Engine transformations (11 tests)
- Performance SLA benchmarks (5 tests — sub-50ms / sub-100ms)

---

## Production Deployment

### Docker Compose (MongoDB + Redis)

```bash
docker-compose up -d
```

### Docker Build Only

```bash
docker build -t intelligence-mask:latest .
docker run -p 3000:3000 intelligence-mask:latest
```

### Environment (Production)

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/intelligence_mask
REDIS_URL=rediss://user:pass@redis-host:6380
JWT_SECRET=your-32-char-secret-key
NODE_ENV=production
```

---

## Frontend Pages

| Route | Description |
|---|---|
| `/` | Landing page with interactive live playground |
| `/playground` | Full masking sandbox with entity inspector + code exporter |
| `/dashboard` | Security KPI dashboard & audit feed |
| `/analytics` | Threat analytics with charts, risk gauge, department compliance |
| `/audit` | Audit log vault with search, filters, and forensic inspector |
| `/rules` | Custom rules engine & confidential codenames registry |
| `/docs` | Developer API reference + OpenAPI 3.0 schema |

---

## Compliance & Security

- **OWASP Hardened**: CSP, HSTS, X-Frame-Options, X-XSS-Protection on all API responses
- **Zero Prompt Retention**: Raw payloads are never persisted; only masked snippets in audit logs
- **SHA-256 Audit Signatures**: Every log entry cryptographically signed for tamper-evidence
- **RBAC**: ADMIN / SECURITY_OFFICER / DEVELOPER / AUDITOR roles
- **Rate Limiting**: Sliding window token bucket per API key (Redis or in-memory fallback)
- **SOC2 / GDPR / HIPAA Ready**: Built-in department + country-scoped policies

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS with custom cyber/enterprise design system
- **Database**: MongoDB (optional, in-memory fallback)
- **Cache**: Redis (optional, in-memory fallback)
- **Charts**: Recharts
- **Testing**: Jest + ts-jest (41 unit tests)
- **CI/CD**: GitHub Actions (lint → test → build → docker healthcheck → registry push)

---

> Built for security-conscious enterprises protecting sensitive company data from LLM leakage.
