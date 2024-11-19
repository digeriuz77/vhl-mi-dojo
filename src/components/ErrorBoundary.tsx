// components/ErrorBoundary.tsx
"use client"
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h2>Something went wrong.</h2>
          <pre className="text-sm">{this.state.error?.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;