import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

// Icon sizes following Apple's sizing conventions
export const IconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
} as const;

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

export function Icon({ name, size = IconSize.md, color = colors.textPrimary }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}

// Apple Journal style butterfly/flower icon
export function JournalBrandIcon({ size = 60 }: { size?: number }) {
  const petalWidth = size * 0.4;
  const petalHeight = size * 0.53;
  const petalRadius = petalWidth / 2;
  
  return (
    <View style={[styles.journalIcon, { width: size, height: size }]}>
      <View style={[styles.iconPetals, { width: size, height: size }]}>
        <View 
          style={[
            styles.petal, 
            styles.petalOrange,
            { width: petalWidth, height: petalHeight, borderRadius: petalRadius }
          ]} 
        />
        <View 
          style={[
            styles.petal, 
            styles.petalPink,
            { width: petalWidth, height: petalHeight, borderRadius: petalRadius }
          ]} 
        />
        <View 
          style={[
            styles.petal, 
            styles.petalPurple,
            { width: petalWidth, height: petalHeight, borderRadius: petalRadius }
          ]} 
        />
        <View 
          style={[
            styles.petal, 
            styles.petalBlue,
            { width: petalWidth, height: petalHeight, borderRadius: petalRadius }
          ]} 
        />
      </View>
    </View>
  );
}

// Filter/Sort icon (Apple style slider controls)
export function FilterIcon({ size = 22, color = colors.textSecondary }: { size?: number; color?: string }) {
  const lineHeight = Math.max(2, size * 0.09);
  const dotSize = Math.max(6, size * 0.27);
  
  return (
    <View style={[styles.filterIcon, { width: size, height: size * 0.82 }]}>
      <View style={[styles.filterLine, { height: lineHeight, backgroundColor: color }]}>
        <View style={[styles.filterDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color, left: '20%', top: -(dotSize - lineHeight) / 2 }]} />
      </View>
      <View style={[styles.filterLine, { height: lineHeight, backgroundColor: color }]}>
        <View style={[styles.filterDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color, left: '60%', top: -(dotSize - lineHeight) / 2 }]} />
      </View>
      <View style={[styles.filterLine, { height: lineHeight, backgroundColor: color }]}>
        <View style={[styles.filterDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color, left: '40%', top: -(dotSize - lineHeight) / 2 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  journalIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPetals: {
    position: 'relative',
  },
  petal: {
    position: 'absolute',
  },
  petalOrange: {
    backgroundColor: colors.iconGradient1,
    top: 0,
    left: '17%',
    transform: [{ rotate: '-20deg' }],
  },
  petalPink: {
    backgroundColor: colors.iconGradient2,
    top: '8%',
    right: '8%',
    transform: [{ rotate: '20deg' }],
  },
  petalPurple: {
    backgroundColor: colors.iconGradient3,
    bottom: 0,
    left: '8%',
    transform: [{ rotate: '-10deg' }],
  },
  petalBlue: {
    backgroundColor: colors.iconGradient4,
    bottom: '8%',
    right: '17%',
    transform: [{ rotate: '30deg' }],
  },
  filterIcon: {
    justifyContent: 'space-between',
  },
  filterLine: {
    borderRadius: 1,
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
  },
});

