import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin, createSession, isAuthorized } from '../src/lib/api';
test('same-origin check handles Next internal hostname while rejecting third-party origins', () => {
  const previous = process.env.APP_ORIGIN;
  delete process.env.APP_ORIGIN;
  try {
    assert.doesNotThrow(() =>
      checkOrigin(
        new Request('http://localhost:3210/api/workspace', {
          headers: { host: '127.0.0.1:3210', origin: 'http://127.0.0.1:3210' },
        }),
      ),
    );
    assert.throws(
      () =>
        checkOrigin(
          new Request('http://localhost:3210/api/workspace', {
            headers: { host: '127.0.0.1:3210', origin: 'https://evil.example' },
          }),
        ),
      /来源/,
    );
    assert.throws(
      () =>
        checkOrigin(
          new Request('http://localhost:3210/api/workspace', {
            headers: { host: '127.0.0.1:3210', origin: 'null' },
          }),
        ),
      /来源/,
    );
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});
test('password cookies are signed and public mode never opens without a password', () => {
  const previous = { password: process.env.APP_PASSWORD, public: process.env.APP_PUBLIC };
  try {
    process.env.APP_PASSWORD = 'test-password-only';
    process.env.APP_PUBLIC = 'true';
    assert.equal(isAuthorized(new Request('http://localhost')), false);
    const token = createSession();
    assert.equal(
      isAuthorized(
        new Request('http://localhost', { headers: { cookie: `zhiyu_session=${token}` } }),
      ),
      true,
    );
    assert.equal(
      isAuthorized(
        new Request('http://localhost', {
          headers: { cookie: `zhiyu_session=${token.slice(0, -2)}xx` },
        }),
      ),
      false,
    );
    assert.equal(
      isAuthorized(
        new Request('http://localhost', {
          headers: { cookie: `zhiyu_session=9999999999999.${'ü'.repeat(64)}` },
        }),
      ),
      false,
    );
    delete process.env.APP_PASSWORD;
    assert.equal(isAuthorized(new Request('http://localhost')), false);
    process.env.APP_PUBLIC = 'false';
    assert.equal(isAuthorized(new Request('http://localhost')), true);
  } finally {
    if (previous.password === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = previous.password;
    if (previous.public === undefined) delete process.env.APP_PUBLIC;
    else process.env.APP_PUBLIC = previous.public;
  }
});
