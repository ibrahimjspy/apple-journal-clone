/**
 * Audio Tile for Home Screen Cards
 *
 * Apple Journal-style gradient pill with waveform bars, play/pause
 * button, and duration label.
 *
 * Perf: each visible card with audio would otherwise instantiate an
 * `useAudioPlayer` (with a 500ms polling status listener) eagerly when
 * the home scrollview renders. With many entries, that scales poorly.
 * We split the tile into a lightweight placeholder that doesn't touch
 * expo-audio, and only mount the real player after the user taps play
 * for the first time. The player then stays mounted for the rest of
 * the session (so subsequent toggles are instant).
 */

import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, fonts } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioEntry } from '@/types/journal';
import { formatDurationMs } from '@/utils/time';
import { AUDIO_STATUS_INTERVAL_MS } from '@/constants/app';

interface AudioTileProps {
  audio: AudioEntry;
}

/**
 * Public wrapper: shows the static placeholder until tapped, then mounts
 * the active player. Once active, the player remains for the lifetime of
 * the parent.
 */
export function AudioTile({ audio }: AudioTileProps) {
  const [active, setActive] = useState(false);
  if (active) {
    return <ActivePlayerTile audio={audio} />;
  }
  return <PlaceholderTile audio={audio} onActivate={() => setActive(true)} />;
}

/** Lightweight tile (no expo-audio dependency) shown until first interaction. */
function PlaceholderTile({ audio, onActivate }: { audio: AudioEntry; onActivate: () => void }) {
  const waveformBars = audio.waveform?.slice(0, 35) || new Array(35).fill(0.5);
  return (
    <Pressable
      onPress={onActivate}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Play voice note, ${Math.round(audio.duration / 1000)} seconds`}
    >
      <TileSurface
        isPlaying={false}
        progress={0}
        durationLabel={formatDurationMs(audio.duration)}
        waveformBars={waveformBars}
      />
    </Pressable>
  );
}

/** Real player with status polling. Only mounted once user has tapped play. */
function ActivePlayerTile({ audio }: { audio: AudioEntry }) {
  const player = useAudioPlayer({ uri: audio.uri }, { updateInterval: AUDIO_STATUS_INTERVAL_MS });
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
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause voice note' : 'Resume voice note'}
    >
      <TileSurface
        isPlaying={isPlaying}
        progress={progress}
        durationLabel={formatDurationMs(isPlaying ? currentMs : audio.duration)}
        waveformBars={waveformBars}
      />
    </Pressable>
  );
}

/** Shared visual surface for both placeholder and active tile. */
function TileSurface({
  isPlaying,
  progress,
  durationLabel,
  waveformBars,
}: {
  isPlaying: boolean;
  progress: number;
  durationLabel: string;
  waveformBars: number[];
}) {
  return (
    <LinearGradient
      colors={[colors.accent, colors.accentSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.playBtn}>
        <Icon name={isPlaying ? 'pause' : 'play'} size={IconSize.sm} color={colors.accent} />
      </View>
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
                  backgroundColor: isPlayed ? colors.waveformPlayed : colors.waveformUnplayed,
                },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.duration}>{durationLabel}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
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
    backgroundColor: colors.waveformPlayed,
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
  bar: { flex: 1, borderRadius: 1, minHeight: 4 },
  duration: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
    color: colors.waveformPlayed,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.xs,
  },
});
