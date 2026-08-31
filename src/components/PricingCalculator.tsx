'use client';

import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const PricingCalculator: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const tiers = [
    {
      name: 'Individual',
      price: billingCycle === 'annual' ? '$3.99' : '$4.99',
      unit: '/ month',
      description: 'For solo developers, lawyers, doctors, and freelancers shielding their AI workflows.',
      features: [
        'Unlimited Manual Prompt Masks & Reveals',
        'Standard Secret, PII & PHI Detectors',
        'Deterministic Local Memory Zeroization',
        'Browser Extension & Copy-Paste Workflow',
        'Email & Community Support',
      ],
      cta: 'Get Individual Plan',
      highlighted: false,
    },
    {
      name: 'Team',
      price: billingCycle === 'annual' ? '$40' : '$50',
      unit: '/ month',
      description: 'Ideal for startups, dev teams, and boutique agencies (up to 10 seats).',
      features: [
        'Up to 10 Team Members Included',
        'Shared Organization Dictionary & Codenames',
        'Full Semantic NLP & Custom Policy Rules',
        '30-Day Audit Log Vault & Analytics',
        'Node.js & Python SDK Access (500k API req/mo)',
      ],
      cta: 'Start Team Plan',
      highlighted: true,
    },
    {
      name: 'Company',
      price: billingCycle === 'annual' ? '$240' : '$300',
      unit: '/ month',
      description: 'Designed for scaling companies with compliance and security mandates.',
      features: [
        'Up to 50 Team Members Included',
        '5,000,000 Masked Requests / mo via Proxy',
        'Sub-15ms Dedicated Proxy Gateway',
        'Role-Based Access Control (RBAC)',
        '1-Year Audit Retention & CSV Forensics Export',
        'Priority 24/7 Security Support',
      ],
      cta: 'Get Company Plan',
      highlighted: false,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For healthcare systems, financial institutions, and high-compliance enterprises.',
      features: [
        'Unlimited Seats & High-Throughput Proxying',
        'Private Cloud / On-Prem / VPC Deployment',
        'SSO SAML / Okta / Azure AD Integration',
        'SOC2 Type II & HIPAA Business Associate Agreement (BAA)',
        'Custom Detector Rules & Tailored AI Gateways',
        'Dedicated Security Architect & SLA Guarantees',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="w-full py-6">
      {/* Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2 rounded-xl border border-grey-800 bg-grey-900/80 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              billingCycle === 'monthly' ? 'bg-grey-800 text-white shadow' : 'text-grey-400 hover:text-grey-200'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              billingCycle === 'annual' ? 'bg-gold-500 text-grey-950 font-bold shadow-glow-gold' : 'text-grey-400 hover:text-grey-200'
            }`}
          >
            Annual Billing <span className="ml-1 rounded bg-grey-950/30 px-1.5 py-0.5 text-[10px] text-grey-950 font-extrabold">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`glass-panel flex flex-col justify-between rounded-2xl p-6 transition-all ${
              tier.highlighted
                ? 'border-gold-500/50 shadow-glow-gold relative'
                : 'border-grey-800 hover:border-grey-700'
            }`}
          >
            {tier.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-0.5 text-[10px] font-bold text-grey-950 shadow-glow-gold">
                MOST POPULAR
              </span>
            )}

            <div>
              <h3 className="font-mono text-lg font-bold text-white">{tier.name}</h3>
              <p className="mt-1 text-xs text-grey-400 min-h-[36px]">{tier.description}</p>
              
              <div className="mt-4 flex items-baseline space-x-1">
                <span className="font-mono text-3xl font-extrabold text-white">{tier.price}</span>
                {tier.unit && <span className="text-xs text-grey-400">{tier.unit}</span>}
              </div>

              <ul className="mt-6 space-y-2.5 text-xs text-grey-300">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-gold-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/#shield-workspace"
                className={`flex w-full items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  tier.highlighted
                    ? 'bg-gradient-gold text-grey-950 hover:opacity-90 shadow-glow-gold font-bold'
                    : 'bg-grey-800 text-white hover:bg-grey-700'
                }`}
              >
                <span>{tier.cta}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
