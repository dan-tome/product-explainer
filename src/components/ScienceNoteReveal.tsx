import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { RESEARCH_PALETTE } from '../styles/Theme';
import { MOTION } from '../styles/motion';
import type { ValidatedFamilySignal } from '../types/universalBridge';

interface Props {
  signal: ValidatedFamilySignal;
}

/**
 * Deep purple “Science note” ribbon — staggers in with 72ms steps (hydrate cadence).
 */
export const ScienceNoteReveal: React.FC<Props> = ({ signal }) => {
  const lineKicker = useRef(new Animated.Value(0)).current;
  const lineTitle = useRef(new Animated.Value(0)).current;
  const lineDetail = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    lineKicker.setValue(0);
    lineTitle.setValue(0);
    lineDetail.setValue(0);
    const steps = [
      Animated.timing(lineKicker, {
        toValue: 1,
        duration: MOTION.standardRevealMs,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }),
      Animated.timing(lineTitle, {
        toValue: 1,
        duration: MOTION.standardRevealMs,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }),
    ];
    if (signal.detail) {
      steps.push(
        Animated.timing(lineDetail, {
          toValue: 1,
          duration: MOTION.standardRevealMs,
          easing: MOTION.easingStandard,
          useNativeDriver: true,
        }),
      );
    }
    const run = Animated.stagger(MOTION.hydrateStaggerMs, steps);
    run.start();
    return () => run.stop();
  }, [signal.familyId, signal.label, signal.detail]);

  const purple = RESEARCH_PALETTE.secondary;

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Animated.Text style={[styles.kicker, { opacity: lineKicker }]}>Science note</Animated.Text>
      <Animated.Text style={[styles.title, { color: purple, opacity: lineTitle }]}>
        {signal.label}
      </Animated.Text>
      {signal.detail ? (
        <Animated.Text style={[styles.detail, { opacity: lineDetail }]}>{signal.detail}</Animated.Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 77, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 77, 255, 0.28)',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: RESEARCH_PALETTE.neutral,
    opacity: 0.85,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  detail: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#455A64',
  },
});
