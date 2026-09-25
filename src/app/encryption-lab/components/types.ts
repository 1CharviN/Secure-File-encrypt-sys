export interface PipelineStage {
  id: string;
  label: string;
  icon: string;
  status: 'idle' | 'active' | 'done' | 'error';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  operation: string;
  detail: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface SecurePackage {
  format: 'secure-file-v1';
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  aesAlgorithm: 'AES-256-GCM';
  rsaAlgorithm: 'RSA-OAEP-256';
  encryptedKey: string;
  iv: string;
  ciphertext: string;
  sha256: string;
}