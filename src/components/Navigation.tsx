'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, History, Settings, FileText, Sliders } from 'lucide-react';

export const Navigation: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Shield', href: '/', icon: Shield, shortLabel: 'Shield' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortLabel: 'Dash' },
    { name: 'Vault', href: '/history', icon: History, shortLabel: 'Vault' },
    { name: 'Rules', href: '/rules', icon: Sliders, shortLabel: 'Rules' },
    { name: 'Settings', href: '/settings', icon: Settings, shortLabel: 'Settings' },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-grey-800/80 bg-grey-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <Link href="/" className="group flex items-center space-x-2.5 sm:space-x-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-gold p-0.5 shadow-glow-gold transition-transform group-hover:scale-105">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-grey-900">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-gold-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs sm:text-sm font-extrabold tracking-wider text-white">
                  AQUIRE<span className="text-gold-400">1</span>
                </span>
                <span className="text-[8px] sm:text-[9px] tracking-widest text-grey-400 font-mono hidden xs:inline">PRIVACY GATEWAY</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-grey-800 text-gold-400 border border-gold-500/30 shadow-sm'
                      : 'text-grey-300 hover:bg-grey-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-gold-400' : 'text-grey-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <Link
              href="/docs"
              className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-mono font-medium transition-all ${
                pathname === '/docs'
                  ? 'bg-grey-800 text-gold-400 border border-gold-500/30 shadow-sm'
                  : 'text-grey-300 hover:bg-grey-800/60 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-grey-400" />
              <span>Docs</span>
            </Link>
          </nav>

          {/* Quick Action / Status indicator */}
          <div className="flex items-center space-x-2">
            <div className="hidden xs:flex items-center space-x-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gateway Live</span>
            </div>
            <Link
              href="/"
              className="group relative inline-flex items-center justify-center rounded-lg bg-gradient-gold p-0.5 text-xs font-semibold text-white shadow-glow-gold transition-all hover:scale-105 active:scale-95"
            >
              <span className="flex items-center space-x-1 sm:space-x-1.5 rounded-[7px] bg-grey-900 px-2.5 sm:px-3.5 py-1 sm:py-1.5 font-mono text-[10px] sm:text-[11px] font-bold text-gold-300 transition-all group-hover:bg-transparent group-hover:text-grey-950">
                <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gold-400 group-hover:text-grey-950" />
                <span>Shield</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed bottom with safe-area spacing) */}
      <nav 
        aria-label="Mobile Navigation" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-grey-800/90 bg-grey-950/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[56px] rounded-xl transition-all active:scale-90 ${
                  isActive
                    ? 'text-gold-400 font-semibold'
                    : 'text-grey-400 hover:text-grey-200'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1.5 w-8 h-1 bg-gradient-to-r from-gold-500 to-gold-400 rounded-full shadow-glow-gold animate-in fade-in" />
                )}
                <div className={`p-1 rounded-lg ${isActive ? 'bg-gold-500/10' : ''}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-gold-400' : 'text-grey-400'}`} />
                </div>
                <span className="text-[10px] font-mono tracking-tight mt-0.5">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

