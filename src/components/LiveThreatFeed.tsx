'use client';

import React, { useEffect, useState } from 'react';

const FEED_EVENTS = [
  { id: 1, type: '🛡 API Key Shielded', placeholder: '[[API_KEY_001]]', dept: 'Engineering', time: '2s ago' },
  { id: 2, type: '🛡 Person Name Shielded', placeholder: '[[PERSON_001]]', dept: 'Legal', time: '14s ago' },
  { id: 3, type: '🛡 Project Codename Shielded', placeholder: '[[PROJECT_001]]', dept: 'R&D', time: '31s ago' },
  { id: 4, type: '🛡 DB Connection Shielded', placeholder: '[[CONNECTION_STRING_001]]', dept: 'DevOps', time: '1m ago' },
  { id: 5, type: '🛡 Email Address Shielded', placeholder: '[[EMAIL_001]]', dept: 'HR', time: '2m ago' },
  { id: 6, type: '🔓 Response Revealed', placeholder: '[[PERSON_001]] → John Doe', dept: 'Legal', time: '4m ago' },
  { id: 7, type: '🛡 SSN Shielded', placeholder: '[[SSN_001]]', dept: 'HR', time: '6m ago' },
  { id: 8, type: '🔓 Response Revealed', placeholder: '[[API_KEY_001]] → sk-proj-***', dept: 'Engineering', time: '9m ago' },
];

export const LiveThreatFeed: React.FC = () => {
  const [visibleIdx, setVisibleIdx] = useState(0);
  const [total, setTotal] = useState(38940);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleIdx((prev) => (prev + 1) % FEED_EVENTS.length);
      setTotal((prev) => prev + 1);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const current = FEED_EVENTS[visibleIdx];

  return (
    <div className="inline-flex items-center space-x-3 rounded-full border border-grey-800/80 bg-grey-900/90 px-4 py-2 backdrop-blur-sm font-mono text-xs text-grey-300 shadow-sm">
      <div className="flex items-center space-x-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-400" />
        </span>
        <span className="text-gold-400 font-bold text-[10px] uppercase tracking-wider">LIVE</span>
      </div>
      <span className="text-grey-400 text-[10px]">
        {total.toLocaleString()} entities shielded today
      </span>
      <span className="text-grey-700">|</span>
      <span className="text-[10px] text-gold-400 animate-fade-in-up" key={visibleIdx}>
        {current.type}: <span className="text-white font-bold">{current.placeholder}</span> — {current.dept}
      </span>
    </div>
  );
};
