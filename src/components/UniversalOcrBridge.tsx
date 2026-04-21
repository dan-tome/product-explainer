import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RESEARCH_PALETTE } from '../styles/Theme';
import { MOTION } from '../styles/motion';
import type { ProductType } from '../types/product';
import type { CumulativeResearchNote as CumulativeNoteModel, ValidatedFamilySignal } from '../types/universalBridge';
import { CumulativeResearchNote } from './CumulativeResearchNote';
import { DiscoveryHero } from './DiscoveryHero';
import { ScienceNoteReveal } from './ScienceNoteReveal';

/** Scanning stage — frames the camera as the “universal interpreter” entry. */
export const ScanStage: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => (
  <View style={[styles.scanRoot, style]}>
    <SafeAreaView style={styles.scanSafe} edges={['top']}>
      <View style={styles.scanHeader}>
        <Text style={styles.scanKicker}>Universal interpreter</Text>
        <Text style={styles.scanTitle}>Bridge from label to research</Text>
      </View>
    </SafeAreaView>
    <View style={styles.scanBody}>{children}</View>
  </View>
);

/** Full-screen handoff between capture and the research slate (discovery, not error). */
export const BridgeHandoff: React.FC<{ visible: boolean }> = ({ visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.98);
      return;
    }
    opacity.setValue(0);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION.standardRevealMs,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: MOTION.standardRevealMs + 80,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.handoffRoot, { opacity }]} pointerEvents="auto">
      <Animated.View style={[styles.handoffCard, { transform: [{ scale }] }]}>
        <Text style={styles.handoffKicker}>Label captured</Text>
        <Text style={styles.handoffTitle}>Opening your research slate…</Text>
        <Text style={styles.handoffSub}>A quiet handoff — not a system fault.</Text>
      </Animated.View>
    </Animated.View>
  );
};

interface ResearchSlateProps {
  children: React.ReactNode;
  productType: ProductType;
  ingredientCount: number;
  /** When omitted, containers can stay empty; pass from your hook when ready. */
  validatedFamily?: ValidatedFamilySignal | null;
  /** Tier 2 aggregate — shown instead of the standard Science Note when synergy is active */
  cumulativeNote?: CumulativeNoteModel | null;
}

/**
 * Research slate chrome: discovery framing + cumulative note (synergy) or Science Note.
 */
export const ResearchSlateContainer: React.FC<ResearchSlateProps> = ({
  children,
  productType,
  ingredientCount,
  validatedFamily,
  cumulativeNote,
}) => (
  <View style={styles.slateRoot}>
    <View style={styles.slateHeader}>
      <Text style={styles.slateKicker}>Research slate</Text>
    </View>
    <DiscoveryHero productType={productType} ingredientCount={ingredientCount} />
    {cumulativeNote ? <CumulativeResearchNote note={cumulativeNote} /> : null}
    {!cumulativeNote && validatedFamily ? <ScienceNoteReveal signal={validatedFamily} /> : null}
    <View style={styles.slateBody}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  scanRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanSafe: {
    zIndex: 2,
  },
  scanHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  scanKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  scanTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: -0.2,
  },
  scanBody: {
    flex: 1,
  },
  handoffRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 247, 250, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 100,
  },
  handoffCard: {
    maxWidth: 320,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 77, 255, 0.2)',
    shadowColor: RESEARCH_PALETTE.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  handoffKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: RESEARCH_PALETTE.neutral,
    opacity: 0.75,
    marginBottom: 8,
  },
  handoffTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#263238',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  handoffSub: {
    fontSize: 14,
    lineHeight: 20,
    color: '#78909C',
  },
  slateRoot: {
    flex: 1,
    paddingHorizontal: 16,
  },
  slateBody: {
    flex: 1,
  },
  slateHeader: {
    marginBottom: 4,
  },
  slateKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: RESEARCH_PALETTE.neutral,
    opacity: 0.65,
  },
});
