import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './styles/app.css';

async function configureNativeChrome() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1a1410' });
  } catch {
    // Web or unsupported plugin surface — ignore.
  }
}

void configureNativeChrome();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
