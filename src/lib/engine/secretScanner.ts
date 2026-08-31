import { DetectedEntity } from '@/types';

interface SecretRule {
  type: 'CONNECTION_STRING' | 'API_KEY' | 'JWT_TOKEN' | 'PASSWORD' | 'SOURCE_CODE_SECRET' | 'URL';
  name: string;
  pattern: RegExp;
  reason: string;
  confidence: number;
  placeholderPrefix: string;
  validator?: (match: string) => boolean;
}

const SECRET_RULES: SecretRule[] = [
  // 1. MongoDB Atlas & Standard Connection URIs (mongodb:// and mongodb+srv://)
  {
    type: 'CONNECTION_STRING',
    name: 'MongoDB Connection URI',
    pattern: /(mongodb(?:\+srv)?:\/\/[^\s"'\>]+)/gi,
    reason: 'Secret Scanner: Full MongoDB Database URI detected',
    confidence: 0.99,
    placeholderPrefix: 'CONNECTION_STRING',
  },
  // 2. PostgreSQL Connection URIs (postgres:// and postgresql://)
  {
    type: 'CONNECTION_STRING',
    name: 'PostgreSQL Connection URI',
    pattern: /(postgres(?:ql)?:\/\/[^\s"'\>]+)/gi,
    reason: 'Secret Scanner: Full PostgreSQL Database URI detected',
    confidence: 0.99,
    placeholderPrefix: 'CONNECTION_STRING',
  },
  // 3. MySQL Connection URIs
  {
    type: 'CONNECTION_STRING',
    name: 'MySQL Connection URI',
    pattern: /(mysql2?:\/\/[^\s"'\>]+)/gi,
    reason: 'Secret Scanner: Full MySQL Database URI detected',
    confidence: 0.99,
    placeholderPrefix: 'CONNECTION_STRING',
  },
  // 4. Redis & Rediss Connection URIs
  {
    type: 'CONNECTION_STRING',
    name: 'Redis Connection URI',
    pattern: /(rediss?:\/\/[^\s"'\>]+)/gi,
    reason: 'Secret Scanner: Full Redis Cache URI detected',
    confidence: 0.99,
    placeholderPrefix: 'CONNECTION_STRING',
  },
  // 5. ODBC / JDBC / Standard SQL Connection Strings
  {
    type: 'CONNECTION_STRING',
    name: 'SQL Connection String',
    pattern: /(?:Server|Data Source|Host)=[^;\n]+;(?:Database|Initial Catalog)=[^;\n]+;(?:User Id|UID)=[^;\n]+;(?:Password|PWD)=[^;\s"'\>]+/gi,
    reason: 'Secret Scanner: ODBC/JDBC Connection String detected',
    confidence: 0.99,
    placeholderPrefix: 'CONNECTION_STRING',
  },
  // 6. Generic Environment Variable Secret Assignments (DATABASE_URL=..., SECRET_KEY=..., MONGODB_URI=...)
  {
    type: 'CONNECTION_STRING',
    name: 'Env Variable Database URI Assignment',
    pattern: /(?:DATABASE_URL|DATABASE_URI|MONGODB_URI|MONGO_URL|DB_URI|REDIS_URL)\s*[:=]\s*["']?([^\s"'\n]+)["']?/gi,
    reason: 'Secret Scanner: Database URI Environment Variable assignment detected',
    confidence: 0.99,
    placeholderPrefix: 'CONNECTION_STRING',
  },
  // 7. OpenAI & Generic Secret API Keys
  {
    type: 'API_KEY',
    name: 'Secret API Key',
    pattern: /(sk-[a-zA-Z0-9_-]{10,120}|sk-proj-[a-zA-Z0-9_-]{10,120}|sk-admin-[a-zA-Z0-9_-]{10,120})/g,
    reason: 'Secret Scanner: Secret API Key detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 8. Anthropic Claude API Keys
  {
    type: 'API_KEY',
    name: 'Anthropic API Key',
    pattern: /(sk-ant-[a-zA-Z0-9_-]{10,120})/g,
    reason: 'Secret Scanner: Anthropic API Key detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 9. GitHub Personal Access Tokens & OAuth Tokens
  {
    type: 'API_KEY',
    name: 'GitHub Token',
    pattern: /(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,100})/g,
    reason: 'Secret Scanner: GitHub Token detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 10. AWS Access Key IDs
  {
    type: 'API_KEY',
    name: 'AWS Access Key ID',
    pattern: /(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})/g,
    reason: 'Secret Scanner: AWS Access Key ID detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 11. AWS Secret Access Keys
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'AWS Secret Access Key',
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_access_key)\s*[:=]\s*["']?([a-zA-Z0-9\/+=]{40})["']?/gi,
    reason: 'Secret Scanner: AWS Secret Access Key assignment detected',
    confidence: 0.99,
    placeholderPrefix: 'SECRET',
  },
  // 12. Google Cloud & OAuth Tokens
  {
    type: 'API_KEY',
    name: 'Google Cloud Key / OAuth Token',
    pattern: /(AIzaSy[a-zA-Z0-9_-]{33}|ya29\.[a-zA-Z0-9_-]{30,120})/g,
    reason: 'Secret Scanner: Google Cloud Key / OAuth Token detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 13. Azure Connection Strings & Storage Keys
  {
    type: 'CONNECTION_STRING',
    name: 'Azure Storage Key',
    pattern: /(DefaultEndpointsProtocol=https?;AccountName=[^;\s"']+;AccountKey=[^;\s"']+;[^\s"']+)/gi,
    reason: 'Secret Scanner: Azure Storage Connection String detected',
    confidence: 0.99,
    placeholderPrefix: 'CONNECTION_STRING',
  },
  // 14. Stripe & Paystack Secret Keys
  {
    type: 'API_KEY',
    name: 'Stripe Secret Key',
    pattern: /(sk_live_[0-9a-zA-Z_-]{20,110}|rk_live_[0-9a-zA-Z_-]{20,110}|sk_test_[0-9a-zA-Z_-]{20,110}|pk_live_[0-9a-zA-Z_-]{20,110}|pk_test_[0-9a-zA-Z_-]{20,110})/g,
    reason: 'Secret Scanner: Stripe Secret Key detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 14b. WooCommerce Consumer Keys & Consumer Secrets
  {
    type: 'API_KEY',
    name: 'WooCommerce API Key / Consumer Secret',
    pattern: /(ck_[0-9a-zA-Z]{32,64}|cs_[0-9a-zA-Z]{32,64})/g,
    reason: 'Secret Scanner: WooCommerce API Key / Secret detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 15. PEM Certificates
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'PEM Certificate Block',
    pattern: /(-----BEGIN CERTIFICATE-----[[\s\S]*?-----END CERTIFICATE-----)/g,
    reason: 'Secret Scanner: PEM Certificate block detected',
    confidence: 0.99,
    placeholderPrefix: 'SECRET',
  },
  // 16. PEM / SSH / RSA Private Keys
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'Private Key / SSH Key',
    pattern: /(-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|ssh-rsa\s+[A-Za-z0-9+\/=]{100,}|ssh-ed25519\s+[A-Za-z0-9+\/=]{40,})/g,
    reason: 'Secret Scanner: PEM / SSH Private Key block detected',
    confidence: 0.99,
    placeholderPrefix: 'SECRET',
  },
  // 17. JSON Web Tokens (JWT)
  {
    type: 'JWT_TOKEN',
    name: 'JWT Token',
    pattern: /(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/g,
    reason: 'Secret Scanner: JSON Web Token (JWT) detected',
    confidence: 0.99,
    placeholderPrefix: 'TOKEN',
  },
  // 18. Bearer / OAuth Tokens
  {
    type: 'JWT_TOKEN',
    name: 'Bearer Token',
    pattern: /(?:Bearer\s+|access_token\s*[:=]\s*|oauth_token\s*[:=]\s*)["']?([a-zA-Z0-9_\-\.]{8,128})["']?/gi,
    reason: 'Context rule: Bearer Token',
    confidence: 0.98,
    placeholderPrefix: 'TOKEN',
  },
  // 19. Password Assignments in code/env/config
  {
    type: 'PASSWORD',
    name: 'Password Assignment',
    pattern: /(?:(?:let|const|var|val|auto|\$|export)?\s*(?!(?:[a-zA-Z0-9_]*(?:Field|Element|Input|Selector|Label|Text|Count|Total|List|Length|Name|Type|Id|Icon|Button|Form)))(?:[a-zA-Z0-9_\-\.]*(?:password|passwd|pwd|dbpass|db_pass|database_pass|db_password|admin_pass|admin_password|root_pass|root_password|user_pass|user_password|master_pass|master_password|secret_pass|pass_key|passphrase|passcode|secret|credential|auth)[a-zA-Z0-9_\-\.]*))\s*(?:[:=]|=>|->)\s*["']?([^\s"';,\}\)\n]{3,128})["']?/gi,
    reason: 'Context rule: password assignment',
    confidence: 0.98,
    placeholderPrefix: 'PASSWORD',
  },
  // 19b. CLI / Command-Line Password Flags
  {
    type: 'PASSWORD',
    name: 'CLI Command Password Flag',
    pattern: /(?:(?:mysql|mysqldump|mariadb)\s+.*?(?:-p|--password=)\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?|(?:redis-cli\s+.*?(?:-a|--auth|--pass)\s+["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)|(?:sshpass\s+-p\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)|(?:docker\s+login\s+.*?(?:-p|--password)\s+["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)|(?:curl\s+.*?(?:-u|--user|--proxy-user)\s+["']?[a-zA-Z0-9_.\-]+:([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?))/gi,
    reason: 'Context rule: CLI command password flag',
    confidence: 0.99,
    placeholderPrefix: 'PASSWORD',
  },
  // 19c. Credential & Key-Value Pairs
  {
    type: 'PASSWORD',
    name: 'Credential Pair Password',
    pattern: /(?:(?:user|username|login|account|admin|client)\s*[:=]\s*[^\s,;|]+\s*[,;/|&\s]+\s*(?:password|passwd|pwd|pass|secret)\s*[:=]\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)/gi,
    reason: 'Context rule: credential pair password',
    confidence: 0.98,
    placeholderPrefix: 'PASSWORD',
  },
  // 19d. PIN, Passcode, Passphrase & Access Code Patterns
  {
    type: 'PASSWORD',
    name: 'PIN / Passcode / Access Code Declaration',
    pattern: /(?:\b(?:security\s+pin|pin|passcode|passphrase|access\s+code|wifi\s+password|wi-fi\s+password|wifi\s+key|hotspot\s+password|admin\s+pin|master\s+pin)\s*(?:[:=]|(?:\s+(?:is\s+set\s+to|is\s+now|is|was))\s*[:=]?)\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,64})["']?)/gi,
    reason: 'Context rule: PIN / passcode declaration',
    confidence: 0.98,
    placeholderPrefix: 'PASSWORD',
  },
  // 20. Natural Language Password Declarations
  {
    type: 'PASSWORD',
    name: 'Natural Language Password Declaration',
    pattern: /(?:(?:my|the|current|temp|temporary|new|admin|root|user|login|db|database|account|master|wifi|default|initial|backup)\s+)?(?:password|passwd|pwd|passcode|passphrase|credentials|secret\s+key|access\s+code)\s*(?:[:=]|(?:\s+(?:is\s+now|is\s+set\s+to|has\s+been\s+set\s+to|was\s+changed\s+to|was\s+reset\s+to|was\s+rotated\s+to|changed\s+to|reset\s+to|updated\s+to|rotated\s+to|set\s+to|value\s+is|is|was|for\s+[a-zA-Z0-9_.\-]+(?:\s+is)?))\s*[:=]?)\s*["']?([^\s"';,\}\)\n]{3,128})["']?/gi,
    reason: 'Context rule: natural language password declaration',
    confidence: 0.98,
    placeholderPrefix: 'PASSWORD',
  },
  // 21. Natural Language API Key Declarations
  {
    type: 'API_KEY',
    name: 'Natural Language API Key Declaration',
    pattern: /(?:(?:my\s+|the\s+)?(?:api[_\s]*key|apikey|access[_\s]*token|token)(?:\s+is|\s*:|\s*=)*[\s:=]+)["']?([^\s"';,\}\)\n]{3,128})["']?/gi,
    reason: 'Context rule: natural language API key declaration',
    confidence: 0.98,
    placeholderPrefix: 'API_KEY',
  },
  // 22. WooCommerce / Consumer Key Assignments
  {
    type: 'API_KEY',
    name: 'Consumer Key Assignment',
    pattern: /(?:[a-zA-Z0-9_]*(?:CONSUMER_KEY|API_KEY|CLIENT_KEY))\s*[:=]\s*["']?([^\s"';,\}\)\n]{6,128})["']?/gi,
    reason: 'Secret Scanner: Consumer Key assignment detected',
    confidence: 0.99,
    placeholderPrefix: 'API_KEY',
  },
  // 23. WooCommerce / Consumer Secret Assignments
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'Consumer Secret Assignment',
    pattern: /(?:[a-zA-Z0-9_]*(?:CONSUMER_SECRET|API_SECRET|CLIENT_SECRET))\s*[:=]\s*["']?([^\s"';,\}\)\n]{6,128})["']?/gi,
    reason: 'Secret Scanner: Consumer Secret assignment detected',
    confidence: 0.99,
    placeholderPrefix: 'SOURCE_CODE_SECRET',
  },
  // 24. URL & Site Endpoint Assignments
  {
    type: 'URL',
    name: 'URL Endpoint Assignment',
    pattern: /(?:[a-zA-Z0-9_]*(?:URL|URI|ENDPOINT|HOST|DOMAIN))\s*[:=]\s*["']?([^\s"'\n]{6,128})["']?/gi,
    reason: 'Secret Scanner: URL endpoint assignment detected',
    confidence: 0.99,
    placeholderPrefix: 'URL',
  },
  // 25. General Key=Value .env Variables
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'Environment Variable Assignment',
    pattern: /(?:[A-Z0-9_]{3,30}_(?:KEY|SECRET|TOKEN|PASS|PASSWORD|AUTH|CREDENTIALS))\s*[:=]\s*["']?([^\s"'\n]{6,128})["']?/gi,
    reason: 'Secret Scanner: Sensitive .env Variable detected',
    confidence: 0.96,
    placeholderPrefix: 'SECRET',
  },
];

const NON_SECRET_ENGLISH_WORDS = /^(?:Bearer|here|there|below|above|prompt|field|input|selector|label|text|count|total|list|length|name|type|id|icon|button|form|header|headers|authentication|auth|documentation|docs|string|value|required|optional|setting|settings|credentials|details|info|information|help|reset|change|policy|manager|example|test|sample)$/i;

/**
 * Dedicated Secret Scanner (Layer 1 - Highest Priority)
 * Deterministically scans for URIs, JWTs, Bearer/OAuth tokens, API keys, certificates, private keys, passwords, and env secrets.
 */
export function runSecretScanner(text: string): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  for (const rule of SECRET_RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(text)) !== null) {
      const matchText = match[1] || match[0];

      // Filter out false positive values (code method calls, integers, UI label strings like "API Key")
      if (/^(?:document\.|window\.|location\.|console\.|Math\.|JSON\.|[a-zA-Z0-9_$]+\()\s*/.test(matchText)) {
        continue;
      }
      if (/^\d+$/.test(matchText)) {
        continue;
      }
      if (/^(?:API Key|Password Label|Token Count|Secret Key)$/i.test(matchText)) {
        continue;
      }
      if (NON_SECRET_ENGLISH_WORDS.test(matchText.trim())) {
        continue;
      }
      const startIndex = match.index + match[0].indexOf(matchText);

      if (rule.validator && !rule.validator(matchText)) {
        continue;
      }

      const entityId = `sec_${rule.type}_${startIndex}_${Math.random().toString(36).substring(2, 7)}`;

      const isOverlapping = detected.some(
        (existing) => Math.max(existing.start, startIndex) < Math.min(existing.end, startIndex + matchText.length)
      );

      if (!isOverlapping) {
        detected.push({
          id: entityId,
          type: rule.type,
          category: 'SECRET',
          text: matchText,
          start: startIndex,
          end: startIndex + matchText.length,
          confidence: rule.confidence,
          reason: rule.reason,
          placeholder: `[[${rule.placeholderPrefix}_001]]`,
          votes: [
            {
              stage: 'SECRET',
              type: rule.type,
              confidence: rule.confidence,
              reason: rule.reason,
            },
          ],
        });
      }
    }
  }

  return detected;
}
