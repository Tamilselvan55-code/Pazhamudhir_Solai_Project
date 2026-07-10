let rawUrl = import.meta.env.VITE_API_URL || 'https://pazhamudhir-solai-project-q7j2.onrender.com';

// Clean trailing slashes
rawUrl = rawUrl.replace(/\/+$/, "");

// Strip trailing /api if present to get clean base domain
export const API_URL = rawUrl.endsWith('/api') ? rawUrl.slice(0, -4) : rawUrl;
export const API_BASE = `${API_URL}/api`;
export const UPLOADS_BASE = `${API_URL}/uploads`;
