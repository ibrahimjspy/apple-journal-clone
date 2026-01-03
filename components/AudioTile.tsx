/**
 * Audio Tile for Home Screen Cards
 * Shows waveform visualization with play button
 */

import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioEntry } from '@/types/journal';

interface AudioTileProps {
  audio: AudioEntry;
}

export function AudioTile({ audio }: AudioTileProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Animated values for waveform bars
  const barAnimations = useRef<Animated.Value[]>(
    (audio.waveform || []).slice(0, 30).map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Animate playing bars
  useEffect(() => {
    if (isPlaying) {
      const animations = barAnimations.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.6 + Math.random() * 0.4,
              duration: 150 + Math.random() * 100,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 150 + Math.random() * 100,
              useNativeDriver: true,
            }),
          ])
        );
      });
      
      Animated.parallel(animations).start();
    } else {
      barAnimations.forEach(anim => {
        anim.stopAnimation();
        anim.setValue(1);
      });
    }
  }, [isPlaying, barAnimations]);

  const loadAndPlay = async () => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audio.uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis / status.durationMillis);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setProgress(0);
      }
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const waveformBars = audio.waveform?.slice(0, 30) || new Array(30).fill(0.5);

  return (
    <Pressable onPress={loadAndPlay} style={styles.container}>
      <LinearGradient
        colors={[colors.accent, colors.accentSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Play/Pause Button */}
        <View style={styles.playButton}>
          <Icon 
            name={isPlaying ? 'pause' : 'play'} 
            size={IconSize.md} 
            color={colors.accent} 
          />
        </View>

        {/* Waveform */}
        <View style={styles.waveformContainer}>
          {waveformBars.map((level, index) => {
            const barProgress = index / waveformBars.length;
            const isPlayed = barProgress <= progress;
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(20, level * 100)}%`,
                    backgroundColor: isPlayed 
                      ? 'rgba(255, 255, 255, 1)' 
                      : 'rgba(255, 255, 255, 0.5)',
                    transform: [{ scaleY: barAnimations[index] || 1 }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Duration */}
        <Text style={styles.duration}>{formatDuration(audio.duration)}</Text>
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

