import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function ToastContainer() {
  const { toasts } = useDocument();

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} color="#34d399" />;
      case 'error': return <AlertCircle size={16} color="#fb7185" />;
      case 'warning': return <AlertTriangle size={16} color="#f59e0b" />;
      default: return <Info size={16} color="#38bdf8" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {getIcon(toast.type)}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
