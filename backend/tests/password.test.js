import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  looksLikeBcryptHash,
  normalizePasswordHash,
  verifyPassword,
} from '../src/utils/password.js';

describe('password helpers', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('Secret123!');
    assert.equal(looksLikeBcryptHash(hash), true);
    assert.equal(await verifyPassword('Secret123!', hash), true);
    assert.equal(await verifyPassword('wrong', hash), false);
  });

  it('accepts Laravel $2y$ hashes and Buffers', async () => {
    const hash = await hashPassword('Secret123!');
    const laravel = hash.replace('$2a$', '$2y$');
    assert.equal(await verifyPassword('Secret123!', laravel), true);
    assert.equal(await verifyPassword('Secret123!', Buffer.from(hash)), true);
    assert.equal(normalizePasswordHash(laravel).startsWith('$2a$'), true);
  });

  it('rejects unusable hash formats without throwing', async () => {
    assert.equal(await verifyPassword('Secret123!', null), false);
    assert.equal(await verifyPassword('Secret123!', ''), false);
    assert.equal(
      await verifyPassword('Secret123!', '$argon2id$v=19$m=65536,t=4,p=1$xx'),
      false
    );
  });
});
