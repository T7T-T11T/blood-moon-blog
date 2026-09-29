import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightParts } from '../frontend/src/utils/highlight.js';
import { scrollBehavior } from '../frontend/src/utils/motion.js';

test('search highlights literal text, preserving HTML characters and regex symbols', () => {
  assert.deepEqual(highlightParts('<img onerror=alert(1)>', ''), ['<img onerror=alert(1)>']);
  assert.deepEqual(highlightParts('A & B', '&'), ['A ', '&', ' B']);
  assert.deepEqual(highlightParts('a+b A+B', 'a+b'), ['', 'a+b', ' ', 'A+B', '']);
  assert.deepEqual(highlightParts('[test]', '['), ['', '[', 'test]']);
  assert.equal(highlightParts('<b>hello</b>', 'hello').join(''), '<b>hello</b>');
});
test('scripted scrolling respects reduced motion and unavailable media detection', () => {
  const previous = globalThis.window;
  try {
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    assert.equal(scrollBehavior(), 'auto');
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(scrollBehavior(), 'smooth');
    globalThis.window = {};
    assert.equal(scrollBehavior(), 'auto');
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
