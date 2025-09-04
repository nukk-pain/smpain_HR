/**
 * Using Node's built-in test runner instead of Jest
 */
const test = require('node:test');
const assert = require('node:assert');

test('simple math test', () => {
  assert.strictEqual(1 + 1, 2);
});

test('string comparison', () => {
  assert.strictEqual('hello', 'hello');
});

test('async test', async () => {
  const result = await Promise.resolve(42);
  assert.strictEqual(result, 42);
});