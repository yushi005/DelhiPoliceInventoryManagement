import axios from 'axios';
const BASE = 'http://127.0.0.1:8000';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
export const login = (badge_id, password) => axios.post(`${BASE}/auth/login`, { badge_id, password });
export const getDistricts = () => axios.get(`${BASE}/districts/`);
export const getUnits = (district_id) => axios.get(`${BASE}/units/?district_id=${district_id}`);
export const getEntities = () => axios.get(`${BASE}/entities/`);
export const getSubmissions = (params = {}) => axios.get(`${BASE}/submissions/`, { ...authHeader(), params });
export const createSubmission = (data) => axios.post(`${BASE}/submissions/`, data, authHeader());
export const updateSubmission = (id, data) => axios.patch(`${BASE}/submissions/${id}`, data, authHeader());
export const updateStatus = (id, status, reason = '') => axios.patch(`${BASE}/submissions/${id}/status`, { status, reason }, authHeader());
export const getAnalytics = (params = {}) => axios.get(`${BASE}/analytics/summary`, { ...authHeader(), params });
// Public — no auth header. Powers the landing portal stats.
export const getPublicAnalytics = (params = {}) => axios.get(`${BASE}/analytics/summary`, { params });
export const getUsers = () => axios.get(`${BASE}/users/`, authHeader());
export const createUser = (data) => axios.post(`${BASE}/users/`, data, authHeader());
export const updateUserRole = (id, role) => axios.patch(`${BASE}/users/${id}`, { role }, authHeader());
export const resetPassword = (id, password) => axios.patch(`${BASE}/users/${id}`, { password }, authHeader());