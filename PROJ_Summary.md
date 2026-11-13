# Secure File Transfer & Encryption Lab

## Project purpose

This project is an educational, browser-based lab for demonstrating hybrid file encryption. It lets a user encrypt a local file into a portable `.secure` package and later recover it with the matching RSA private key. The interface makes the cryptographic stages visible so learners can see how symmetric encryption, public-key encryption, and integrity checks fit together.

It is a demonstration and learning tool, not a complete file-transfer service or a substitute for professionally reviewed, production-grade key management.

## Why it is needed and who it helps

Encrypting files before sharing can help protect their contents from people who can access the package but do not possess the decryption key. This project also helps explain a common practical design:

- AES is efficient for encrypting file data.
- RSA can protect the small AES key without sending that key in the clear.
- AES-GCM authenticates the ciphertext, detecting changes to it during decryption.
- SHA-256 provides a digest comparison against the value recorded in the package.

The intended users are students, instructors, and developers exploring Web Crypto and hybrid encryption, as well as people who want a simple local demo. The app does not establish a trusted relationship between sender and recipient; users must exchange and verify public keys through a separate trusted channel.

## Features

- Generate a 2048-bit RSA-OAEP key pair in the browser.
- Select or drag and drop a file to encrypt.
- Encrypt file bytes with a fresh 256-bit AES-GCM key and random 12-byte IV.
- Wrap the AES key with the generated RSA public key using SHA-256 as the OAEP hash.
- Create and download a JSON `.secure` package and download the private key as a PEM `.key` file.
- Upload a `.secure` package and provide the matching private key to decrypt and verify it.
- Download the recovered file only after decryption and digest verification succeed.
- Visualize pipeline progress, explain the cryptographic concepts, and display/export an in-memory operation log.
- Perform cryptographic work in the browser through the Web Crypto API; no project API or server-side encryption service is implemented.

## Technology stack

- **Application framework:** Next.js 15 App Router.
- **UI:** React 19, TypeScript, and Tailwind CSS.
- **Cryptography:** Browser Web Crypto API (`crypto.subtle`) for RSA-OAEP, AES-GCM, and SHA-256.
- **Browser capabilities:** File API, Blob/object URLs, Clipboard API, and browser-managed downloads.
- **UI utilities:** Lucide React icons and Sonner toast notifications.
- **Build and developer tools:** Node.js/npm, TypeScript compiler, ESLint, Prettier, PostCSS, and Autoprefixer.

## User flow

### Encrypt

1. Open the Encrypt tab and select a file.
2. Generate an RSA key pair, or use the pair already generated in the current page session.
3. Encrypt and package the file.
4. Download the `.secure` package and securely retain the matching private key. Share the package and public key as appropriate; never share the private key.

### Decrypt

1. Open the Decrypt tab and upload the `.secure` package.
2. Paste the matching RSA private key, or use the key generated in the Encrypt tab if that same page session is still active.
3. Run decryption and verification.
4. If decryption and the SHA-256 comparison pass, save the recovered file.

Resetting the encryption workspace clears its current file, keys, and package from application state; it does not securely erase browser memory or previously downloaded files.

## Processing and analysis flow

### Encryption

1. Read the selected file into memory as an `ArrayBuffer`.
2. Generate an ephemeral AES-256-GCM key and export its raw bytes for RSA wrapping.
3. Generate a random 12-byte IV and encrypt the file bytes with AES-GCM. The resulting ciphertext includes the GCM authentication tag.
4. Encrypt (wrap) the raw AES key with the RSA public key using RSA-OAEP with SHA-256.
5. Compute SHA-256 over the original file bytes.
6. Encode binary package values as Base64, combine them with descriptive metadata, and offer the JSON package for download.

### Decryption

1. Parse the uploaded JSON and check its format marker and a subset of required fields.
2. Parse and import the supplied PEM private key as PKCS#8 RSA-OAEP.
3. Use RSA-OAEP to recover the AES key, then import it for AES-GCM decryption.
4. Decrypt the ciphertext. AES-GCM verifies its authentication tag as part of this operation.
5. Compute SHA-256 over the recovered bytes and compare it with the package digest.
6. Offer a download only when the decrypt and digest comparison succeed.

The SHA-256 value is stored alongside the package and is not a digital signature or keyed authentication value. It does not prove who created the package or who supplied a key. AES-GCM is the ciphertext authentication mechanism; the extra digest is a consistency check, not sender authentication.

## Architecture

- **Framework:** Next.js App Router, React, and TypeScript.
- **Presentation:** Client-side React panels render the encryption, decryption, explanation, pipeline, and audit-log views.
- **Application state:** `EncryptionLabClient` owns the current files, keys, package, status, pipeline, and audit entries. The generated `CryptoKeyPair` is held in a component ref; the private PEM is also held in UI state for display, download, and same-session use.
- **Cryptography:** Browser `crypto.subtle` performs RSA-OAEP key generation/import/encryption/decryption, AES-GCM encryption/decryption, and SHA-256 digest operations.
- **File handling:** Browser `File`, `Blob`, object URLs, and download links read local input and create local output.
- **Persistence:** No app database or server-side file/key storage is implemented. A package and a downloaded private-key file persist only if the user saves them.

### Main code areas

- `src/app/page.tsx` maps the root route to the lab.
- `src/app/encryption-lab/page.tsx` renders the client application.
- `src/app/encryption-lab/components/EncryptionLabClient.tsx` coordinates crypto operations, local state, packaging, downloads, and audit events.
- `src/app/encryption-lab/components/EncryptPanel.tsx` and `DecryptPanel.tsx` implement the primary workflows.
- `src/app/encryption-lab/components/HowItWorks.tsx`, `PipelineVisualization.tsx`, and `AuditConsole.tsx` provide educational and diagnostic UI.
- `src/app/encryption-lab/components/types.ts` defines the package and UI event types.

## API and package overview

### HTTP API

There is no application REST/GraphQL API, authentication endpoint, or backend crypto service. The root route (`/`) and `/encryption-lab` render the lab. UI components communicate through React props and callbacks; the cryptographic interface is the browser's Web Crypto API.

### `.secure` data format

The downloaded file is pretty-printed JSON with format marker `secure-file-v1`. Its fields are:

| Field | Meaning |
| --- | --- |
| `format` | Package version marker: `secure-file-v1`. |
| `originalName` | Original filename, stored as plaintext metadata. |
| `mimeType` | Original MIME type, or `application/octet-stream`. |
| `size` | Original file size in bytes. |
| `createdAt` | Package creation timestamp in ISO format. |
| `aesAlgorithm` | `AES-256-GCM`. |
| `rsaAlgorithm` | `RSA-OAEP-256`. |
| `encryptedKey` | Base64-encoded RSA-OAEP-wrapped AES key. |
| `iv` | Base64-encoded 12-byte AES-GCM IV. |
| `ciphertext` | Base64-encoded AES-GCM ciphertext and authentication tag. |
| `sha256` | Base64-encoded SHA-256 digest of the original plaintext. |

The file is named `<originalName>.secure`. The private key export is unencrypted PKCS#8 PEM text in a `private-key-<timestamp>.key` file. Treat it as a secret.

## Setup and development

Install a current Node.js LTS release and npm, then run:

```bash
npm install
npm run dev
```

Open [http://localhost:4028](http://localhost:4028). Useful project scripts:

```bash
npm run type-check
npm run lint
npm run build
npm run start
```

`npm run start` serves the production build on port 4028. The app uses Next.js 15, React 19, and TypeScript; encryption requires a browser with Web Crypto API support and a suitable secure context (localhost is generally treated as secure by browsers).

## Privacy and security

- The app's file read, key operations, encryption, decryption, and download code run in the browser and do not send file contents or keys to an application backend.
- The package exposes metadata such as filename, MIME type, file size, and creation time even though the file contents are encrypted.
- The private key is exported without a passphrase. Anyone who obtains it can decrypt packages encrypted to its matching public key.
- The page layout currently includes third-party Rocket scripts (`rocket-web.js` and `rocket-shot.js`). Consequently, do not interpret local cryptographic processing as a guarantee that the page makes no network requests or that all page activity is private from third parties. Review or remove those integrations before using the app with sensitive information.
- The audit console is held in page memory and can be exported by the user. Its entries include operation details and file metadata; encryption logging also includes a short AES-key preview and an IV preview. Avoid sharing exported logs as if they contained no sensitive operational information.
- Browser extensions, malicious scripts, compromised devices, screenshots, clipboard history, and local downloads are outside the protection of the encryption flow.
- AES-GCM authenticates ciphertext, while the SHA-256 digest is an unkeyed consistency check. Neither binds a package to a verified sender identity.

## Limitations

- Educational demo; no production security review, identity verification, sender signatures, account system, access control, or key-distribution mechanism.
- No key recovery: losing the private key makes the corresponding data unrecoverable.
- No private-key password protection, secure vault, rotation, revocation, or multi-recipient support.
- RSA-2048 is not post-quantum cryptography.
- Files are read and Base64-encoded in memory; large files can consume substantial memory and may not be practical. There is no streaming/chunked encryption flow.
- Package parsing validates the format marker and presence of selected fields but is not a comprehensive schema or resource-limit validation layer.
- No backend storage, encrypted cloud backup, sharing service, or server API is provided.
- Protecting file contents does not protect the device or browser that handles plaintext and keys.

## Extension guidance

- Keep all binary operations explicit about input sizes, encodings, and algorithm parameters; validate complete package structure and impose file/package size limits before processing.
- Preserve the versioned package format. For incompatible changes, introduce a new format marker and maintain clear parsing behavior rather than silently changing `secure-file-v1`.
- Use reviewed cryptographic designs and browser APIs rather than custom primitives. Have security-sensitive changes independently reviewed.
- If adding recipient identity or sender authenticity, define a trusted public-key distribution and signature-verification model; a hash field alone cannot provide either.
- If adding persistence, telemetry, or a backend, document precisely what data is transmitted and stored, minimize collection, and obtain consent. Do not send plaintext or private keys by default.
- For large-file support, design and test a streaming/chunked authenticated format with explicit nonce and integrity handling; the current whole-buffer flow is not directly scalable.
- Keep user-facing limitations and key-loss warnings aligned with the actual implementation.
