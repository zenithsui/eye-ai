import { useEffect, useState } from 'react';
interface ToastItem { id: number; message: string; type: string; }
let addToastGlobal: ((msg: string, type?: string) => void) | null = null;
export function showToast(message: string, type = 'info') {
  addToastGlobal?.(message, type);
}
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => {
    addToastGlobal = (message, type = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    return () => { addToastGlobal = null; };
  }, []);
  return (
    <div id="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast visible toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}