'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  Upload, Unlock, Download, AlertCircle, Loader2,
  CheckCircle, XCircle, FileText, Hash, Eye, EyeOff,
  ClipboardPaste, Package,
} from 'lucide-react';
import type { SecurePackage } from './types';

interface DecryptPanelProps {
  packageText: string;
  parsedPackage: SecurePackage | null;
  privateKey: string;
  onPrivateKeyChange: (v: string) => void;
  onPackageUpload: (text: string) => void;
  onDecrypt: () => void;
  onDownloadDecrypted: () => void;
  status: 'idle' | 'decrypting' | 'verified' | 'error';
  error: string;
  integrityResult: 'pass' | 'fail' | null;
  decryptedName: string;
  suggestedKey: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DecryptPanel({
  parsedPackage, privateKey, onPrivateKeyChange,
  onPackageUpload, onDecrypt, onDownloadDecrypted,
  status, error, integrityResult, decryptedName, suggestedKey,
}: DecryptPanelProps) {
  const [pkgDragOver, setPkgDragOver] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const pkgInputRef = useRef<HTMLInputElement>(null);

  const isDecrypting = status === 'decrypting';
  const isVerified = status === 'verified';
  const isError = status === 'error';

  const readPackageFile = useCallback(async (f: File) => {
    const text = await f.text();
    onPackageUpload(text);
  }, [onPackageUpload]);

  const handlePkgDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setPkgDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) readPackageFile(f);
  }, [readPackageFile]);

  const handlePkgInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) readPackageFile(f);
  };

  const handlePasteKey = useCallback(() => {
    if (suggestedKey) {
      onPrivateKeyChange(suggestedKey);
    } else {
      navigator.clipboard.readText().then(text => {
        if (text.trim()) onPrivateKeyChange(text.trim());
      }).catch(() => {});
    }
  }, [suggestedKey, onPrivateKeyChange]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Unlock size={14} className="text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Decryption Lab</h2>
          <p className="text-[11px] text-muted-foreground">RSA-OAEP unwrap → AES-GCM decrypt → SHA-256 verify</p>
        </div>
      </div>

      {/* Step 1: Upload .secure package */}
      <div className="card-panel">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold flex items-center justify-center font-mono-crypto">1</span>
          <span className="text-xs font-semibold text-foreground">Upload .secure Package</span>
          {parsedPackage && (
            <span className="status-badge bg-accent/10 border border-accent/20 text-accent">
              <CheckCircle size={9} />
              Validated
            </span>
          )}
        </div>

        <div
          onDrop={handlePkgDrop}
          onDragOver={e => { e.preventDefault(); setPkgDragOver(true); }}
          onDragLeave={() => setPkgDragOver(false)}
          onClick={() => pkgInputRef.current?.click()}
          className={[
            'relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
            'flex flex-col items-center justify-center gap-2 py-6 px-4',
            pkgDragOver
              ? 'border-accent bg-accent/5 glow-emerald'
              : parsedPackage
              ? 'border-accent/40 bg-accent/5' :'border-border hover:border-accent/40 hover:bg-muted/30',
          ].join(' ')}
        >
          <input
            ref={pkgInputRef}
            type="file"
            accept=".secure,.json"
            className="hidden"
            onChange={handlePkgInput}
            aria-label="Upload .secure package"
          />

          {parsedPackage ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                <Package size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{parsedPackage.originalName}.secure</p>
                <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono-crypto text-xs text-muted-foreground">{formatBytes(parsedPackage.size)}</span>
                  <span className="status-badge bg-muted border border-border text-muted-foreground font-mono-crypto">{parsedPackage.aesAlgorithm}</span>
                  <span className="status-badge bg-muted border border-border text-muted-foreground font-mono-crypto">{parsedPackage.rsaAlgorithm}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{parsedPackage.createdAt}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload size={20} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Drop .secure package here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
            </div>
          )}
        </div>

        {/* Package metadata preview */}
        {parsedPackage && (
          <div className="mt-3 rounded-lg bg-background border border-border p-3 font-mono-crypto text-[11px] space-y-1">
            {[
              { k: 'originalName', v: parsedPackage.originalName },
              { k: 'mimeType', v: parsedPackage.mimeType },
              { k: 'size', v: formatBytes(parsedPackage.size) },
              { k: 'sha256', v: parsedPackage.sha256.slice(0, 24) + '…' },
            ].map(row => (
              <div key={`dec-meta-${row.k}`} className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">{row.k}:</span>
                <span className="text-accent/80 truncate">{row.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Private Key */}
      <div className="card-panel">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold flex items-center justify-center font-mono-crypto">2</span>
            <span className="text-xs font-semibold text-foreground">RSA Private Key</span>
            {privateKey.trim().includes('BEGIN PRIVATE KEY') && (
              <span className="status-badge bg-accent/10 border border-accent/20 text-accent">
                <CheckCircle size={9} />
                PEM detected
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePasteKey} className="btn-ghost">
              <ClipboardPaste size={11} />
              {suggestedKey ? 'Use generated key' : 'Paste'}
            </button>
            <button onClick={() => setShowKey(v => !v)} className="btn-ghost">
              {showKey ? <EyeOff size={11} /> : <Eye size={11} />}
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={privateKey}
            onChange={e => onPrivateKeyChange(e.target.value)}
            placeholder={`-----BEGIN PRIVATE KEY-----\nPaste your RSA private key in PEM format…\n-----END PRIVATE KEY-----`}
            rows={showKey ? 8 : 4}
            spellCheck={false}
            className={[
              'w-full rounded-lg border bg-background px-3 py-2.5 text-xs leading-relaxed',
              'focus:outline-none focus:ring-1 transition-all duration-150',
              'placeholder:text-muted-foreground/50 resize-none',
              'font-mono-crypto',
              showKey ? '' : 'text-security-disc',
              privateKey.trim().includes('BEGIN PRIVATE KEY')
                ? 'border-accent/40 text-accent/80 focus:border-accent/60 focus:ring-accent/20' :'border-border text-foreground focus:border-primary/60 focus:ring-primary/20',
            ].join(' ')}
            style={showKey ? {} : { WebkitTextSecurity: 'disc' } as React.CSSProperties}
          />
        </div>

        {suggestedKey && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            💡 A key pair was generated in the Encrypt tab — click "Use generated key" to auto-fill
          </p>
        )}
      </div>

      {/* Step 3: Decrypt */}
      <div className="card-panel">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold flex items-center justify-center font-mono-crypto">3</span>
          <span className="text-xs font-semibold text-foreground">Decrypt &amp; Verify</span>
        </div>

        <button
          onClick={onDecrypt}
          disabled={!parsedPackage || !privateKey.trim() || isDecrypting}
          className={[
            'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm',
            'transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
            'bg-accent text-accent-foreground hover:brightness-110',
          ].join(' ')}
        >
          {isDecrypting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Decrypting…
            </>
          ) : (
            <>
              <Unlock size={14} />
              Decrypt &amp; Verify Integrity
            </>
          )}
        </button>

        {!parsedPackage && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">Upload a .secure package to enable decryption</p>
        )}
        {parsedPackage && !privateKey.trim() && (
          <p className="text-[11px] text-warning mt-2 text-center">Paste your RSA private key to proceed</p>
        )}
      </div>

      {/* Error */}
      {(error || isError) && error && (
        <div className={`flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/30 fade-in-up ${isError ? 'shake' : ''}`}>
          <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger leading-relaxed">{error}</p>
        </div>
      )}

      {/* Integrity Result */}
      {integrityResult && (
        <div
          className={[
            'p-4 rounded-xl border fade-in-up integrity-reveal',
            integrityResult === 'pass' ?'bg-accent/5 border-accent/30 glow-emerald' :'bg-danger/5 border-danger/30 glow-danger',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            {integrityResult === 'pass' ? (
              <CheckCircle size={22} className="text-accent shrink-0" />
            ) : (
              <XCircle size={22} className="text-danger shrink-0" />
            )}
            <div>
              <p className={`text-sm font-bold ${integrityResult === 'pass' ? 'text-accent' : 'text-danger'}`}>
                {integrityResult === 'pass' ? 'SHA-256 Integrity Verified' : 'Integrity Check Failed'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {integrityResult === 'pass' ?'Decrypted file matches the original SHA-256 digest. File is authentic and unmodified.' :'SHA-256 digest mismatch — the package may have been tampered with.'}
              </p>
            </div>
          </div>

          {integrityResult === 'pass' && (
            <div className="mt-3 pt-3 border-t border-accent/20 flex items-center gap-2">
              <Hash size={12} className="text-accent shrink-0" />
              <span className="font-mono-crypto text-[10px] text-accent/60">
                SHA-256 digest verified against stored package hash
              </span>
            </div>
          )}
        </div>
      )}

      {/* Download recovered file */}
      {isVerified && decryptedName && (
        <div className="card-panel border-glow-emerald fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-accent" />
            <span className="text-xs font-semibold text-foreground">Recovered File</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
              <FileText size={14} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{decryptedName}</p>
              <p className="text-[10px] text-muted-foreground">Original file restored</p>
            </div>
          </div>
          <button onClick={onDownloadDecrypted} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm transition-all duration-150 active:scale-95 hover:brightness-110">
            <Download size={14} />
            Save Recovered File
          </button>
        </div>
      )}
    </div>
  );
}