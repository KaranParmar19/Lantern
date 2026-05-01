'use client';

import { Component } from 'react';

/**
 * ErrorBoundary — React class component that catches rendering errors
 * in any child component tree.
 *
 * Usage:
 *   <ErrorBoundary label="RPM Chart">
 *     <RPMChart data={...} />
 *   </ErrorBoundary>
 *
 * If a child throws, this renders a tidy fallback card instead of
 * crashing the entire dashboard. Other panels continue working.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log for debugging — never surface raw error to the user
    console.error(`[Lantern] Panel error (${this.props.label || 'unknown'}):`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="chart-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            gap: '12px',
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
          }}>
            ⚠️
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
            {this.props.label ? `${this.props.label} encountered an error.` : 'This panel encountered an error.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
