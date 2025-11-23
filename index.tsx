import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
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

if ('serviceWorker' in navigator) {
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

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);