/** Split plain text; Vue escapes every part during rendering. */
export function highlightParts(text, keyword) {
  const value = String(text ?? '');
  if (!keyword) return [value];
  const escaped = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return value.split(new RegExp(`(${escaped})`, 'gi'));
}
