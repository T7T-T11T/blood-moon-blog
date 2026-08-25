/** 将接口的扁平评论列表转换为可递归渲染的评论树。 */
export function buildCommentTree(list = []) {
  const map = new Map(list.map((comment) => [String(comment.id), { ...comment, children: [] }]));
  const roots = [];

  for (const comment of map.values()) {
    const parent = comment.parent_id ? map.get(String(comment.parent_id)) : null;
    if (parent) parent.children.push(comment);
    else roots.push(comment);
  }
  return roots;
}

/** 统计评论树内的全部节点数。 */
export function countComments(items = []) {
  return items.reduce((count, item) => count + 1 + countComments(item.children || []), 0);
}

/** 在评论树中按 ID 查找节点。 */
export function findComment(items = [], id) {
  for (const item of items) {
    if (String(item.id) === String(id)) return item;
    const found = findComment(item.children || [], id);
    if (found) return found;
  }
  return null;
}
