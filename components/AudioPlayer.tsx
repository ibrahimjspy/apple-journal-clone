/**
 * Apple Journal-style Audio Player
 *
 * Two modes:
 * - Full: dark card with waveform, play button, and time labels
 * - Compact: gradient pill with small waveform (used in compose sheets)
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, fonts } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioEntry } from '@/types/journal';
import { formatDurationMs } from '@/utils/time';

interface AudioPlayerProps {
  audio: AudioEntry;
  compact?: boolean;
}

export function AudioPlayer({ audio, compact = false }: AudioPlayerProps) {
  const player = useAudioPlayer({ uri: audio.uri }, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const durationMs = (status.duration ?? 0) * 1000 || audio.duration || 1;
  const currentMs = (status.currentTime ?? 0) * 1000;
  const progress = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      if (progress >= 0.99) player.seekTo(0);
      player.play();
    }
  }, [isPlaying, player, progress]);

  const waveformBars = audio.waveform || new Array(50).fill(0.3);

  if (compact) {
    const compactBars = waveformBars.slice(0, 30);
    return (
      <Pressable onPress={togglePlayback} style={styles.compactContainer}>
        <LinearGradient
          colors={[colors.accent, colors.accentSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactPlayBtn}>
            <Icon name={isPlaying ? 'pause' : 'play'} size={14} color={colors.accent} />
          </View>
          <View style={styles.compactWaveform}>
            {compactBars.map((level, i) => (
              <View
                key={i}
                style={[
                  styles.compactBar,
                  {
                    height: Math.max(3, level * 22),
                    backgroundColor: i / compactBars.length <= progress
                      ? 'rgba(255,255,255,1)'
                      : 'rgba(255,255,255,0.35)',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.compactTime}>
            {formatDurationMs(isPlaying ? currentMs : audio.duration)}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* Waveform */}
      <View style={styles.waveformRow}>
        {waveformBars.map((level, i) => {
          const barPos = i / waveformBars.length;
          const isPlayed = barPos <= progress;
          const isCurrent = Math.abs(barPos - progress) < 1 / waveformBars.length;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: Math.max(3, level * 48),
                  backgroundColor: isPlayed ? colors.accent : colors.surfaceTertiary,
                  opacity: isCurrent && isPlaying ? 1 : isPlayed ? 0.9 : 0.5,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Text style={styles.time}>{formatDurationMs(currentMs)}</Text>
        <Pressable
          onPress={togglePlayback}
          style={({ pressed }) => [styles.playBtn, pressed && { transform: [{ scale: 0.93 }] }]}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={IconSize.md} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.time, { textAlign: 'right' }]}>{formatDurationMs(audio.duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    paddingVertical: spacing.lg,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 2,
    marginBottom: spacing.md,
  },
  bar: {
    width: 2.5,
    borderRadius: 1.25,
    minHeight: 3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: typography.sizes.xs,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    width: 36,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Compact (compose sheet)
  compactContainer: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  compactPlayBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    gap: 1.5,
  },
  compactBar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 3,
  },
  compactTime: {
    fontSize: typography.sizes.xs,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.9)',
    fontVariant: ['tabular-nums'],
  },
});
