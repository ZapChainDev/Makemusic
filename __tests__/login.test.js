"use strict";

// Real integration test — imports and calls the actual handler from pages/api/login.js
jest.mock('openai');

const loginHandler = require('../pages/api/login').default;

function mockRes() {
  const r = { _status: null, _body: null, _headers: {} };
  r.status = (code) => { r._status = code; return r; };
  r.json   = (body) => { r._body  = body; return r; };
  r.setHeader = (k, v) => { r._headers[k] = v; return r; };
  return r;
}

describe('login handler (real module)', () => {
  beforeEach(() => { process.env.SITE_PASSWORD = 'correctpassword'; });
  afterEach(() => { delete process.env.SITE_PASSWORD; });

  test('returns 405 for non-POST methods', async () => {
    const res = mockRes();
    await loginHandler({ method: 'GET' }, res);
    expect(res._status).toBe(405);
    expect(res._body.error).toBe('Method Not Allowed');
  });

  test('returns 500 when SITE_PASSWORD is not configured', async () => {
    delete process.env.SITE_PASSWORD;
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { password: 'x' } }, res);
    expect(res._status).toBe(500);
    expect(res._body.error).toBe('SITE_PASSWORD not configured');
  });

  test('returns 401 for wrong password', async () => {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { password: 'wrong' } }, res);
    expect(res._status).toBe(401);
    expect(res._body.error).toBe('Invalid password');
  });

  test('returns 401 when password is missing from body', async () => {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: {} }, res);
    expect(res._status).toBe(401);
  });

  test('returns 401 when body itself is missing', async () => {
    const res = mockRes();
    await loginHandler({ method: 'POST' }, res);
    expect(res._status).toBe(401);
  });

  test('returns 200 and sets cookie on correct password', async () => {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { password: 'correctpassword' }, query: {} }, res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._headers['Set-Cookie']).toMatch(/site_auth=1/);
  });

  test('redirects to / by default', async () => {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { password: 'correctpassword' }, query: {} }, res);
    expect(res._body.next).toBe('/');
  });

  test('uses query.next when provided', async () => {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { password: 'correctpassword' }, query: { next: '/dashboard' } }, res);
    expect(res._body.next).toBe('/dashboard');
  });

  test('cookie includes HttpOnly, SameSite=Lax, and 7-day Max-Age', async () => {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { password: 'correctpassword' }, query: {} }, res);
    const cookie = res._headers['Set-Cookie'];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Max-Age=604800/);
  });
});
