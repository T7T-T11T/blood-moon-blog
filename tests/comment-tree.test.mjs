import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommentTree, countComments, findComment } from '../frontend/src/utils/commentTree.js';

test('评论按 parent_id 组成可回复的多层树', () => {
  const tree = buildCommentTree([
    { id: 1, content: '顶级评论', parent_id: null },
    { id: 2, content: '第一层回复', parent_id: '1' },
    { id: 3, content: '第二层回复', parent_id: 2 }
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].children[0].children[0].content, '第二层回复');
  assert.equal(countComments(tree), 3);
  assert.equal(findComment(tree, '3').content, '第二层回复');
});

test('找不到父评论的历史记录仍可作为顶级评论展示', () => {
  const tree = buildCommentTree([{ id: 8, content: '孤立记录', parent_id: 999 }]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].content, '孤立记录');
});
