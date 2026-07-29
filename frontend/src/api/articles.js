import request from './request';
export const getArticlesAPI = (p = {}) => request.get('/articles', { params: p });
export const getArticleDetailAPI = (id) => request.get(`/articles/${id}`);
export const addArticleAPI = (d) => request.post('/articles', d);
export const updateArticleAPI = (id, d) => request.put(`/articles/${id}`, d);
export const deleteArticleAPI = (id) => request.delete(`/articles/${id}`);
export const incrementViewAPI = (id) => request.patch(`/articles/${id}/view`);
