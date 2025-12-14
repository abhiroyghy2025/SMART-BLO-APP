import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Polyfill process to prevent crashes in some environments/SDKs
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          backgroundColor: '#0f172a', 
          color: '#fbbf24',
          fontFamily: 'sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{fontSize: '2rem', marginBottom: '1rem'}}>System Malfunction</h1>
          <p style={{color: '#cbd5e1', marginBottom: '2rem'}}>The application encountered a critical error and could not load.</p>
          <div style={{
            backgroundColor: '#1e293b', 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            border: '1px solid #ef4444', 
            color: '#ef4444',
            maxWidth: '800px',
            overflow: 'auto',
            textAlign: 'left',
            fontFamily: 'monospace'
          }}>
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#fbbf24',
              color: 'black',
              border: 'none',
              borderRadius: '0.25rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

// Robust check for iframe environment
let isInIframe = false;
try {
  isInIframe = window.self !== window.top;
} catch (e) {
  // If accessing window.top throws a SecurityError, we are definitely in a cross-origin iframe
  isInIframe = true;
}

// Only register service worker if NOT in an iframe to prevent security errors
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !isInIframe) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  console.error("Critical mounting error:", e);
  rootElement.innerHTML = '<div style="color:white; text-align:center; padding-top:50px;">Critical Error: Failed to mount application.</div>';
}