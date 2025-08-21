import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './css/style.css';
import { CapacitorConfig } from '@capacitor/cli';

// Initialize Capacitor
import { Capacitor } from '@capacitor/core';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
