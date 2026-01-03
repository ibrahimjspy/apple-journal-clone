/**
 * Cross-platform alert/confirm utilities
 * Uses native Alert on mobile, window.confirm on web
 */

import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export function confirmAction(
  options: ConfirmOptions,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  const { title, message, confirmText = 'OK', cancelText = 'Cancel' } = options;

  if (Platform.OS === 'web') {
    // Use browser's confirm dialog on web
    const result = window.confirm(`${title}\n\n${message}`);
    if (result) {
      onConfirm();
    } else {
      onCancel?.();
    }
  } else {
    // Use native Alert on mobile
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: onCancel },
        { text: confirmText, style: options.destructive ? 'destructive' : 'default', onPress: onConfirm },
      ]
    );
  }
}

export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

