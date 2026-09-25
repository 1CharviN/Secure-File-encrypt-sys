'use client';

import React from 'react';
import AppLogo from '@/components/ui/AppLogo';
import type { ActiveTab } from './EncryptionLabClient';
import { Lock, Unlock, BookOpen, Shield } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface AppHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const tabs: { id: ActiveTab; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'encrypt', label: 'Encrypt', Icon: Lock },
  { id: 'decrypt', label: 'Decrypt', Icon: Unlock },
  { id: 'howitworks', label: 'How It Works', Icon: BookOpen },
];

export default function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <AppLogo size={32} />
            <div className="hidden sm:block">
              <span className="block font-semibold text-sm text-foreground tracking-tight">
                Secure File Transfer &amp; Encryption Lab
              </span>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                Browser-native hybrid encryption demo
              </p>
            </div>
          </div>

          {/* Tabs — center */}
          <nav className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg p-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={`tab-${id}`}
                onClick={() => onTabChange(id)}
                className={[
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                  activeTab === id
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                ].join(' ')}
              >
                <Icon size={14} className={activeTab === id ? 'text-primary' : ''} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-medium text-accent hidden sm:inline">Local-only</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
              <Shield size={11} className="text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">No server</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}