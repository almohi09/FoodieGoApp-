export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastPayload {
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onActionPress?: () => void;
}

type Listener = (payload: ToastPayload) => void;

const listeners = new Set<Listener>();

export const toastBus = {
  show(payload: ToastPayload) {
    listeners.forEach(listener => listener(payload));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

