import React from 'react';
import { useDocument } from '../../state/DocumentContext';

export default function BusyOverlay() {
  const { busyState } = useDocument();
  if (!busyState.isBusy) return null;

  return (
    <div className="busy-overlay">
      <div className="spinner" />
      <span style={{ fontSize: 14, fontWeight: 500, color: '#f8fafc' }}>
        {busyState.message || 'Processing...'}
      </span>
      {busyState.progress > 0 && (
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, busyState.progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
