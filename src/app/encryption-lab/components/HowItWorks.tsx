import React from 'react';
import { Key, Shield, Hash, Lock, Unlock, FileText, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const concepts = [
  {
    id: 'concept-aes',
    icon: Shield,
    title: 'AES-256-GCM — Encrypt the File',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    body: 'AES-256-GCM is used for the actual file because it is fast, secure, and provides authenticated encryption. It protects confidentiality and detects tampering at the same time.',
    detail: 'This is why the file itself is encrypted with AES: symmetric encryption is efficient for large files, while the AES key remains small and manageable.',
  },
  {
    id: 'concept-rsa',
    icon: Key,
    title: 'RSA-OAEP — Protect the AES Key',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    body: 'RSA-OAEP wraps the AES session key with the public key, so only the matching private key can unlock it. This keeps the symmetric key protected without exposing it to the server.',
    detail: 'This is the core of hybrid encryption: AES encrypts the file efficiently, while RSA securely protects the AES key for transport and recovery.',
  },
  {
    id: 'concept-sha',
    icon: Hash,
    title: 'SHA-256 — Verify Integrity',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    body: 'Before packaging, the original file is hashed with SHA-256. After decryption, the app computes the hash again and compares it to the stored digest.',
    detail: 'If even one bit changes, the digest changes. This gives a simple integrity check and lets the app reject tampered package data.',
  },
  {
    id: 'concept-local',
    icon: Lock,
    title: 'Local-only Workflow',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    body: 'All cryptographic operations run in the browser with the Web Crypto API. The file, AES key, RSA private key, and recovered content never leave the local device memory.',
    detail: 'That makes the demo a clear zero-server-trust scenario: no upload, no storage, no backend processing, and no cloud visibility into the actual file.',
  },
];

const steps = [
  { id: 'step-file', label: 'Select File', sub: 'FileReader → ArrayBuffer', icon: FileText },
  { id: 'step-aes', label: 'Generate AES Key', sub: 'crypto.subtle.generateKey', icon: Key },
  { id: 'step-gcm', label: 'AES-GCM Encrypt', sub: 'ciphertext + auth tag', icon: Shield },
  { id: 'step-rsa', label: 'RSA-OAEP Wrap', sub: 'encrypt AES key', icon: Lock },
  { id: 'step-sha', label: 'SHA-256 Digest', sub: 'original plaintext', icon: Hash },
  { id: 'step-pkg', label: '.secure Package', sub: 'JSON + Base64', icon: FileText },
];

const decryptSteps = [
  { id: 'dstep-upload', label: 'Upload Package', sub: 'parse JSON, validate', icon: FileText },
  { id: 'dstep-key', label: 'Import Private Key', sub: 'PKCS#8 PEM → CryptoKey', icon: Key },
  { id: 'dstep-unwrap', label: 'RSA-OAEP Unwrap', sub: 'recover AES key', icon: Unlock },
  { id: 'dstep-decrypt', label: 'AES-GCM Decrypt', sub: 'ciphertext → plaintext', icon: Shield },
  { id: 'dstep-sha', label: 'SHA-256 Verify', sub: 'compare digests', icon: Hash },
  { id: 'dstep-save', label: 'Download File', sub: 'Blob → original filename', icon: FileText },
];

const limitations = [
  'No key recovery — lost private key means data is unrecoverable',
  'No identity verification — cannot prove who encrypted the file',
  'Browser memory limit — very large files (>500 MB) may cause issues',
  'No multi-recipient encryption in this demo',
  'RSA-2048 is not quantum-resistant',
];

const strengths = [
  'Industry-standard algorithms (AES-256, RSA-2048, SHA-256)',
  'Authenticated encryption via GCM — tampering detected automatically',
  'Zero server trust — files never leave the browser',
  'Unique AES key and IV generated per encryption',
  'Hardware-accelerated via browser Web Crypto API',
];

export default function HowItWorks() {
  return (
    <div className="space-y-6">
      {/* Concept Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {concepts?.map(({ id, icon: Icon, title, color, bg, border, body, detail }) => (
          <div key={id} className={`rounded-xl border ${border} ${bg} p-5`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${color}`}>{title}</h3>
                <p className="text-xs text-foreground mt-2 leading-relaxed">{body}</p>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed border-t border-border/50 pt-2">{detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-panel">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lock size={14} className="text-primary" />
          Encryption Flow
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {steps?.map(({ id, label, sub, icon: Icon }, i) => (
            <React.Fragment key={id}>
              <div className="flex flex-col items-center gap-1.5 min-w-[86px]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon size={16} className="text-primary" />
                </div>
                <span className="text-[10px] font-semibold text-foreground text-center">{label}</span>
                <span className="font-mono-crypto text-[9px] text-muted-foreground text-center leading-tight">{sub}</span>
              </div>
              {i < steps?.length - 1 && (
                <ArrowRight size={14} className="text-muted-foreground shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          In plain terms: the file is encrypted with a fresh AES key, the AES key is protected with the recipient’s public key, and the package is downloaded as a .secure artifact.
        </p>
      </div>

      <div className="card-panel">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Unlock size={14} className="text-accent" />
          Decryption Flow
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {decryptSteps?.map(({ id, label, sub, icon: Icon }, i) => (
            <React.Fragment key={id}>
              <div className="flex flex-col items-center gap-1.5 min-w-[86px]">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Icon size={16} className="text-accent" />
                </div>
                <span className="text-[10px] font-semibold text-foreground text-center">{label}</span>
                <span className="font-mono-crypto text-[9px] text-muted-foreground text-center leading-tight">{sub}</span>
              </div>
              {i < decryptSteps?.length - 1 && (
                <ArrowRight size={14} className="text-muted-foreground shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          The recipient uploads the .secure package, pastes the matching private key, verifies the digest, and then downloads the recovered original file only if decryption and integrity checks pass.
        </p>
      </div>

      {/* Strengths + Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-panel">
          <h3 className="text-sm font-semibold text-accent mb-3 flex items-center gap-2">
            <CheckCircle size={14} />
            Security Strengths
          </h3>
          <ul className="space-y-2">
            {strengths?.map((s, i) => (
              <li key={`strength-${i}`} className="flex items-start gap-2">
                <CheckCircle size={11} className="text-accent shrink-0 mt-0.5" />
                <span className="text-xs text-foreground leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-panel">
          <h3 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
            <AlertTriangle size={14} />
            Known Limitations
          </h3>
          <ul className="space-y-2">
            {limitations?.map((l, i) => (
              <li key={`limit-${i}`} className="flex items-start gap-2">
                <AlertTriangle size={11} className="text-warning shrink-0 mt-0.5" />
                <span className="text-xs text-foreground leading-relaxed">{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* .secure Package Structure */}
      <div className="card-panel">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          .secure Package Structure
        </h3>
        <pre className="pem-block bg-background border border-border rounded-lg p-4 text-[11px] text-primary/70 overflow-x-auto">
{`{
  "format": "secure-file-v1",
  "originalName": "confidential-report.pdf",
  "mimeType": "application/pdf",
  "size": 2457600,
  "createdAt": "2026-09-25T16:11:51.120Z",
  "aesAlgorithm": "AES-256-GCM",
  "rsaAlgorithm": "RSA-OAEP-256",
  "encryptedKey": "SGVsbG8gV29ybGQh...",   // RSA-encrypted AES key (Base64)
  "iv": "cmFuZG9tIGl2",                    // 12-byte GCM IV (Base64)
  "ciphertext": "dGhpcyBpcyB...",           // AES-GCM ciphertext + auth tag (Base64)
  "sha256": "e3b0c44298fc..."               // SHA-256 of original plaintext (Base64)
}`}
        </pre>
        <p className="text-[11px] text-muted-foreground mt-2">
          The .secure file is safe to share publicly — without the matching private key, the ciphertext is computationally infeasible to decrypt.
        </p>
      </div>
    </div>
  );
}