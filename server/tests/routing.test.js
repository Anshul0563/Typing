import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { app } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('canonical login route reaches validation instead of the 404 handler', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });

  assert.equal(response.status, 400);
  assert.notEqual((await response.json()).message, 'Route not found: POST /api/auth/login');
});

test('all public authentication routes are registered under /api/auth', async () => {
  const routes = [
    ['/api/auth/register', 'POST'],
    ['/api/auth/login', 'POST'],
    ['/api/auth/forgot-password', 'POST'],
    ['/api/auth/reset-password', 'POST']
  ];

  for (const [path, method] of routes) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(response.status, 400, `${method} ${path}`);
  }
});

test('all protected authentication routes are registered under /api/auth', async () => {
  const routes = [
    ['/api/auth/me', 'GET'],
    ['/api/auth/profile', 'GET'],
    ['/api/auth/profile', 'PATCH'],
    ['/api/auth/change-password', 'PATCH']
  ];

  for (const [path, method] of routes) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method !== 'GET' && { body: '{}' })
    });
    assert.equal(response.status, 401, `${method} ${path}`);
  }
});

test('unprefixed auth route is not part of the API contract', async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });

  assert.equal(response.status, 404);
});
