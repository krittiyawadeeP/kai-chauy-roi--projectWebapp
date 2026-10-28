import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, validPassword, verifyPassword } from './password';

test('new passwords use salted hashes and verification also supports existing plaintext accounts', () => {
  const hashed = hashPassword('new-password');
  assert.notEqual(hashed, 'new-password');
  assert.notEqual(hashed, hashPassword('new-password'));
  assert.equal(verifyPassword('new-password', hashed), true);
  assert.equal(verifyPassword('wrong-password', hashed), false);
  assert.equal(verifyPassword('old-password', 'old-password'), true);
  assert.equal(verifyPassword('incorrect', 'old-password'), false);
  assert.equal(validPassword('abcdef'), true);
  for (const value of [null, 123456, 'short', ' password ', 'x'.repeat(129)]) assert.equal(validPassword(value), false);
});
