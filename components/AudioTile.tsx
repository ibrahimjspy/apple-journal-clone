/**
 * Audio Tile for Home Screen Cards
 * Compact waveform player shown on journal entry cards.
 * Uses expo-audio for playback.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioEntry } from '@/types/journal';
import { formatDurationMs } from '@/utils/time';

interface AudioTileProps {
  audio: AudioEntry;
}

export function AudioTile({ audio }: AudioTileProps) {
  const player = useAudioPlayer(audio.uri);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const durationMs = status.duration * 1000 || audio.duration || 1;
  const currentMs = (status.currentTime ?? 0) * 1000;
  const progress = durationMs > 0 ? currentMs / durationMs : 0;

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      if (progress >= 0.99) {
        player.seekTo(0);
      }
      player.play();
    }
  }, [isPlaying, player, progress]);

  const waveformBars = audio.waveform?.slice(0, 30) || new Array(30).fill(0.5);

  return (
    <Pressable onPress={togglePlayback} style={styles.container}>
      <LinearGradient
        colors={[colors.accent, colors.accentSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.playButton}>
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={IconSize.md}
            color={colors.accent}
          />
        </View>

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

        <Text style={styles.duration}>{formatDurationMs(audio.duration)}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 4,
  },
  duration: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.sm,
  },
});
