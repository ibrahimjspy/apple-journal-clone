/**
 * Apple-style Audio Player with Waveform Display
 * Shows stored waveform and playback progress
 */

import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioEntry } from '@/types/journal';

interface AudioPlayerProps {
  audio: AudioEntry;
  compact?: boolean;
}

export function AudioPlayer({ audio, compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [audio.uri]);

  const loadSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audio.uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      const prog = status.positionMillis / status.durationMillis;
      setProgress(prog);
      setCurrentTime(status.positionMillis);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    }
  };

  const togglePlayback = async () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      if (progress >= 0.99) {
        await soundRef.current.setPositionAsync(0);
      }
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const formatTime = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const waveformBars = audio.waveform || new Array(50).fill(0.3);

  // Compact mode for create entry sheet
  if (compact) {
    return (
      <Pressable onPress={togglePlayback} style={styles.compactContainer}>
        <LinearGradient
          colors={[colors.accent, colors.accentSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactPlayButton}>
            <Icon 
              name={isPlaying ? 'pause' : 'play'} 
              size={IconSize.sm} 
              color={colors.accent} 
            />
          </View>
          <View style={styles.compactWaveform}>
            {waveformBars.slice(0, 25).map((level, index) => {
              const isPlayed = index / 25 <= progress;
              return (
                <View
                  key={index}
                  style={[
                    styles.compactBar,
                    {
                      height: `${Math.max(20, level * 100)}%`,
                      backgroundColor: isPlayed 
                        ? 'rgba(255, 255, 255, 1)' 
                        : 'rgba(255, 255, 255, 0.5)',
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.compactTime}>
            {formatTime(isPlaying ? currentTime : audio.duration)}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  // Full mode
  return (
    <View style={styles.container}>
      <View style={styles.waveformContainer}>
        {waveformBars.map((level, index) => {
          const barProgress = index / waveformBars.length;
          const isPlayed = barProgress <= progress;
          
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: `${Math.max(15, level * 100)}%`,
                  backgroundColor: isPlayed ? colors.accent : colors.surfaceTertiary,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.controls}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        
        <Pressable 
          onPress={togglePlayback}
          style={({ pressed }) => [
            styles.playButton,
            pressed && styles.playButtonPressed
          ]}
        >
          <Icon 
            name={isPlaying ? 'pause' : 'play'} 
            size={IconSize.lg} 
            color={colors.textPrimary} 
          />
        </Pressable>
        
        <Text style={styles.time}>{formatTime(audio.duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 2,
    marginBottom: spacing.md,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    width: 40,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  // Compact styles
  compactContainer: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  compactPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 2,
  },
  compactBar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 4,
  },
  compactTime: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weights.medium,
  },
});
