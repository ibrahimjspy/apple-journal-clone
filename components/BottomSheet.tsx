/**
 * Reusable Bottom Sheet Component
 * Used by both CreateEntrySheet and ViewEntrySheet
 */

import { useRef, useEffect, useState, ReactNode } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable,
  Modal,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: number;
}

export function BottomSheet({ visible, onClose, children, height = 0.85 }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Track keyboard so we can lift the sheet above it. We use will/did show
  // appropriately per platform so animation feels native.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Lift the sheet above the keyboard by shifting its bottom edge up.
  // We also shrink the height by `keyboardHeight` so the top of the sheet
  // never extends past the status bar (which would clip the handle/header).
  const baseHeight = SCREEN_HEIGHT * height;
  const maxAvailableHeight = SCREEN_HEIGHT - insets.top - keyboardHeight - spacing.md;
  const sheetHeight = keyboardHeight > 0 ? Math.min(baseHeight, maxAvailableHeight) : baseHeight;
  const sheetBottom = keyboardHeight > 0 ? keyboardHeight : 0;
  const bottomPadding = keyboardHeight > 0 ? 0 : insets.bottom;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </Pressable>

      {/* Sheet */}
      <Animated.View 
        style={[
          styles.sheet,
          { 
            height: sheetHeight,
            bottom: sheetBottom,
            transform: [{ translateY: slideAnim }],
            paddingBottom: bottomPadding,
          }
        ]}
      >
        <LinearGradient
          colors={[colors.backgroundSecondary, colors.background]}
          style={StyleSheet.absoluteFill}
        />

        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textTertiary,
  },
});

