import { API_BASE as config_API_BASE, API_URL as config_API_URL } from './config/api';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// Add a global Axios request interceptor to rewrite hardcoded localhost backend URLs in production and prevent GET caching
axios.interceptors.request.use((config) => {
  const targetBackend = config_API_URL;
  if (config.url && config.url.startsWith(config_API_URL)) {
    config.url = config.url.replace(config_API_URL, targetBackend);
  }

  // Prevent browser caching for all API GET requests
  if (config.method === 'get') {
    config.headers = config.headers || {};
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

console.log('%c🌿 Tiruchendur Murugan Pazhamudhir Solai 🌿', 'color: #16a34a; font-size: 16px; font-weight: bold;');
console.log('%cWelcome to www.tiruchendurmuruganpazhamudhirsolai.com', 'color: #4b5563; font-size: 12px;');



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
