const assert = require('node:assert/strict');
const test = require('node:test');

const sdk = require('../dist/index.cjs');

test('CommonJS bundle exposes the public API', () => {
  assert.equal(typeof sdk.Payerurl, 'function');
  assert.equal(typeof sdk.buildQueryString, 'function');
  assert.equal(sdk.default, sdk.Payerurl);
});
