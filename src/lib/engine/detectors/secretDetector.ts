import { CandidateDetection, Detector, DetectorContext, EntityType, PriorityLevel } from '../../../types';

export interface SecretPatternRule {
  type: EntityType;
  name: string;
  pattern: RegExp;
  reason: string;
  confidence: number;
  priority?: number;
}

const HIGH_PRIO = PriorityLevel.REGEX + 20; // 115: High-specificity branded/structural rules
const MID_PRIO = PriorityLevel.REGEX + 10;  // 105: Contextual & endpoint assignment rules
const LOW_PRIO = PriorityLevel.REGEX + 5;   // 100: Generic keyword fallback assignment rules

const SECRET_PATTERNS: SecretPatternRule[] = [
  // 1. MongoDB Atlas & Standard Connection URIs
  {
    type: 'CONNECTION_STRING',
    name: 'MongoDB Connection URI',
    pattern: /(mongodb(?:\+srv)?:\/\/[^\s"'\>]+)/gi,
    reason: 'Context rule: MongoDB connection URI',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 2. PostgreSQL Connection URIs
  {
    type: 'CONNECTION_STRING',
    name: 'PostgreSQL Connection URI',
    pattern: /(postgres(?:ql)?:\/\/[^\s"'\>]+)/gi,
    reason: 'Context rule: PostgreSQL connection URI',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 3. MySQL Connection URIs
  {
    type: 'CONNECTION_STRING',
    name: 'MySQL Connection URI',
    pattern: /(mysql2?:\/\/[^\s"'\>]+)/gi,
    reason: 'Context rule: MySQL connection URI',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 4. Redis Connection URIs
  {
    type: 'CONNECTION_STRING',
    name: 'Redis Connection URI',
    pattern: /(rediss?:\/\/[^\s"'\>]+)/gi,
    reason: 'Context rule: Redis connection URI',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 5. SQL Connection Strings
  {
    type: 'CONNECTION_STRING',
    name: 'SQL Connection String',
    pattern: /(?:Server|Data Source|Host)=[^;\n]+;(?:Database|Initial Catalog)=[^;\n]+;(?:User Id|UID)=[^;\n]+;(?:Password|PWD)=[^;\s"'\>]+/gi,
    reason: 'Context rule: SQL connection string',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 6. Database URI Environment Variable Assignment
  {
    type: 'CONNECTION_STRING',
    name: 'Env Variable Database URI Assignment',
    pattern: /(?:DATABASE_URL|DATABASE_URI|MONGODB_URI|MONGO_URL|DB_URI|REDIS_URL)\s*[:=]\s*["']?([^\s"'\n]+)["']?/gi,
    reason: 'Context rule: Database URI assignment',
    confidence: 0.99,
    priority: MID_PRIO,
  },
  // 7. OpenAI & Generic Secret API Keys
  {
    type: 'API_KEY',
    name: 'Secret API Key',
    pattern: /(sk-[a-zA-Z0-9_-]{10,120}|sk-proj-[a-zA-Z0-9_-]{10,120}|sk-admin-[a-zA-Z0-9_-]{10,120})/g,
    reason: 'Context rule: Secret API Key',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 8. Anthropic API Keys
  {
    type: 'API_KEY',
    name: 'Anthropic API Key',
    pattern: /(sk-ant-[a-zA-Z0-9_-]{10,120})/g,
    reason: 'Context rule: Anthropic API Key',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 9. GitHub Tokens
  {
    type: 'API_KEY',
    name: 'GitHub Token',
    pattern: /(ghp_[a-zA-Z0-9_]{20,120}|gho_[a-zA-Z0-9_]{20,120}|ghu_[a-zA-Z0-9_]{20,120}|ghs_[a-zA-Z0-9_]{20,120}|ghr_[a-zA-Z0-9_]{20,120}|github_pat_[a-zA-Z0-9_]{22,120})/g,
    reason: 'Context rule: GitHub Token',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 10. AWS Access Key IDs
  {
    type: 'API_KEY',
    name: 'AWS Access Key ID',
    pattern: /(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})/g,
    reason: 'Context rule: AWS Access Key ID',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 11. AWS Secret Access Keys
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'AWS Secret Access Key',
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_access_key)\s*[:=]\s*["']?([a-zA-Z0-9\/+=_-]{32,128})["']?/gi,
    reason: 'Context rule: AWS Secret Key assignment',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 12. Google Cloud / OAuth Tokens
  {
    type: 'API_KEY',
    name: 'Google Cloud Key / OAuth Token',
    pattern: /(AIzaSy[a-zA-Z0-9_-]{33}|ya29\.[a-zA-Z0-9_-]{30,120})/g,
    reason: 'Context rule: Google Cloud Key',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 13. Azure Connection Strings
  {
    type: 'CONNECTION_STRING',
    name: 'Azure Storage Key',
    pattern: /(DefaultEndpointsProtocol=https?;AccountName=[^;\s"']+;AccountKey=[^;\s"']+;[^\s"']+)/gi,
    reason: 'Context rule: Azure Connection String',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14. Stripe API Keys (Live & Test)
  {
    type: 'API_KEY',
    name: 'Stripe API Key',
    pattern: /(sk_live_[0-9a-zA-Z_-]{20,120}|rk_live_[0-9a-zA-Z_-]{20,120}|sk_test_[0-9a-zA-Z_-]{20,120}|pk_live_[0-9a-zA-Z_-]{20,120}|pk_test_[0-9a-zA-Z_-]{20,120})/g,
    reason: 'High entropy secret: Stripe API key',
    confidence: 1.0,
    priority: HIGH_PRIO,
  },
  // 14b. WooCommerce Consumer Keys & Consumer Secrets
  {
    type: 'API_KEY',
    name: 'WooCommerce API Key / Consumer Secret',
    pattern: /(ck_[0-9a-zA-Z]{32,64}|cs_[0-9a-zA-Z]{32,64})/g,
    reason: 'Context rule: WooCommerce API Key / Secret',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14c. Slack Tokens
  {
    type: 'API_KEY',
    name: 'Slack Token',
    pattern: /(xox[baprs]-[0-9a-zA-Z-]{10,72})/g,
    reason: 'Context rule: Slack API Token',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14d. Telegram Bot Tokens
  {
    type: 'API_KEY',
    name: 'Telegram Bot Token',
    pattern: /(bot[0-9]{8,12}:[a-zA-Z0-9_-]{35})/g,
    reason: 'Context rule: Telegram Bot Token',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14e. Hugging Face Tokens
  {
    type: 'API_KEY',
    name: 'Hugging Face Token',
    pattern: /(hf_[a-zA-Z0-9]{34,40})/g,
    reason: 'Context rule: Hugging Face API Token',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14f. SendGrid API Keys
  {
    type: 'API_KEY',
    name: 'SendGrid API Key',
    pattern: /(SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43})/g,
    reason: 'Context rule: SendGrid API Key',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14g. Twilio API Keys & SIDs
  {
    type: 'API_KEY',
    name: 'Twilio SID / Secret',
    pattern: /(AC[a-f0-9]{32}|SK[a-f0-9]{32})/g,
    reason: 'Context rule: Twilio SID / API Key',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14h. Supabase API Keys
  {
    type: 'API_KEY',
    name: 'Supabase API Key',
    pattern: /(sbp_[a-zA-Z0-9]{40})/g,
    reason: 'Context rule: Supabase API Key',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14i. Shopify Access Tokens
  {
    type: 'API_KEY',
    name: 'Shopify Token',
    pattern: /(shpat_[a-fA-F0-9]{32}|shpca_[a-fA-F0-9]{32}|shppa_[a-fA-F0-9]{32})/g,
    reason: 'Context rule: Shopify Access Token',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14j. Square Tokens
  {
    type: 'API_KEY',
    name: 'Square Token',
    pattern: /(sq0atp-[0-9A-Za-z\-_]{22}|sq0csp-[0-9A-Za-z\-_]{43})/g,
    reason: 'Context rule: Square Token',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14k. Stripe Card Tokens, Charges, Customers, & Payment Tokens
  {
    type: 'API_KEY',
    name: 'Stripe Token / Card Identifier',
    pattern: /(tok_[0-9a-zA-Z]{20,60}|card_[0-9a-zA-Z]{20,60}|ch_[0-9a-zA-Z]{20,60}|pi_[0-9a-zA-Z]{20,60}|cus_[0-9a-zA-Z]{14,60}|sub_[0-9a-zA-Z]{14,60})/g,
    reason: 'Context rule: Stripe Token / Card Identifier',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 14l. Stripe Webhook Signing Secrets
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'Stripe Webhook Signing Secret',
    pattern: /(whsec_[0-9a-zA-Z]{20,120})/g,
    reason: 'Context rule: Webhook Signing Secret',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 15. PEM Certificates
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'PEM Certificate Block',
    pattern: /(-----BEGIN CERTIFICATE-----[[\s\S]*?-----END CERTIFICATE-----)/g,
    reason: 'Context rule: PEM Certificate block',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 16. Private Keys / SSH Keys
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'Private Key / SSH Key',
    pattern: /(-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|ssh-rsa\s+[A-Za-z0-9+\/=]{100,}|ssh-ed25519\s+[A-Za-z0-9+\/=]{40,})/g,
    reason: 'Context rule: Private Key block',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 17. JSON Web Tokens (JWT)
  {
    type: 'JWT_TOKEN',
    name: 'JWT Token',
    pattern: /(eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{3,}\.[a-zA-Z0-9_-]{3,})/g,
    reason: 'Context rule: JSON Web Token',
    confidence: 0.99,
    priority: HIGH_PRIO,
  },
  // 18. Bearer / OAuth Tokens (Requires plausible token length >= 8)
  {
    type: 'JWT_TOKEN',
    name: 'Bearer Token',
    pattern: /(?:Bearer\s+|access_token\s*[:=]\s*|oauth_token\s*[:=]\s*)["']?([a-zA-Z0-9_\-\.]{8,128})["']?/gi,
    reason: 'Context rule: Bearer Token',
    confidence: 0.98,
    priority: MID_PRIO,
  },
  // 19. Source-Code & Config Password Assignments
  {
    type: 'PASSWORD',
    name: 'Hardcoded Password Assignment',
    pattern: /(?:(?:let|const|var|val|auto|\$|export)?\s*(?!(?:[a-zA-Z0-9_]*(?:Field|Element|Input|Selector|Label|Text|Count|Total|List|Length|Name|Type|Id|Icon|Button|Form)))(?:[a-zA-Z0-9_\-\.]*(?:password|passwd|pwd|dbpass|db_pass|database_pass|db_password|admin_pass|admin_password|root_pass|root_password|user_pass|user_password|master_pass|master_password|secret_pass|pass_key|passphrase|passcode|secret|credential|auth)[a-zA-Z0-9_\-\.]*))\s*(?:[:=]|=>|->)\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?/gi,
    reason: 'Context rule: password assignment',
    confidence: 0.98,
    priority: LOW_PRIO,
  },
  // 19b. CLI / Command-Line Password Flags (curl, mysql, redis-cli, sshpass, docker login, pg_dump)
  {
    type: 'PASSWORD',
    name: 'CLI Command Password Flag',
    pattern: /(?:(?:mysql|mysqldump|mariadb)\s+.*?(?:-p|--password=)\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?|(?:redis-cli\s+.*?(?:-a|--auth|--pass)\s+["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)|(?:sshpass\s+-p\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)|(?:docker\s+login\s+.*?(?:-p|--password)\s+["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)|(?:curl\s+.*?(?:-u|--user|--proxy-user)\s+["']?[a-zA-Z0-9_.\-]+:([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?))/gi,
    reason: 'Context rule: CLI command password flag',
    confidence: 0.99,
    priority: MID_PRIO,
  },
  // 19c. Credential & Key-Value Pairs (e.g. "username: admin / password: secret", "user=admin pass=secret")
  {
    type: 'PASSWORD',
    name: 'Credential Pair Password',
    pattern: /(?:(?:user|username|login|account|admin|client)\s*[:=]\s*[^\s,;|]+\s*[,;/|&\s]+\s*(?:password|passwd|pwd|pass|secret)\s*[:=]\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)/gi,
    reason: 'Context rule: credential pair password',
    confidence: 0.98,
    priority: MID_PRIO,
  },
  // 19d. PIN, Passcode, Passphrase & Access Code Patterns
  {
    type: 'PASSWORD',
    name: 'PIN / Passcode / Access Code Declaration',
    pattern: /(?:\b(?:security\s+pin|pin|passcode|passphrase|access\s+code|wifi\s+password|wi-fi\s+password|wifi\s+key|hotspot\s+password|admin\s+pin|master\s+pin)\s*(?:[:=]|(?:\s+(?:is\s+set\s+to|is\s+now|is|was))\s*[:=]?)\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,64})["']?)/gi,
    reason: 'Context rule: PIN / passcode declaration',
    confidence: 0.98,
    priority: LOW_PRIO,
  },
  // 20. Natural Language Password Declarations & Comprehensive Trigger Phrasings
  {
    type: 'PASSWORD',
    name: 'Natural Language Password Declaration',
    pattern: /(?:(?:my|the|current|temp|temporary|new|admin|root|user|login|db|database|account|master|wifi|default|initial|backup|same)\s+)+(?:password|passwd|pwd|passcode|passphrase|credentials|secret\s+key|access\s+code)(?:\s+again)?\s*(?:[:=]|(?:\s+(?:is\s+now|is\s+set\s+to|has\s+been\s+set\s+to|was\s+changed\s+to|was\s+reset\s+to|was\s+rotated\s+to|changed\s+to|reset\s+to|updated\s+to|rotated\s+to|set\s+to|value\s+is|is|was|for\s+[a-zA-Z0-9_.\-]+(?:\s+is)?))\s*[:=]?)\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?/gi,
    reason: 'Context rule: natural language password declaration',
    confidence: 0.98,
    priority: LOW_PRIO,
  },
  // 20b. Action, Mutation, and Value Update Trigger Phrasings
  {
    type: 'PASSWORD',
    name: 'Password Rotation / Action Phrasing',
    pattern: /\b(?:(?:set|change|changed|reset|rotate|updated|update)\s+(?:the\s+|my\s+|our\s+)?(?:new\s+|current\s+|temp\s+|temporary\s+)?(?:one|password|passwd|pwd|pass|secret|credential|key|code|pin)\s+(?:to|is|as|was)\s+|set\s+(?:it|them)\s+to\s+|rotate\s+(?:the\s+|it\s+to\s+|password\s+to\s+|secret\s+to\s+)|changed\s+(?:the\s+|it\s+to\s+|password\s+to\s+|secret\s+to\s+)|change\s+(?:password|secret|it)\s+to\s+|reset\s+(?:the\s+|it\s+to\s+|password\s+to\s+|secret\s+to\s+)|updated\s+(?:the\s+|it\s+to\s+|password\s+to\s+|secret\s+to\s+)|update\s+(?:password|secret|it)\s+to\s+|use\s+password\s+|enter\s+password\s+|with\s+password\s+|new\s+value\s+is\s+|value\s+is\s+now\s+|value\s+is\s+|the\s+new\s+value\s+is\s+|current\s+value\s+is\s+|password\s+is\s+now\s+|the\s+password\s+is\s+)\s*[:=]?\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?/gi,
    reason: 'Context rule: password rotation / value phrasing',
    confidence: 0.98,
    priority: LOW_PRIO,
  },
  // 20c. Confirmation & Repeat Passwords
  {
    type: 'PASSWORD',
    name: 'Password Confirmation Phrasing',
    pattern: /(?:\b(?:confirm(?:\s+password)?|same\s+password(?:\s+again)?|repeat\s+password|verify\s+password)\s*[:=]\s*["']?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]{3,128})["']?)/gi,
    reason: 'Context rule: password confirmation phrasing',
    confidence: 0.99,
    priority: LOW_PRIO,
  },
  // 21. Natural Language API Key & Token Declarations
  {
    type: 'API_KEY',
    name: 'Natural Language API Key Declaration',
    pattern: /(?:(?:my\s+|the\s+)?(?:api[_\s]*key|apikey|access[_\s]*token|token)\s*(?:[:=]|\bis\b\s*[:=]?)\s*)["']?([^\s"';,\}\)\n]{3,128})["']?/gi,
    reason: 'Context rule: natural language API key declaration',
    confidence: 0.98,
    priority: LOW_PRIO,
  },
  // 21b. Source-Code API Key & Token Assignments
  {
    type: 'API_KEY',
    name: 'Hardcoded API Key Assignment',
    pattern: /(?:(?:let|const|var|val|auto|\$)?\s*(?!(?:[a-zA-Z0-9_]*(?:Field|Element|Input|Selector|Label|Text|Count|Total|List|Length|Name|Type|Id|Icon|Button|Form)))(?:[a-zA-Z0-9_]*(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|private[_-]?key|secret[_-]?key)[a-zA-Z0-9_]*))\s*[:=]\s*["']?([^\s"';,\}\)\n]{3,128})["']?/gi,
    reason: 'Context rule: API key assignment',
    confidence: 0.98,
    priority: LOW_PRIO,
  },
  // 22. WooCommerce / Consumer Key Assignments
  {
    type: 'API_KEY',
    name: 'WooCommerce Consumer Key Assignment',
    pattern: /(?:consumer_key|consumerKey|ck_[a-zA-Z0-9_]+)\s*[:=]\s*["']?(ck_[a-fA-F0-9]{40}|ck_[a-zA-Z0-9_-]{20,})["']?/gi,
    reason: 'Context rule: WooCommerce consumer key assignment',
    confidence: 0.99,
    priority: LOW_PRIO,
  },
  // 23. WooCommerce / Consumer Secret Assignments
  {
    type: 'PASSWORD',
    name: 'WooCommerce Consumer Secret Assignment',
    pattern: /(?:consumer_secret|consumerSecret|cs_[a-zA-Z0-9_]+)\s*[:=]\s*["']?(cs_[a-fA-F0-9]{40}|cs_[a-zA-Z0-9_-]{20,})["']?/gi,
    reason: 'Context rule: WooCommerce consumer secret assignment',
    confidence: 0.99,
    priority: LOW_PRIO,
  },
  // 24. URL & Site Endpoint Assignments
  {
    type: 'URL',
    name: 'URL Endpoint Assignment',
    pattern: /(?:[a-zA-Z0-9_]*(?:URL|URI|ENDPOINT|HOST|DOMAIN))\s*[:=]\s*["']?([^\s"'\n]{6,128})["']?/gi,
    reason: 'Context rule: URL endpoint assignment',
    confidence: 0.99,
    priority: MID_PRIO,
  },
  // 24b. Cloud DB Host / RDS Host Endpoint
  {
    type: 'URL',
    name: 'Cloud DB Host Endpoint',
    pattern: /(?:(?:db_host|database_host|rds_host|db_server|db_endpoint|host|server)\s*[:=]\s*["']?([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+)["']?|[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\.(?:rds\.amazonaws\.com|database\.azure\.com|cloudsql\.google\.com|internal|local))/gi,
    reason: 'Context rule: Cloud Database Host Endpoint',
    confidence: 0.99,
    priority: MID_PRIO,
  },
  // 25. Generic Sensitive Env Variables
  {
    type: 'SOURCE_CODE_SECRET',
    name: 'Environment Variable Assignment',
    pattern: /(?:[A-Z0-9_]{3,30}_(?:KEY|SECRET|TOKEN|PASS|PASSWORD|AUTH|CREDENTIALS))\s*[:=]\s*["']?([^\s"'\n]{6,128})["']?/gi,
    reason: 'Context rule: sensitive environment variable',
    confidence: 0.96,
    priority: LOW_PRIO,
  },
  // 26. Generic Secret, Key & Security Code Property Assignments (e.g. "secret: xyz", "code: 8847", "client_secret: ...")
  {
    type: 'COMPANY_SECRET',
    name: 'Secret Property Assignment',
    pattern: /(?<![-_])\b(?:secret|code|priv_key|private_key|api_secret|app_secret|client_secret|access_code|security_code|pin_code|auth_code|access_secret|webhook_secret|signing_secret|encryption_key|master_key)\s*[:=]\s*["']?([^\s"';,\}\)\n]{3,128})["']?/gi,
    reason: 'Context rule: secret / code property assignment',
    confidence: 0.97,
    priority: LOW_PRIO,
  },
  // 27. Generic Identity & Token Property Assignments (e.g. "tenant_id: 123", "session_id: abc")
  {
    type: 'CUSTOM_TERM',
    name: 'Identifier Property Assignment',
    pattern: /(?<![-_])\b(?:session_id|session_token|csrf_token|xsrf_token|refresh_token|tenant_id|account_id|client_id|customer_id|user_id|member_id|patient_id|employee_id|device_id)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{4,128})["']?/gi,
    reason: 'Context rule: identifier / token property assignment',
    confidence: 0.97,
    priority: LOW_PRIO,
  },
  // 27b. Order, Ticket, and Case Reference Identifiers
  {
    type: 'CUSTOM_TERM',
    name: 'Order / Ticket / Reference ID',
    pattern: /(?:#(?:ORD|TICK|TCK|REF|INV|CASE|TICKET|ORDER)-[0-9A-Za-z_-]{3,30}|\b(?:order|ticket|ref|invoice|case|tracking)\s*(?:#|id|num|number)?\s*[:=]?\s*#?([A-Z0-9]{2,10}-[0-9A-Za-z_-]{3,30}|[A-Z0-9_]{6,30})\b)/gi,
    reason: 'Context rule: Order / Ticket / Case Reference ID',
    confidence: 0.98,
    priority: MID_PRIO,
  },
];

const NON_SECRET_ENGLISH_WORDS = /^(?:Bearer|now|then|today|yesterday|tomorrow|tonight|currently|got|rotated|updated|changed|reset|expired|compromised|leaked|shared|used|needed|required|failed|passed|working|tested|saved|stored|please|swap|shift|ends|starts|here|there|below|above|prompt|field|fields|input|selector|label|text|count|total|list|length|name|type|id|icon|button|form|header|headers|authentication|auth|documentation|docs|string|value|values|required|optional|setting|settings|credentials|details|info|information|help|policy|manager|example|test|sample|slow|fast|load|stable|metrics|dashboard|service|services|everything|nothing|something|anything|api|key|token|secret|secrets|password|passwords|repository|repo|contains|contain|contained|containing|does|do|doing|done|did|phrase|phrases|word|words|sentence|sentences|called|named|file|files|is|was|are|were|will|be|been|being|have|has|had|not|but|and|or|so|if|for|in|on|at|to|from|with|by|about|an|a|the|this|that|these|those|new|old|one|two|three|next|same|true|false|null|undefined|none|good|bad|fine|easy|hard|set|agreed|apparently|another)$/i;

export interface LineWrapNormalizerResult {
  normalizedText: string;
  mapToOriginalOffset: (joinedOffset: number) => number;
}

export function normalizeWrappedSecretLines(originalText: string): LineWrapNormalizerResult {
  if (!originalText || !originalText.includes('\n')) {
    return {
      normalizedText: originalText,
      mapToOriginalOffset: (offset: number) => offset,
    };
  }

  const lines = originalText.split(/\r?\n/);
  const lineEndings: string[] = [];
  let pos = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    pos += line.length;
    if (pos < originalText.length && originalText[pos] === '\r') {
      lineEndings.push('\r\n');
      pos += 2;
    } else if (pos < originalText.length && originalText[pos] === '\n') {
      lineEndings.push('\n');
      pos += 1;
    } else {
      lineEndings.push('');
    }
  }

  const wrappedIndices = new Set<number>();
  const ASSIGNMENT_WRAP_LINE1 = /^(?!(?:http|https):)[a-zA-Z0-9_.-]{2,60}\s*[:=]\s*["']?[a-zA-Z0-9+/=_-]{8,120}$/i;
  const WRAPPED_LINE2 = /^[a-zA-Z0-9+/=_-]{8,128}$/;
  const PROSE_LINE = /^(?:This|Tell|The|Please|Contact|Check|Note|Regarding|Morning|Hello|Hi|Thanks|With|From|To|Let|Const|Var|And|Or|If|For)\b/i;

  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i].trimEnd();
    const l2 = lines[i + 1].trim();

    const m1 = ASSIGNMENT_WRAP_LINE1.test(l1);
    const m2 = WRAPPED_LINE2.test(l2);
    const noAssign = !l2.includes('=') && !l2.includes(':');
    const notProse = !PROSE_LINE.test(l2) && !l2.includes(' ');

    if (m1 && m2 && noAssign && notProse) {
      wrappedIndices.add(i);
    }
  }

  if (wrappedIndices.size === 0) {
    return {
      normalizedText: originalText,
      mapToOriginalOffset: (offset: number) => offset,
    };
  }

  let normalizedText = '';
  const joinedToOriginalMap: number[] = [];
  let origOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ending = lineEndings[i];

    for (let c = 0; c < line.length; c++) {
      joinedToOriginalMap.push(origOffset + c);
    }
    normalizedText += line;
    origOffset += line.length;

    if (wrappedIndices.has(i)) {
      origOffset += ending.length;
    } else {
      for (let e = 0; e < ending.length; e++) {
        joinedToOriginalMap.push(origOffset + e);
      }
      normalizedText += ending;
      origOffset += ending.length;
    }
  }

  joinedToOriginalMap.push(originalText.length);

  return {
    normalizedText,
    mapToOriginalOffset: (joinedOffset: number) => {
      if (joinedOffset < 0) return 0;
      if (joinedOffset >= joinedToOriginalMap.length) return originalText.length;
      return joinedToOriginalMap[joinedOffset];
    },
  };
}

export class SecretDetector implements Detector {
  public readonly id = 'secret-detector';
  public readonly name = 'Secret Scanner Detector';
  public readonly priority = PriorityLevel.REGEX + 5; // 95 priority for high security secrets

  public async detect(text: string, context?: DetectorContext): Promise<CandidateDetection[]> {
    const candidates: CandidateDetection[] = [];
    const { normalizedText, mapToOriginalOffset } = normalizeWrappedSecretLines(text);

    for (const rule of SECRET_PATTERNS) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(normalizedText)) !== null) {
        let matchedSubstring = match[1] || match[0];

        // Filter out false positive values (code method calls, UI label strings, English prose words)
        if (/^(?:document\.|window\.|location\.|console\.|Math\.|JSON\.|[a-zA-Z0-9_$]+\()\s*/.test(matchedSubstring)) {
          continue;
        }
        // Only reject standalone integers if the rule is NOT an explicit password, PIN, passcode, or access code declaration
        const isExplicitPasswordOrPinRule = rule.type === 'PASSWORD' || rule.name.includes('PIN') || rule.name.includes('Passcode');
        if (/^\d+$/.test(matchedSubstring) && (!isExplicitPasswordOrPinRule || matchedSubstring.length < 3)) {
          continue;
        }
        if (/^(?:API Key|Password Label|Token Count|Secret Key)$/i.test(matchedSubstring)) {
          continue;
        }
        if (NON_SECRET_ENGLISH_WORDS.test(matchedSubstring.trim())) {
          continue;
        }

        // If unquoted and ends with trailing grammatical sentence punctuation (e.g. . or , or ;), trim it
        const fullMatch = match[0];
        const isQuoted = (fullMatch.startsWith('"') && fullMatch.endsWith('"')) ||
                         (fullMatch.startsWith("'") && fullMatch.endsWith("'")) ||
                         (fullMatch.includes(`"${matchedSubstring}"`)) ||
                         (fullMatch.includes(`'${matchedSubstring}'`));

        if (!isQuoted) {
          while (matchedSubstring.length > 3 && /[.,;:!?]$/.test(matchedSubstring)) {
            matchedSubstring = matchedSubstring.slice(0, -1);
          }
        }

        const joinedStart = match.index + match[0].indexOf(matchedSubstring);
        const joinedEnd = joinedStart + matchedSubstring.length;

        const start = mapToOriginalOffset(joinedStart);
        const end = mapToOriginalOffset(joinedEnd);
        const originalMatchedText = text.substring(start, end);

        candidates.push({
          id: `secret_${rule.type.toLowerCase()}_${start}_${end}`,
          start,
          end,
          entityType: rule.type,
          confidence: rule.confidence,
          priority: rule.priority || this.priority,
          detectorId: this.id,
          evidence: rule.reason,
          atomic: true,
          text: originalMatchedText,
        });
      }
    }

    // 2. High-Entropy Alphanumeric Scanner & Preceding Context Classifier
    // When encountering mixed alphanumeric tokens (numbers and letters together):
    // Read the preceding context/label to classify, defaulting to PASSWORD if no label is present.
    const alphanumericPattern = /\b(?=[a-zA-Z0-9!@#$%^&*_-]*[0-9])(?=[a-zA-Z0-9!@#$%^&*_-]*[a-zA-Z])[a-zA-Z0-9!@#$%^&*_-]{5,64}\b/g;
    let alphaMatch: RegExpExecArray | null;

    while ((alphaMatch = alphanumericPattern.exec(normalizedText)) !== null) {
      let matchedToken = alphaMatch[0];
      const matchStart = alphaMatch.index;
      const matchEnd = matchStart + matchedToken.length;

      // Clean trailing punctuation
      while (matchedToken.length > 4 && /[.,;:!?]$/.test(matchedToken)) {
        matchedToken = matchedToken.slice(0, -1);
      }

      // Skip common non-secret tokens
      if (NON_SECRET_ENGLISH_WORDS.test(matchedToken) || /^(?:true|false|null|undefined)$/i.test(matchedToken)) {
        continue;
      }
      // Skip text that is part of existing [[TYPE_001]] placeholders or placeholder patterns
      if (/^[A-Z_]+_\d{3,}$/.test(matchedToken) ||
          normalizedText.substring(Math.max(0, matchStart - 2), matchStart) === '[[' ||
          normalizedText.substring(matchEnd, Math.min(normalizedText.length, matchEnd + 2)) === ']]') {
        continue;
      }
      // Skip dates (e.g. 2024-05-12, 12/05/2024), standard CSS/HTML colors (#fff), simple version numbers (v1.2.3, 14.2.15)
      if (/^\d{4}-\d{2}-\d{2}$/.test(matchedToken) || /^v?\d+\.\d+(?:\.\d+)*$/i.test(matchedToken) || /^#[0-9a-fA-F]{3,8}$/.test(matchedToken)) {
        continue;
      }
      // Skip simple units like 100px, 50kg, 20mins, or standalone integers
      if (/^\d+(?:px|em|rem|vh|vw|pt|cm|mm|in|kg|g|mg|lbs|oz|km|m|ft|sec|min|mins|hr|hrs|days|weeks|months|years|ms)$/i.test(matchedToken) || /^\d+$/.test(matchedToken)) {
        continue;
      }

      let charsetScore = 0;
      if (/[a-z]/.test(matchedToken)) charsetScore++;
      if (/[A-Z]/.test(matchedToken)) charsetScore++;
      if (/[0-9]/.test(matchedToken)) charsetScore++;
      if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(matchedToken)) charsetScore++;

      if (charsetScore < 2) {
        continue;
      }

      // Check if this span is already covered by an existing high-priority rule
      const joinedStart = matchStart;
      const joinedEnd = joinedStart + matchedToken.length;
      const start = mapToOriginalOffset(joinedStart);
      const end = mapToOriginalOffset(joinedEnd);

      const isAlreadyCovered = candidates.some((c) =>
        Math.max(c.start, start) < Math.min(c.end, end)
      );
      if (isAlreadyCovered) {
        continue;
      }

      // Read preceding context window (up to 50 characters before the token)
      const contextWindowStart = Math.max(0, matchStart - 50);
      const precedingText = normalizedText.substring(contextWindowStart, matchStart).toLowerCase();

      let targetType: EntityType = 'PASSWORD';
      let evidence = 'Mixed Alphanumeric Secret (Fallback Password)';

      if (/(?:\b(?:card[\s_-]*token|api[\s_-]*token|access[\s_-]*token|auth[\s_-]*token|token|api[\s_-]*key|client[\s_-]*token)\b|\b(?:tok_|card_|ghp_|sk_))/i.test(precedingText) || matchedToken.startsWith('tok_') || matchedToken.startsWith('card_')) {
        targetType = 'API_KEY';
        evidence = 'Contextual Token / API Key';
      } else if (/(?:\b(?:temp[\s_-]*password|temporary[\s_-]*password|new[\s_-]*password|admin[\s_-]*password|password|passwd|pwd|passcode|passphrase|secret[\s_-]*pass)\b)/i.test(precedingText)) {
        targetType = 'PASSWORD';
        evidence = 'Contextual Password';
      } else if (/(?:\b(?:webhook[\s_-]*signing[\s_-]*key|signing[\s_-]*key|secret[\s_-]*key|private[\s_-]*key|app[\s_-]*secret|client[\s_-]*secret|secret)\b|\bwhsec_)/i.test(precedingText) || matchedToken.startsWith('whsec_')) {
        targetType = 'COMPANY_SECRET';
        evidence = 'Contextual Secret / Signing Key';
      } else if (/(?:\b(?:order[\s_-]*id|order[\s_-]*num|order|ticket[\s_-]*id|ticket|invoice|ref[\s_-]*id|ref|account[\s_-]*id|customer[\s_-]*id)\b|#ord|#tck|#ref)/i.test(precedingText) || /^#?(?:ORD|TCK|REF|INV)-/i.test(matchedToken)) {
        targetType = 'CUSTOM_TERM';
        evidence = 'Contextual Order / Reference ID';
      } else if (/(?:\b(?:db[\s_-]*host|database[\s_-]*host|host|server|domain|endpoint)\b)/i.test(precedingText) || matchedToken.includes('.rds.amazonaws.com') || matchedToken.includes('.internal')) {
        targetType = 'URL';
        evidence = 'Contextual Host / Endpoint';
      } else {
        // Standalone mixed alphanumeric token without preceding context:
        // Must be >= 6 characters and contain complex character set (uppercase/lowercase/numbers/special)
        if (matchedToken.length >= 6 && (charsetScore >= 3 || /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(matchedToken) || (/[a-z]/.test(matchedToken) && /[A-Z]/.test(matchedToken) && /[0-9]/.test(matchedToken)))) {
          targetType = 'PASSWORD';
          evidence = 'Mixed Alphanumeric Secret (Standalone Password)';
        } else {
          continue;
        }
      }

      const originalMatchedText = text.substring(start, end);
      candidates.push({
        id: `secret_alpha_${targetType.toLowerCase()}_${start}_${end}`,
        start,
        end,
        entityType: targetType,
        confidence: 0.96,
        priority: PriorityLevel.REGEX + 4,
        detectorId: this.id,
        evidence,
        atomic: true,
        text: originalMatchedText,
      });
    }

    return candidates;
  }
}
