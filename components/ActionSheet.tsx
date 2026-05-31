/**
 * Apple-style ActionSheet
 *
 * Slides up from the bottom with a dimmed backdrop. Renders a grouped
 * card of actions and a separate Cancel button (matching iOS native).
 * Destructive actions are rendered in red.
 */

import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, fonts } from '@/constants/theme';
import { Icon, IconSize } from './Icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/** A single action in an ActionSheet. */
export interface ActionSheetItem {
  /** Unique identifier (used as React key). */
  id: string;
  /** Display label. */
  label: string;
  /** Optional Ionicons name shown to the left of the label. */
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  /** If true, render in red (use for delete-style actions). */
  destructive?: boolean;
  /** Tap handler. The sheet will close automatically after this resolves. */
  onPress: () => void | Promise<void>;
}

interface ActionSheetProps {
  visible: boolean;
  /** Optional title shown above the actions. */
  title?: string;
  /** Optional message shown below the title. */
  message?: string;
  /** List of actions (excluding Cancel). */
  items: ActionSheetItem[];
  /** Called when the user dismisses the sheet (backdrop, Cancel, or after action). */
  onClose: () => void;
}

export function ActionSheet({ visible, title, message, items, onClose }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 10,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  // Guard against double-tap firing the action twice while the first
  // invocation is still awaiting (delete/bookmark hit storage). Reset
  // when the sheet hides so reopening works.
  const inflight = useRef(false);
  useEffect(() => {
    if (!visible) inflight.current = false;
  }, [visible]);

  const handleItemPress = async (item: ActionSheetItem) => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      await item.onPress();
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetWrapper,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md),
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Actions group */}
        <View style={styles.group}>
          {(title || message) && (
            <View style={styles.headerBlock}>
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          )}

          {items.map((item, index) => {
            const isFirst = index === 0 && !title && !message;
            const isLast = index === items.length - 1;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleItemPress(item)}
                style={({ pressed }) => [
                  styles.actionRow,
                  !isFirst && styles.actionRowDivider,
                  pressed && styles.actionPressed,
                  isLast && styles.actionRowLast,
                ]}
              >
                {item.icon && (
                  <Icon
                    name={item.icon}
                    size={IconSize.sm}
                    color={item.destructive ? colors.error : colors.accent}
                  />
                )}
                <Text
                  style={[
                    styles.actionLabel,
                    item.destructive && styles.actionLabelDestructive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Cancel */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.actionPressed]}
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  headerBlock: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.xs,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  actionRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionRowLast: {},
  actionPressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  actionLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.regular,
    color: colors.accent,
  },
  actionLabelDestructive: {
    color: colors.error,
    fontFamily: fonts.semibold,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
    color: colors.accent,
  },
});
