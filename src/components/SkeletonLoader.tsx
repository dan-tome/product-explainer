import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { MOTION } from '../styles/motion';
import { RESEARCH_PALETTE } from '../styles/Theme';

const PULSE_DURATION = 750; // 750ms × 2 = 1.5s full cycle
const CARD_WIDTH = 180;
const HERO_CARD_WIDTH = Math.round(CARD_WIDTH * 1.15); // 15% larger to anchor visual hierarchy

const usePulse = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: PULSE_DURATION,
          easing: MOTION.easingStandard,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: PULSE_DURATION,
          easing: MOTION.easingStandard,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);
  return opacity;
};

const SkeletonBlock = ({ width, height, style }: { width: number | string; height: number; style?: object }) => (
  <View style={[{ width, height, backgroundColor: '#E0E0E0', borderRadius: 6 }, style]} />
);

const SkeletonPulseCard = ({ width }: { width: number }) => {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.pulseCard, { width, opacity }]}>
      <SkeletonBlock width={60} height={8} />
      <SkeletonBlock width={width * 0.6} height={18} style={styles.mt8} />
      <SkeletonBlock width={width * 0.85} height={10} style={styles.mt6} />
    </Animated.View>
  );
};

const SkeletonIngredientCard = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.ingredientCard, { opacity }]}>
      <View style={styles.ingredientRow}>
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width={60} height={22} style={{ borderRadius: 11 }} />
      </View>
      <SkeletonBlock width="80%" height={10} style={styles.mt8} />
    </Animated.View>
  );
};

export const SkeletonLoader: React.FC = () => (
  <View style={styles.container}>
    {/* ProductPulse skeleton — hero card is 15% wider */}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pulseScroll}
      style={styles.pulseRow}
    >
      <SkeletonPulseCard width={HERO_CARD_WIDTH} />
      <SkeletonPulseCard width={CARD_WIDTH} />
      <SkeletonPulseCard width={CARD_WIDTH} />
    </ScrollView>

    {/* Ingredient list skeleton */}
    <View style={styles.list}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonIngredientCard key={i} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RESEARCH_PALETTE.surface,
  },
  pulseRow: {
    backgroundColor: RESEARCH_PALETTE.surface,
  },
  pulseScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  pulseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ingredientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    paddingTop: 8,
  },
  mt8: { marginTop: 8 },
  mt6: { marginTop: 6 },
});
