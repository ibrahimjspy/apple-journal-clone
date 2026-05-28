/**
 * Audio Tile for Home Screen Cards
 *
 * Apple Journal-style gradient pill with waveform bars,
 * play/pause button, and duration label.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, fonts } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioEntry } from '@/types/journal';
import { formatDurationMs } from '@/utils/time';

interface AudioTileProps {
  audio: AudioEntry;
}

export function AudioTile({ audio }: AudioTileProps) {
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

  const waveformBars = audio.waveform?.slice(0, 35) || new Array(35).fill(0.5);

  return (
    <Pressable
      onPress={togglePlayback}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
    >
      <LinearGradient
        colors={[colors.accent, colors.accentSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Play button */}
        <View style={styles.playBtn}>
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={IconSize.sm}
            color={colors.accent}
          />
        </View>

        {/* Waveform bars */}
        <View style={styles.waveform}>
          {waveformBars.map((level, i) => {
            const barPos = i / waveformBars.length;
            const isPlayed = barPos <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, level * 28),
                    backgroundColor: isPlayed
                      ? 'rgba(255,255,255,1)'
                      : 'rgba(255,255,255,0.3)',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Duration */}
        <Text style={styles.duration}>
          {formatDurationMs(isPlaying ? currentMs : audio.duration)}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    gap: 1.5,
  },
  bar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 4,
  },
  duration: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.9)',
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.xs,
  },
});
