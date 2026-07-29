import request from './request';
export const getPomodoroAPI = (p = {}) => request.get('/pomodoro', { params: p });
export const addPomodoroAPI = (d) => request.post('/pomodoro', d);
export const deletePomodoroAPI = (id) => request.delete(`/pomodoro/${id}`);
export const getPomodoroStatsAPI = () => request.get('/pomodoro/stats');
