import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_DRIVE_SCOPES } from '@/constants/env';
import { GoogleIcon } from '@/components/GoogleIcon';
import { Icon, JournalBrandIcon, IconSize } from '@/components/Icons';

// Required for Google Auth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(30));

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: GOOGLE_DRIVE_SCOPES,
  });

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      console.log('Auth success:', authentication);
      router.replace('/home');
    }
  }, [response]);

  const handleGoogleLogin = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      // Demo mode - skip to home for development
      console.log('Google not configured, entering demo mode');
      router.replace('/home');
      return;
    }
    
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* App Icon / Logo area */}
          <View style={styles.logoContainer}>
            <JournalBrandIcon size={80} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Journal</Text>
          <Text style={styles.subtitle}>
            Capture your thoughts, moments,{'\n'}and memories
          </Text>

          {/* Feature highlights */}
          <View style={styles.features}>
            <FeatureItem icon="pencil" text="Write your story" />
            <FeatureItem icon="mic-outline" text="Voice journaling" />
            <FeatureItem icon="image-outline" text="Add photos" />
            <FeatureItem icon="cloud-outline" text="Synced to your Drive" />
          </View>

          {/* Login Button */}
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              isLoading && styles.googleButtonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <View style={styles.googleIconContainer}>
              <GoogleIcon size={20} />
            </View>
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Connecting...' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* Privacy note */}
          <Text style={styles.privacyNote}>
            Your journals are stored securely in your{'\n'}
            personal Google Drive. We never access your data.
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Icon name={icon as any} size={IconSize.sm} color={colors.accent} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  features: {
    width: '100%',
    maxWidth: 280,
    marginBottom: spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  googleButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIconContainer: {
    marginRight: spacing.sm,
  },
  googleButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.background,
  },
  privacyNote: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
