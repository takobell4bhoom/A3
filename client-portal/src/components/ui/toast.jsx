import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(({ title, description, variant = 'default', duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts(prev => [...prev, { id, title, description, variant }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (title, description) => addToast({ title, description, variant: 'success' }),
    error: (title, description) => addToast({ title, description, variant: 'error' }),
    info: (title, description) => addToast({ title, description, variant: 'info' }),
    default: (title, description) => addToast({ title, description, variant: 'default' }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 ${
              t.variant === 'success'
                ? 'bg-emerald-950/90 text-white border-emerald-800 shadow-emerald-950/20 backdrop-blur-md'
                : t.variant === 'error'
                ? 'bg-red-950/90 text-white border-red-800 shadow-red-950/20 backdrop-blur-md'
                : 'bg-slate-900/90 text-white border-slate-800 shadow-slate-950/20 backdrop-blur-md'
            }`}
          >
            {t.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {t.variant === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
            {t.variant === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
            {t.variant === 'default' && <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />}

            <div className="flex-1 text-xs">
              <h5 className="font-semibold leading-tight">{t.title}</h5>
              {t.description && <p className="mt-1 opacity-80 leading-relaxed">{t.description}</p>}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-white/60 hover:text-white transition-colors -mr-1 -mt-1 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
