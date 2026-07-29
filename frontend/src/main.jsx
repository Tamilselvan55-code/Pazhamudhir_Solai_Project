import { API_BASE as config_API_BASE, API_URL as config_API_URL } from './config/api';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// Add a global Axios request interceptor to rewrite hardcoded localhost backend URLs in production
axios.interceptors.request.use((config) => {
  const targetBackend = config_API_URL;
  if (config.url && config.url.startsWith(config_API_URL)) {
    config.url = config.url.replace(config_API_URL, targetBackend);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


console.log('%c🌿 Enterprise Grocery Management System 🌿', 'color: #16a34a; font-size: 16px; font-weight: bold;');



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
