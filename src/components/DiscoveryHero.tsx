import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { RESEARCH_PALETTE } from '../styles/Theme';
import type { ProductType } from '../types/product';

interface Props {
  productType: ProductType;
  ingredientCount: number;
}

/**
 * Frames “unknown” product as curiosity, not failure.
 */
export const DiscoveryHero: React.FC<Props> = ({ productType, ingredientCount }) => {
  if (productType !== 'UNKNOWN' || ingredientCount === 0) return null;

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={styles.titleRow}>
        <View style={styles.sparkleWrap}>
          <Sparkles size={18} color={RESEARCH_PALETTE.secondary} strokeWidth={1.75} />
        </View>
        <Text style={styles.title}>First light on this label</Text>
      </View>
      <Text style={styles.body}>
        We haven’t placed this on a shelf yet — what follows is your opening read, not a verdict.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sparkleWrap: {
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#37474F',
    letterSpacing: -0.3,
    flex: 1,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#607D8B',
  },
});
