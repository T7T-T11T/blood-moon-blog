import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_CARD_COLUMNS, toPublicCard } from '../workers-backend/src/lib/articleCard.js';

test('公开文章卡片不会泄漏正文或 base64 媒体', () => {
  const card = toPublicCard({
    id: 1,
    title: '一篇记录',
    summary: '简短摘要',
    content: '<img src="data:image/png;base64,very-large">全文',
    cover_image: '',
    category_id: 2,
    created_at: '2026-08-25T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z'
  });

  assert.equal('content' in card, false);
  assert.equal(card.summary, '简短摘要');
  assert.equal(PUBLIC_CARD_COLUMNS.includes('content'), false);
});
