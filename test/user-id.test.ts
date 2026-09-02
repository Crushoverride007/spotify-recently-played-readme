import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { escapeKey, isValidUserId } from '../src/firebase';

/**
 * Spotify issues user IDs containing `.` to any account whose username is
 * email-shaped. Realtime Database keys cannot contain `.`, so those IDs are
 * escaped rather than rejected - see escapeKey.
 */
describe('user IDs containing a dot', () => {
  it('accepts a dotted ID', () => {
    expect(isValidUserId('mouhcine.mesmouki')).toBe(true);
    expect(isValidUserId('first.last.jr')).toBe(true);
  });

  it('still rejects the characters a database key genuinely cannot hold', () => {
    for (const bad of ['a/b', 'a#b', 'a$b', 'a[b', 'a]b', 'a\\b', 'a%b', 'a b', '']) {
      expect(isValidUserId(bad)).toBe(false);
    }
  });

  it('escapes dots to a character keys allow', () => {
    expect(escapeKey('mouhcine.mesmouki')).toBe('mouhcine~2Emesmouki');
    expect(escapeKey('plain')).toBe('plain');
  });

  it('escapes the escape character first, so the mapping stays injective', () => {
    // Without this, `a~2Eb` and `a.b` would collide on one database key.
    expect(escapeKey('a~2Eb')).toBe('a~7E2Eb');
    expect(escapeKey('a.b')).toBe('a~2Eb');
    expect(escapeKey('a~2Eb')).not.toBe(escapeKey('a.b'));
  });

  it('leaves no traversal in the encoded key', () => {
    expect(escapeKey('..')).toBe('~2E~2E');
    expect(escapeKey('..')).not.toContain('.');
  });

  it('no longer answers a dotted ID with the invalid-ID card', async () => {
    // The Worker is unconfigured here, so this cannot reach the happy path -
    // but it must fail for want of configuration, not because the ID was
    // rejected at the front door.
    const res = await SELF.fetch('https://example.com/svg?user=mouhcine.mesmouki');

    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain('Invalid Spotify user ID');
  });
});
