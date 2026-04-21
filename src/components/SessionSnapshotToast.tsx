import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RESEARCH_PALETTE } from '../styles/Theme';

const PURPLE = RESEARCH_PALETTE.secondary;

/**
 * Subtle bottom ribbon: ties one ingredient to the broader session / aggregate story.
 * Soft purple glow — research palette, non-alarmist copy.
 */
export const SessionSnapshotToast: React.FC = () => (
  <View
    style={styles.wrap}
    accessibilityLabel="Session snapshot. This ingredient is part of a larger picture for this scan."
  >
    <Text style={styles.kicker}>Session snapshot</Text>
    <Text style={styles.body}>Connects to your running picture for this product — one piece of the whole.</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -16,
    marginBottom: -14,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: 'rgba(124, 77, 255, 0.07)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(124, 77, 255, 0.26)',
    // Soft lift — glow reads from fill + border (card uses overflow hidden)
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: PURPLE,
    opacity: 0.85,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: RESEARCH_PALETTE.neutral,
    opacity: 0.88,
  },
});
