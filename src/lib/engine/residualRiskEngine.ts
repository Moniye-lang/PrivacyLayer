import { EntityType } from '../../types';

export interface ResidualRiskResult {
  hasUnresolvedHighRisk: boolean;
  unresolvedCategories: string[];
  residualScore: number;
  safetyVerdict: 'SAFE TO SHARE' | 'REVIEW REQUIRED';
  unresolvedWarningMessage?: string;
}

interface ResidualPattern {
  name: string;
  category: string;
  pattern: RegExp;
}

const HIGH_RISK_RESIDUAL_PATTERNS: ResidualPattern[] = [
  {
    name: 'Unmasked API Key',
    category: 'API Key',
    pattern: /(sk-[a-zA-Z0-9_-]{10,120}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24,34}|sk_test_[0-9a-zA-Z]{24,34})/g,
  },
  {
    name: 'Unmasked Database URI',
    category: 'Connection String',
    pattern: /(mongodb(?:\+srv)?:\/\/|postgres(?:ql)?:\/\/|mysql2?:\/\/|rediss?:\/\/)[^\s"'\>]+/gi,
  },
  {
    name: 'Unmasked Private Key Block',
    category: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: 'Unmasked JWT Token',
    category: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  },
  {
    name: 'Unmasked Password Assignment',
    category: 'Password',
    pattern: /(?:(?:let|const|var|val|auto|\$)?\s*(?!(?:[a-zA-Z0-9_]*(?:Field|Element|Input|Selector|Label|Text|Count|Total|List|Length|Name|Type|Id|Icon|Button|Form)))(?:[a-zA-Z0-9_]*(?:password|passwd|pwd|dbpass|pass|secret|credential|auth)[a-zA-Z0-9_]*))\s*[:=]\s*["']?([^\s"';,\}\)\n\[]{3,128})["']?/gi,
  },
  {
    name: 'Unmasked Natural Language Password',
    category: 'Password',
    pattern: /(?:(?:my\s+|the\s+|login\s+|db\s+)?(?:password|passwd|pwd|secret)(?:\s+is|\s*:|\s*=)*[\s:=]+)["']?([^\s"';,\}\)\n\[]{3,128})["']?/gi,
  },
  {
    name: 'Unmasked Bearer Token',
    category: 'Bearer Token',
    pattern: /Bearer\s+([a-zA-Z0-9_\-\.]{8,128})/gi,
  },
  {
    name: 'Unmasked Secret Key Assignment',
    category: 'Secret Key',
    pattern: /(?:(?:let|const|var|val|auto|\$)?\s*(?!(?:[a-zA-Z0-9_]*(?:Field|Element|Input|Selector|Label|Text|Count|Total|List|Length|Name|Type|Id|Icon|Button|Form)))(?:[a-zA-Z0-9_]*(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|private[_-]?key|secret[_-]?key)[a-zA-Z0-9_]*))\s*[:=]\s*["']?([^\s"';,\}\)\n\[]{3,128})["']?/gi,
  },
];

/**
 * Performs a deterministic post-masking residual risk check on protected output prompt text.
 * Checks for any unmasked high-risk sensitive candidates remaining.
 */
export function evaluateResidualRisk(protectedPrompt: string): ResidualRiskResult {
  if (!protectedPrompt || protectedPrompt.trim().length === 0) {
    return {
      hasUnresolvedHighRisk: false,
      unresolvedCategories: [],
      residualScore: 99,
      safetyVerdict: 'SAFE TO SHARE',
    };
  }

  const unresolvedCategoriesSet = new Set<string>();

  for (const rule of HIGH_RISK_RESIDUAL_PATTERNS) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(protectedPrompt)) !== null) {
      const matchedStr = match[1] || match[0];
      // Skip if matched text is already a placeholder e.g. [[PASSWORD_001]]
      if (matchedStr.startsWith('[[') && matchedStr.endsWith(']]')) {
        continue;
      }
      unresolvedCategoriesSet.add(rule.category);
    }
  }

  const unresolvedCategories = Array.from(unresolvedCategoriesSet);
  const hasUnresolvedHighRisk = unresolvedCategories.length > 0;

  if (hasUnresolvedHighRisk) {
    const categoriesList = unresolvedCategories.join(', ');
    return {
      hasUnresolvedHighRisk: true,
      unresolvedCategories,
      residualScore: Math.max(20, 50 - unresolvedCategories.length * 15),
      safetyVerdict: 'REVIEW REQUIRED',
      unresolvedWarningMessage: `Potential sensitive data remaining (${categoriesList}). Review required.`,
    };
  }

  return {
    hasUnresolvedHighRisk: false,
    unresolvedCategories: [],
    residualScore: 99,
    safetyVerdict: 'SAFE TO SHARE',
  };
}
