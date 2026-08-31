# ADR 0004: User Dictionaries and Manual Override Precedence Hierarchy

## Status
**Accepted**

## Context
Automated detection engines—no matter how refined—cannot anticipate every internal codename, proprietary product, or user preference. Users must always remain in complete control of what is masked and what is revealed.

## Decision
We establish a strict **4-Tier Precedence Hierarchy**:

1. **Tier 1: Manual Highlight Overrides (Highest Precedence)**
   - Users can highlight any text in the prompt editor and click **Mask as [Category]** or **Unmask**.
   - User manual decisions override all automated engine decisions with 100% authority. Automatic detectors will never force a detection if a user has unmasked it.

2. **Tier 2: User Dictionaries (Permanent Custom Registration)**
   - Users can permanently register custom terms under 5 core categories:
     - **Projects**
     - **Repositories**
     - **Employees**
     - **Companies**
     - **Internal Products**
   - Registered custom terms are stored in persistent browser storage / database and detected automatically with 100% confidence across all future prompts.

3. **Tier 3: High-Confidence Secret & Pattern Scanners**
   - Deterministic scanners for database URIs, API keys, JWTs, certificates, passwords, emails, phone numbers, and financial data (confidence >= 0.95).

4. **Tier 4: Context & Syntactic Engines**
   - Heuristic grammar patterns ("Tell Han", "Project Titan", "CEO David") and proper noun syntax rules.

## Consequences
- Guaranteed predictability: User decisions always take precedence over software rules.
- Team-wide consistency: Custom organization terms registered in User Dictionaries are shielded automatically across all workflows.
- Absolute user empowerment: No surprise masking or un-masking.
