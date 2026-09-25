'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  Upload, RefreshCw, Lock, Download, Copy, Check,
  FileText, Key, AlertCircle, Loader2, RotateCcw,
  Eye, EyeOff, ChevronDown, ChevronUp, Package,
} from 'lucide-react';
import type { SecurePackage } from './types';

interface EncryptPanelProps {
  file: File | null;
  onFileChange: (f: File | null) => void;
  publicPem: string;
  privatePem: string;
  onGenerateKeys: () => void;
  onEncrypt: () => void;
  onDownloadPackage: () => void;
  onDownloadPrivateKey: () => void;
  onReset: () => void;
  encryptedPackage: SecurePackage | null;
  status: 'idle' | 'generating-keys' | 'encrypting' | 'done' | 'error';
  error: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="btn-ghost gap-1">
      {copied ? <Check size={11} className="text-accent" /> : <Copy size={11} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function PemBlock({ label, pem, defaultHidden = false }: { label: string; pem: string; defaultHidden?: boolean }) {
  const [visible, setVisible] = useState(!defaultHidden);
  const [expanded, setExpanded] = useState(false);

  const displayPem = expanded ? pem : pem.split('\n').slice(0, 5).join('\n') + (pem.split('\n').length > 5 ? '\n…' : '');

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Key size={12} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton text={pem} />
          <button onClick={() => setVisible(v => !v)} className="btn-ghost gap-1">
            {visible ? <EyeOff size={11} /> : <Eye size={11} />}
            {visible ? 'Hide' : 'Show'}
          </button>
          {visible && (
            <button onClick={() => setExpanded(e => !e)} className="btn-ghost gap-1">
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'Less' : 'More'}
            </button>
          )}
        </div>
      </div>
      {visible && (
        <pre className={`pem-block px-3 py-2.5 text-primary/80 overflow-x-auto ${expanded ? 'max-h-48' : 'max-h-24'} overflow-y-auto`}>
          {displayPem}
        </pre>
      )}
    </div>
  );
}

export default function EncryptPanel({
  file, onFileChange,
  publicPem, privatePem,
  onGenerateKeys, onEncrypt,
  onDownloadPackage, onDownloadPrivateKey,
  onReset, encryptedPackage, status, error,
}: EncryptPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = status === 'generating-keys';
  const isEncrypting = status === 'encrypting';
  const isDone = status === 'done';
  const isError = status === 'error';
  const hasKeys = !!publicPem && !!privatePem;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  }, [onFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileChange(f);
  };

  const fileExtension = file?.name.split('.').pop()?.toUpperCase() ?? '';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Lock size={14} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Encryption Lab</h2>
            <p className="text-[11px] text-muted-foreground">AES-256-GCM + RSA-OAEP</p>
          </div>
        </div>
        <button onClick={onReset} className="btn-ghost">
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Step 1: File Drop Zone */}
      <div className="card-panel">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center font-mono-crypto">1</span>
          <span className="text-xs font-semibold text-foreground">Select File</span>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
            'flex flex-col items-center justify-center gap-3 py-8 px-4',
            dragOver
              ? 'border-primary bg-primary/5 glow-cyan'
              : file
              ? 'border-accent/40 bg-accent/5' :'border-border hover:border-primary/40 hover:bg-muted/30',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInput}
            aria-label="Select file to encrypt"
          />

          {file ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                <FileText size={22} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">{file.name}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="font-mono-crypto text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  {fileExtension && (
                    <span className="status-badge bg-muted text-muted-foreground border border-border">{fileExtension}</span>
                  )}
                  <span className="font-mono-crypto text-[10px] text-muted-foreground">{file.type || 'application/octet-stream'}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Click to change file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
                <Upload size={22} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Any file type — PDF, image, document, archive</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: RSA Key Pair */}
      <div className="card-panel">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center font-mono-crypto">2</span>
            <span className="text-xs font-semibold text-foreground">RSA Key Pair</span>
            {hasKeys && (
              <span className="status-badge bg-accent/10 border border-accent/20 text-accent">
                <Check size={9} />
                Generated
              </span>
            )}
          </div>
          <button
            onClick={onGenerateKeys}
            disabled={isGenerating || isEncrypting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {isGenerating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                {hasKeys ? 'Regenerate' : 'Generate Local Pair'}
              </>
            )}
          </button>
        </div>

        {hasKeys ? (
          <div className="flex flex-col gap-2">
            <PemBlock label="Public Key (SPKI)" pem={publicPem} />
            <PemBlock label="Private Key (PKCS#8) — Keep Secret" pem={privatePem} defaultHidden />
            <div className="flex gap-2 mt-1">
              <button onClick={onDownloadPrivateKey} className="btn-ghost text-warning border border-warning/20 bg-warning/5 hover:bg-warning/10 rounded-md px-3 py-1.5 text-xs">
                <Download size={11} />
                Download .key file
              </button>
              <p className="text-[10px] text-muted-foreground self-center">
                ⚠ Loss of private key means data is unrecoverable
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <Key size={16} className="text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Generate a 2048-bit RSA-OAEP key pair locally. The public key will encrypt your AES session key; the private key decrypts it.
            </p>
          </div>
        )}
      </div>

      {/* Step 3: Encrypt */}
      <div className="card-panel">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center font-mono-crypto">3</span>
          <span className="text-xs font-semibold text-foreground">Encrypt &amp; Package</span>
        </div>

        <button
          onClick={onEncrypt}
          disabled={!file || !hasKeys || isEncrypting || isGenerating}
          className="btn-primary w-full"
        >
          {isEncrypting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Encrypting…
            </>
          ) : (
            <>
              <Lock size={14} />
              Encrypt &amp; Create .secure Package
            </>
          )}
        </button>

        {!file && !isEncrypting && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">Select a file above to enable encryption</p>
        )}
        {file && !hasKeys && !isEncrypting && (
          <p className="text-[11px] text-warning mt-2 text-center">Generate RSA keys before encrypting</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/30 border-glow-danger fade-in-up">
          <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger leading-relaxed">{error}</p>
        </div>
      )}

      {/* Success: Package Ready */}
      {isDone && encryptedPackage && (
        <div className="card-panel border-glow-emerald fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Package size={13} className="text-accent" />
            </div>
            <span className="text-xs font-semibold text-foreground">Package Ready</span>
            <span className="status-badge bg-accent/10 border border-accent/20 text-accent">
              <Check size={9} />
              Encrypted
            </span>
          </div>

          {/* Package metadata */}
          <div className="rounded-lg bg-background border border-border p-3 mb-3 font-mono-crypto text-[11px] space-y-1.5">
            {[
              { label: 'format', value: encryptedPackage.format },
              { label: 'originalName', value: encryptedPackage.originalName },
              { label: 'mimeType', value: encryptedPackage.mimeType },
              { label: 'size', value: formatBytes(encryptedPackage.size) },
              { label: 'aesAlgorithm', value: encryptedPackage.aesAlgorithm },
              { label: 'rsaAlgorithm', value: encryptedPackage.rsaAlgorithm },
              { label: 'createdAt', value: encryptedPackage.createdAt },
              { label: 'iv', value: encryptedPackage.iv.slice(0, 20) + '…' },
              { label: 'sha256', value: encryptedPackage.sha256.slice(0, 20) + '…' },
            ].map(row => (
              <div key={`pkg-row-${row.label}`} className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">{row.label}:</span>
                <span className="text-primary/80 truncate">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={onDownloadPackage} className="btn-primary flex-1">
              <Download size={13} />
              Download .secure
            </button>
            <button onClick={onDownloadPrivateKey} className="btn-secondary flex-1">
              <Key size={13} />
              Download .key
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Share the .secure file freely — keep the .key file secret
          </p>
        </div>
      )}
    </div>
  );
}