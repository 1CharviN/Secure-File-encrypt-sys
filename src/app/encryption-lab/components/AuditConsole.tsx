'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { AuditEntry } from './types';

interface AuditConsoleProps {
  entries: AuditEntry[];
}

const levelColors: Record<AuditEntry['level'], string> = {
  info: 'text-primary/70',
  success: 'text-accent',
  warning: 'text-warning',
  error: 'text-danger',
};

const levelPrefixes: Record<AuditEntry['level'], string> = {
  info: '[INFO ]',
  success: '[OK   ]',
  warning: '[WARN ]',
  error: '[ERROR]',
};

const opColors: Record<string, string> = {
  RSA_KEYGEN: 'text-purple-400',
  AES_KEYGEN: 'text-cyan-400',
  AES_ENCRYPT: 'text-cyan-400',
  AES_DECRYPT: 'text-cyan-400',
  AES_IMPORT: 'text-cyan-400',
  RSA_WRAP: 'text-purple-400',
  RSA_UNWRAP: 'text-purple-400',
  RSA_IMPORT: 'text-purple-400',
  SHA256: 'text-yellow-400',
  SHA256_VERIFY: 'text-yellow-400',
  FILE_READ: 'text-blue-400',
  PKG_CREATE: 'text-emerald-400',
  PKG_PARSE: 'text-emerald-400',
  KEY_EXPORT: 'text-purple-400',
  KEY_DOWNLOAD: 'text-orange-400',
  DOWNLOAD: 'text-blue-400',
  READY: 'text-emerald-400',
  RECOVERED: 'text-emerald-400',
  RESET: 'text-slate-400',
  ENCRYPT_ERR: 'text-red-400',
  DECRYPT_ERR: 'text-red-400',
};

export default function AuditConsole({ entries }: AuditConsoleProps) {
  const [expanded, setExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current && expanded) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries, autoScroll, expanded]);

  const handleExport = () => {
    const lines = [...entries].reverse().map(e =>
      `${e.timestamp} ${levelPrefixes[e.level]} [${e.operation.padEnd(14)}] ${e.detail}`
    ).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultencrypt-audit-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-panel">
      {/* Console Header */}
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-danger/60" />
            <span className="w-3 h-3 rounded-full bg-warning/60" />
            <span className="w-3 h-3 rounded-full bg-accent/60" />
          </div>
          <Terminal size={13} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Cryptographic Audit Console</span>
          {entries.length > 0 && (
            <span className="status-badge bg-muted border border-border text-muted-foreground font-mono-crypto">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {entries.length > 0 && (
            <>
              <button onClick={handleExport} className="btn-ghost" title="Export audit log">
                <Download size={11} />
                Export
              </button>
              <button
                onClick={() => setAutoScroll(v => !v)}
                className={`btn-ghost ${autoScroll ? 'text-primary' : ''}`}
                title="Toggle auto-scroll"
              >
                Auto
              </button>
            </>
          )}
          <button onClick={() => setExpanded(v => !v)} className="btn-ghost">
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          ref={scrollRef}
          className="mt-3 rounded-lg bg-background border border-border overflow-y-auto"
          style={{ maxHeight: '280px', minHeight: '120px' }}
        >
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Terminal size={20} className="text-muted-foreground/40" />
              <p className="font-mono-crypto text-xs text-muted-foreground/60">
                Waiting for cryptographic operations…
              </p>
              <p className="font-mono-crypto text-[10px] text-muted-foreground/40">
                Generate keys or encrypt a file to begin
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-0.5">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="audit-entry flex gap-2 py-0.5 hover:bg-muted/20 rounded px-1 transition-colors duration-100 group"
                >
                  <span className="text-muted-foreground/40 shrink-0 select-none">{entry.timestamp}</span>
                  <span className={`shrink-0 font-bold ${levelColors[entry.level]}`}>
                    {levelPrefixes[entry.level]}
                  </span>
                  <span className={`shrink-0 font-semibold w-[100px] ${opColors[entry.operation] ?? 'text-muted-foreground'}`}>
                    [{entry.operation}]
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-100 break-all">
                    {entry.detail}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1 pt-1 pl-1">
                <span className="font-mono-crypto text-[10px] text-primary cursor-blink select-none">▋</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-1">
          {(Object.entries(levelColors) as [AuditEntry['level'], string][]).map(([level, color]) => (
            <div key={`legend-${level}`} className="flex items-center gap-1.5">
              <span className={`font-mono-crypto text-[10px] font-bold ${color}`}>
                {levelPrefixes[level]}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">{level}</span>
            </div>
          ))}
          <span className="text-[10px] text-muted-foreground ml-auto">All operations run in-browser · No data transmitted</span>
        </div>
      )}
    </div>
  );
}