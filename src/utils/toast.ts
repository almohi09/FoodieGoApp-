import { toastBus, ToastVariant } from '../components/Toast/toastBus';

export const showToast = (
  message: string,
  variant: ToastVariant = 'info',
  actionLabel?: string,
  onActionPress?: () => void,
): void => {
  toastBus.show({ message, variant, actionLabel, onActionPress });
};

export default showToast;
