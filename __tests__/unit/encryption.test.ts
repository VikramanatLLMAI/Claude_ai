/**
 * Unit tests for encryption utilities (encrypt/decrypt and hashPassword/verifyPassword)
 *
 * Tests use REAL crypto (no mocking) per project decision.
 * AES-256-GCM encryption round-trip and scrypt password hashing.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt, hashPassword, verifyPassword } from '@/lib/encryption';

// Valid 64-hex-char test key (32 bytes for AES-256)
const TEST_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

describe('encrypt / decrypt', () => {
  beforeAll(() => {
    process.env.KEY_ENCRYPTION_SECRET = TEST_KEY;
  });

  it('encrypts and decrypts a string successfully (round-trip)', () => {
    const plaintext = 'Hello, World! This is a secret.';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('different plaintexts produce different ciphertexts', () => {
    const encrypted1 = encrypt('message one');
    const encrypted2 = encrypt('message two');

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('same plaintext produces different ciphertexts (random IV)', () => {
    const encrypted1 = encrypt('same message');
    const encrypted2 = encrypt('same message');

    // Due to random IV, ciphertexts should differ
    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt to the same plaintext
    expect(decrypt(encrypted1)).toBe('same message');
    expect(decrypt(encrypted2)).toBe('same message');
  });

  it('decrypting with wrong key throws error', () => {
    const encrypted = encrypt('secret data');

    // Change the key
    process.env.KEY_ENCRYPTION_SECRET =
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    expect(() => decrypt(encrypted)).toThrow();

    // Restore key
    process.env.KEY_ENCRYPTION_SECRET = TEST_KEY;
  });

  it('empty string round-trips correctly', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe('');
  });

  it('encrypted format is iv:authTag:data', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');

    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Encrypted data is non-empty
    expect(parts[2].length).toBeGreaterThan(0);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('hashing a password returns a string with salt and hash', async () => {
    const hash = await hashPassword('mypassword');

    expect(typeof hash).toBe('string');
    expect(hash).toContain(':');
    const parts = hash.split(':');
    expect(parts).toHaveLength(2);
  });

  it('verifyPassword returns true for correct password', async () => {
    const password = 'correctpassword';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correctpassword');
    const isValid = await verifyPassword('wrongpassword', hash);

    expect(isValid).toBe(false);
  });

  it('same password produces different hashes (salt uniqueness)', async () => {
    const password = 'samepassword';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);

    // Both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});
