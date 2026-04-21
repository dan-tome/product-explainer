import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ingredient, ProductType } from '../types/product';
import { RESEARCH_PALETTE } from '../styles/Theme';

interface Props {
  ingredients: Ingredient[];
  productType: ProductType;
}

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  FOOD: 'Food Product',
  COSMETIC: 'Cosmetic',
  HOUSEHOLD: 'Household',
  UNKNOWN: 'Product',
};

const PulseCard = ({
  label,
  value,
  sub,
  accent,
  hero = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  hero?: boolean;
}) => (
  <View style={[styles.card, hero && styles.heroCard, { borderTopColor: accent }]}>
    <Text style={[styles.cardLabel, { color: accent }]}>{label}</Text>
    <Text style={[styles.cardValue, hero && styles.heroValue]}>{value}</Text>
    <Text style={styles.cardSub}>{sub}</Text>
  </View>
);

export const ProductPulse: React.FC<Props> = ({ ingredients, productType }) => {
  const allergenCount = ingredients.filter(i => i.allergen_info.is_match).length;
  const allergenValue = allergenCount === 0 ? 'No Matches' : `${allergenCount} Match${allergenCount > 1 ? 'es' : ''}`;
  const allergenSub = allergenCount === 0
    ? 'No known allergens detected'
    : `of ${ingredients.length} ingredients`;

  // Insight card: functional_purpose of the first (primary) ingredient
  const primaryIngredient = ingredients[0];
  const insightValue = primaryIngredient?.common_name ?? '—';
  const insightSub = primaryIngredient?.functional_purpose ?? '';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.container}
    >
      <PulseCard
        label="ALLERGEN MATCH"
        value={allergenValue}
        sub={allergenSub}
        accent={RESEARCH_PALETTE.attention}
        hero
      />
      <PulseCard
        label="PRODUCT TYPE"
        value={PRODUCT_TYPE_LABEL[productType]}
        sub={`${ingredients.length} ingredients`}
        accent={RESEARCH_PALETTE.primary}
      />
      <PulseCard
        label="PRIMARY INGREDIENT"
        value={insightValue}
        sub={insightSub}
        accent={RESEARCH_PALETTE.secondary}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: RESEARCH_PALETTE.surface,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderTopWidth: 3,
    padding: 14,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  heroCard: {
    width: Math.round(180 * 1.15), // 15% wider — anchors visual hierarchy
    padding: 16,
  },
  heroValue: {
    fontSize: 18,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 11,
    color: '#888',
    lineHeight: 16,
  },
});
