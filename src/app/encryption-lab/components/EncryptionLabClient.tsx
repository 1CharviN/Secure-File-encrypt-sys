'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import AppHeader from './AppHeader';
import PipelineVisualization from './PipelineVisualization';
import EncryptPanel from './EncryptPanel';
import DecryptPanel from './DecryptPanel';
import AuditConsole from './AuditConsole';
import HowItWorks from './HowItWorks';
import type { PipelineStage, AuditEntry, SecurePackage } from './types';

export type ActiveTab = 'encrypt' | 'decrypt' | 'howitworks';

const INITIAL_PIPELINE: PipelineStage[] = [
  { id: 'stage-file',    label: 'File Input',    icon: 'FileText',   status: 'idle' },
  { id: 'stage-aes',     label: 'AES-256',       icon: 'Key',        status: 'idle' },
  { id: 'stage-gcm',     label: 'GCM Encrypt',   icon: 'Shield',     status: 'idle' },
  { id: 'stage-rsa',     label: 'RSA-OAEP',      icon: 'Lock',       status: 'idle' },
  { id: 'stage-sha',     label: 'SHA-256',        icon: 'Hash',       status: 'idle' },
  { id: 'stage-pkg',     label: '.secure Pkg',   icon: 'Package',    status: 'idle' },
];

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer.slice(0);
}

function toPem(buffer: ArrayBuffer, label: string): string {
  const b64 = bufferToBase64(buffer);
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

function fromPem(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  return base64ToBuffer(b64);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function EncryptionLabClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('encrypt');
  const [pipeline, setPipeline] = useState<PipelineStage[]>(INITIAL_PIPELINE);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // Encrypt state
  const [encFile, setEncFile] = useState<File | null>(null);
  const [publicPem, setPublicPem] = useState('');
  const [privatePem, setPrivatePem] = useState('');
  const [encryptedPackage, setEncryptedPackage] = useState<SecurePackage | null>(null);
  const [encStatus, setEncStatus] = useState<'idle' | 'generating-keys' | 'encrypting' | 'done' | 'error'>('idle');
  const [encError, setEncError] = useState('');

  // Decrypt state
  const [decPackageText, setDecPackageText] = useState('');
  const [decParsedPackage, setDecParsedPackage] = useState<SecurePackage | null>(null);
  const [decPrivateKey, setDecPrivateKey] = useState('');
  const [decStatus, setDecStatus] = useState<'idle' | 'decrypting' | 'verified' | 'error'>('idle');
  const [decError, setDecError] = useState('');
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);
  const [decryptedName, setDecryptedName] = useState('');
  const [integrityResult, setIntegrityResult] = useState<'pass' | 'fail' | null>(null);

  const rsaKeyPairRef = useRef<CryptoKeyPair | null>(null);

  const addAudit = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`;
    setAuditLog(prev => [{
      id: `audit-${Date.now()}-${Math.floor(prev.length)}`,
      timestamp: ts,
      ...entry,
    }, ...prev]);
  }, []);

  const updatePipelineStage = useCallback((stageId: string, status: PipelineStage['status']) => {
    setPipeline(prev => prev.map(s => s.id === stageId ? { ...s, status } : s));
  }, []);

  const resetPipeline = useCallback(() => {
    setPipeline(INITIAL_PIPELINE.map(s => ({ ...s, status: 'idle' as const })));
  }, []);

  // ─── Generate RSA Key Pair ────────────────────────────────────────────────
  const handleGenerateKeys = useCallback(async () => {
    setEncStatus('generating-keys');
    setEncError('');
    setPublicPem('');
    setPrivatePem('');
    setEncryptedPackage(null);
    resetPipeline();

    addAudit({ operation: 'RSA_KEYGEN', detail: 'Generating RSA-OAEP 2048-bit key pair…', level: 'info' });

    try {
      // Backend integration point: replace with server-side key management if needed
      const pair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt'],
      );

      rsaKeyPairRef.current = pair;

      const pubBuf = await crypto.subtle.exportKey('spki', pair.publicKey);
      const privBuf = await crypto.subtle.exportKey('pkcs8', pair.privateKey);

      const pub = toPem(pubBuf, 'PUBLIC KEY');
      const priv = toPem(privBuf, 'PRIVATE KEY');

      setPublicPem(pub);
      setPrivatePem(priv);
      setEncStatus('idle');

      addAudit({ operation: 'RSA_KEYGEN', detail: `RSA-OAEP 2048-bit key pair generated. Public exponent: 65537. Hash: SHA-256.`, level: 'success' });
      addAudit({ operation: 'KEY_EXPORT', detail: `Public key exported as SPKI (${formatBytes(pubBuf.byteLength)}). Private key exported as PKCS#8 (${formatBytes(privBuf.byteLength)}).`, level: 'info' });
    } catch (err) {
      setEncStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown error during key generation';
      setEncError(`Key generation failed: ${msg}`);
      addAudit({ operation: 'RSA_KEYGEN', detail: `Key generation failed: ${msg}`, level: 'error' });
    }
  }, [addAudit, resetPipeline]);

  // ─── Encrypt File ────────────────────────────────────────────────────────
  const handleEncrypt = useCallback(async () => {
    if (!encFile) { setEncError('Select a file before encrypting.'); return; }
    if (!rsaKeyPairRef.current) { setEncError('Generate an RSA key pair first.'); return; }

    setEncStatus('encrypting');
    setEncError('');
    setEncryptedPackage(null);
    resetPipeline();

    try {
      // Stage 1: File
      updatePipelineStage('stage-file', 'active');
      addAudit({ operation: 'FILE_READ', detail: `Reading "${encFile.name}" (${formatBytes(encFile.size)}, ${encFile.type || 'application/octet-stream'}) into ArrayBuffer…`, level: 'info' });
      const source = new Uint8Array(await encFile.arrayBuffer());
      updatePipelineStage('stage-file', 'done');
      addAudit({ operation: 'FILE_READ', detail: `File loaded: ${source.byteLength} bytes.`, level: 'success' });

      // Stage 2: AES Key
      updatePipelineStage('stage-aes', 'active');
      addAudit({ operation: 'AES_KEYGEN', detail: 'Generating ephemeral AES-256-GCM key via crypto.subtle.generateKey…', level: 'info' });
      const aesKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
      const rawAes = await crypto.subtle.exportKey('raw', aesKey);
      const aesHex = Array.from(new Uint8Array(rawAes)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16) + '…';
      updatePipelineStage('stage-aes', 'done');
      addAudit({ operation: 'AES_KEYGEN', detail: `AES-256-GCM key generated (${rawAes.byteLength * 8}-bit). Key preview: ${aesHex}`, level: 'success' });

      // Stage 3: GCM Encrypt
      updatePipelineStage('stage-gcm', 'active');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      addAudit({ operation: 'AES_ENCRYPT', detail: `Generating random 12-byte IV: ${bufferToBase64(iv.buffer).slice(0, 16)}…`, level: 'info' });
      addAudit({ operation: 'AES_ENCRYPT', detail: `Encrypting ${formatBytes(source.byteLength)} with AES-256-GCM (includes 128-bit auth tag)…`, level: 'info' });
      const ciphertextBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        source,
      );
      updatePipelineStage('stage-gcm', 'done');
      addAudit({ operation: 'AES_ENCRYPT', detail: `Ciphertext: ${formatBytes(ciphertextBuf.byteLength)} (file + 16-byte GCM auth tag). IV stored in package.`, level: 'success' });

      // Stage 4: RSA key wrapping
      updatePipelineStage('stage-rsa', 'active');
      addAudit({ operation: 'RSA_WRAP', detail: 'Wrapping AES session key with RSA public key (RSA-OAEP + SHA-256)…', level: 'info' });
      const encryptedKeyBuf = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        rsaKeyPairRef.current.publicKey,
        rawAes,
      );
      updatePipelineStage('stage-rsa', 'done');
      addAudit({ operation: 'RSA_WRAP', detail: `AES key wrapped. Encrypted key size: ${formatBytes(encryptedKeyBuf.byteLength)} (RSA-2048 block).`, level: 'success' });

      // Stage 5: SHA-256 digest
      updatePipelineStage('stage-sha', 'active');
      addAudit({ operation: 'SHA256', detail: 'Computing SHA-256 digest of original plaintext for integrity verification…', level: 'info' });
      const digestBuf = await crypto.subtle.digest('SHA-256', source);
      const digestB64 = bufferToBase64(digestBuf);
      const digestHex = Array.from(new Uint8Array(digestBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      updatePipelineStage('stage-sha', 'done');
      addAudit({ operation: 'SHA256', detail: `SHA-256: ${digestHex.slice(0, 32)}…`, level: 'success' });

      // Stage 6: Package
      updatePipelineStage('stage-pkg', 'active');
      addAudit({ operation: 'PKG_CREATE', detail: 'Assembling .secure JSON package with Base64-encoded fields…', level: 'info' });

      const pkg: SecurePackage = {
        format: 'secure-file-v1',
        originalName: encFile.name,
        mimeType: encFile.type || 'application/octet-stream',
        size: encFile.size,
        createdAt: new Date().toISOString(),
        aesAlgorithm: 'AES-256-GCM',
        rsaAlgorithm: 'RSA-OAEP-256',
        encryptedKey: bufferToBase64(encryptedKeyBuf),
        iv: bufferToBase64(iv.buffer),
        ciphertext: bufferToBase64(ciphertextBuf),
        sha256: digestB64,
      };

      setEncryptedPackage(pkg);
      updatePipelineStage('stage-pkg', 'done');
      setEncStatus('done');

      addAudit({ operation: 'PKG_CREATE', detail: `Package complete. Fields: format, originalName, mimeType, size, createdAt, encryptedKey, iv, ciphertext, sha256.`, level: 'success' });
      addAudit({ operation: 'READY', detail: `"${encFile.name}.secure" ready for download. Keep your private key safe — it cannot be recovered.`, level: 'success' });
    } catch (err) {
      setEncStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown encryption error';
      setEncError(`Encryption failed: ${msg}`);
      addAudit({ operation: 'ENCRYPT_ERR', detail: `Encryption failed: ${msg}`, level: 'error' });
      resetPipeline();
    }
  }, [encFile, addAudit, resetPipeline, updatePipelineStage]);

  // ─── Download package ────────────────────────────────────────────────────
  const handleDownloadPackage = useCallback(() => {
    if (!encryptedPackage) return;
    const json = JSON.stringify(encryptedPackage, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${encryptedPackage.originalName}.secure`;
    a.click();
    URL.revokeObjectURL(url);
    addAudit({ operation: 'DOWNLOAD', detail: `Downloaded "${encryptedPackage.originalName}.secure" (${formatBytes(json.length)}).`, level: 'info' });
  }, [encryptedPackage, addAudit]);

  const handleDownloadPrivateKey = useCallback(() => {
    if (!privatePem) return;
    const blob = new Blob([privatePem], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `private-key-${Date.now()}.key`;
    a.click();
    URL.revokeObjectURL(url);
    addAudit({ operation: 'KEY_DOWNLOAD', detail: 'RSA private key downloaded as .key file. Store securely — loss is unrecoverable.', level: 'warning' });
  }, [privatePem, addAudit]);

  // ─── Parse uploaded .secure package ─────────────────────────────────────
  const handlePackageUpload = useCallback((text: string) => {
    setDecPackageText(text);
    setDecParsedPackage(null);
    setDecError('');
    setDecStatus('idle');
    setIntegrityResult(null);
    setDecryptedBlob(null);

    if (!text.trim()) return;

    try {
      const obj = JSON.parse(text) as Record<string, unknown>;
      if (obj['format'] !== 'secure-file-v1') {
        setDecError('Unsupported package format. Expected "secure-file-v1".');
        addAudit({ operation: 'PKG_PARSE', detail: 'Package rejected: format field is not "secure-file-v1".', level: 'error' });
        return;
      }
      const required = ['encryptedKey', 'iv', 'ciphertext', 'sha256', 'originalName', 'mimeType'];
      for (const field of required) {
        if (!obj[field]) {
          setDecError(`Package is missing required field: "${field}".`);
          addAudit({ operation: 'PKG_PARSE', detail: `Package validation failed: missing field "${field}".`, level: 'error' });
          return;
        }
      }
      setDecParsedPackage(obj as unknown as SecurePackage);
      addAudit({ operation: 'PKG_PARSE', detail: `Package validated: "${obj['originalName']}" (${formatBytes(obj['size'] as number)}, ${obj['mimeType']}). Created: ${obj['createdAt']}.`, level: 'success' });
    } catch {
      setDecError('Invalid JSON — file may be corrupted or not a .secure package.');
      addAudit({ operation: 'PKG_PARSE', detail: 'JSON parse error — package is malformed or corrupted.', level: 'error' });
    }
  }, [addAudit]);

  // ─── Decrypt ─────────────────────────────────────────────────────────────
  const handleDecrypt = useCallback(async () => {
    if (!decParsedPackage) { setDecError('Upload a valid .secure package first.'); return; }
    if (!decPrivateKey.trim()) { setDecError('Paste your RSA private key to proceed.'); return; }

    setDecStatus('decrypting');
    setDecError('');
    setIntegrityResult(null);
    setDecryptedBlob(null);

    try {
      addAudit({ operation: 'RSA_IMPORT', detail: 'Importing RSA private key from PEM (PKCS#8, RSA-OAEP, SHA-256)…', level: 'info' });

      let privKeyBytes: ArrayBuffer;
      try {
        privKeyBytes = fromPem(decPrivateKey.trim());
      } catch {
        throw new Error('Could not parse PEM private key — check formatting.');
      }

      // Backend integration point: private key import happens client-side only
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privKeyBytes,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt'],
      );
      addAudit({ operation: 'RSA_IMPORT', detail: 'RSA private key imported successfully.', level: 'success' });

      addAudit({ operation: 'RSA_UNWRAP', detail: 'Decrypting wrapped AES key using RSA private key (RSA-OAEP)…', level: 'info' });
      const encKeyBytes = base64ToBuffer(decParsedPackage.encryptedKey);
      const rawAes = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encKeyBytes,
      );
      addAudit({ operation: 'RSA_UNWRAP', detail: `AES session key recovered (${rawAes.byteLength * 8}-bit).`, level: 'success' });

      addAudit({ operation: 'AES_IMPORT', detail: 'Importing recovered AES key as AES-256-GCM decrypt key…', level: 'info' });
      const aesKey = await crypto.subtle.importKey(
        'raw',
        rawAes,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );

      addAudit({ operation: 'AES_DECRYPT', detail: `Decrypting ciphertext (${formatBytes(base64ToBuffer(decParsedPackage.ciphertext).byteLength)}) with AES-256-GCM…`, level: 'info' });
      const iv = base64ToBuffer(decParsedPackage.iv);
      const ciphertext = base64ToBuffer(decParsedPackage.ciphertext);
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        ciphertext,
      );
      addAudit({ operation: 'AES_DECRYPT', detail: `Decryption complete. GCM authentication tag verified. Plaintext: ${formatBytes(plaintext.byteLength)}.`, level: 'success' });

      addAudit({ operation: 'SHA256_VERIFY', detail: 'Computing SHA-256 of decrypted plaintext for integrity comparison…', level: 'info' });
      const digestBuf = await crypto.subtle.digest('SHA-256', plaintext);
      const computedB64 = bufferToBase64(digestBuf);
      const computedHex = Array.from(new Uint8Array(digestBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      const storedBytes = new Uint8Array(base64ToBuffer(decParsedPackage.sha256));
      const storedHex = Array.from(storedBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      if (computedB64 !== decParsedPackage.sha256) {
        setIntegrityResult('fail');
        setDecStatus('error');
        setDecError('SHA-256 integrity check FAILED — the decrypted file does not match the original. The package may have been tampered with.');
        addAudit({ operation: 'SHA256_VERIFY', detail: `INTEGRITY FAILURE. Computed: ${computedHex.slice(0,32)}… Stored: ${storedHex.slice(0,32)}…`, level: 'error' });
        return;
      }

      setIntegrityResult('pass');
      addAudit({ operation: 'SHA256_VERIFY', detail: `SHA-256 VERIFIED. Digest: ${computedHex.slice(0,32)}… File is authentic and unmodified.`, level: 'success' });

      const blob = new Blob([plaintext], { type: decParsedPackage.mimeType });
      setDecryptedBlob(blob);
      setDecryptedName(decParsedPackage.originalName);
      setDecStatus('verified');
      addAudit({ operation: 'RECOVERED', detail: `File recovered: "${decParsedPackage.originalName}" (${formatBytes(plaintext.byteLength)}). Ready to download.`, level: 'success' });
    } catch (err) {
      setDecStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown decryption error';

      let userMsg = `Decryption failed: ${msg}`;
      if (msg.toLowerCase().includes('operation-specific') || msg.toLowerCase().includes('decrypt')) {
        userMsg = 'Decryption failed — wrong private key or corrupted ciphertext. Verify you are using the matching private key.';
      }

      setDecError(userMsg);
      addAudit({ operation: 'DECRYPT_ERR', detail: `Decryption failed: ${msg}`, level: 'error' });
    }
  }, [decParsedPackage, decPrivateKey, addAudit]);

  const handleDownloadDecrypted = useCallback(() => {
    if (!decryptedBlob || !decryptedName) return;
    const url = URL.createObjectURL(decryptedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decryptedName;
    a.click();
    URL.revokeObjectURL(url);
    addAudit({ operation: 'DOWNLOAD', detail: `Downloaded recovered file: "${decryptedName}".`, level: 'info' });
  }, [decryptedBlob, decryptedName, addAudit]);

  const handleResetEncrypt = useCallback(() => {
    setEncFile(null);
    setPublicPem('');
    setPrivatePem('');
    setEncryptedPackage(null);
    setEncStatus('idle');
    setEncError('');
    rsaKeyPairRef.current = null;
    resetPipeline();
    addAudit({ operation: 'RESET', detail: 'Encryption workspace cleared. All keys and packages removed from memory.', level: 'info' });
  }, [addAudit, resetPipeline]);

  return (
    <div className="min-h-screen grid-bg">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />

      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-12 2xl:px-16 pb-16">
        <section className="pt-6 pb-4">
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 md:p-6 shadow-[0_0_0_1px_rgba(148,163,184,0.08),0_24px_80px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                  Zero-server trust demo
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Secure File Transfer &amp; Encryption Lab
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                  This browser-only workflow shows how AES-256-GCM encrypts the file, RSA-OAEP protects the AES key, and SHA-256 verifies that the recovered content is unchanged.
                </p>
              </div>

              <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { name: 'AES-256-GCM', note: 'encrypt file data' },
                  { name: 'RSA-OAEP', note: 'protect session key' },
                  { name: 'SHA-256', note: 'verify integrity' },
                ].map((item) => (
                  <div key={item.name} className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.note}</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="py-6">
          <PipelineVisualization stages={pipeline} />
        </div>

        {activeTab === 'howitworks' ? (
          <HowItWorks />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className={activeTab === 'encrypt' ? 'block' : 'hidden xl:block'}>
              <EncryptPanel
                file={encFile}
                onFileChange={setEncFile}
                publicPem={publicPem}
                privatePem={privatePem}
                onGenerateKeys={handleGenerateKeys}
                onEncrypt={handleEncrypt}
                onDownloadPackage={handleDownloadPackage}
                onDownloadPrivateKey={handleDownloadPrivateKey}
                onReset={handleResetEncrypt}
                encryptedPackage={encryptedPackage}
                status={encStatus}
                error={encError}
              />
            </div>

            <div className={activeTab === 'decrypt' ? 'block' : 'hidden xl:block'}>
              <DecryptPanel
                packageText={decPackageText}
                parsedPackage={decParsedPackage}
                privateKey={decPrivateKey}
                onPrivateKeyChange={setDecPrivateKey}
                onPackageUpload={handlePackageUpload}
                onDecrypt={handleDecrypt}
                onDownloadDecrypted={handleDownloadDecrypted}
                status={decStatus}
                error={decError}
                integrityResult={integrityResult}
                decryptedName={decryptedName}
                suggestedKey={privatePem}
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <AuditConsole entries={auditLog} />
        </div>
      </main>
    </div>
  );
}