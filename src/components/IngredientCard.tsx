import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { IngredientAnalysis, IngredientStatus } from '../services/analysisService';

interface Props {
  ingredient: IngredientAnalysis;
  onPress: () => void;
}

const STATUS_CONFIG: Record<IngredientStatus, { label: string; bg: string; text: string }> = {
  safe:    { label: 'Safe',    bg: '#e8f5e9', text: '#2e7d32' },
  warning: { label: 'Warning', bg: '#fff3e0', text: '#e65100' },
  avoid:   { label: 'Avoid',   bg: '#ffebee', text: '#c62828' },
  unknown: { label: 'Unknown', bg: '#f5f5f5', text: '#757575' },
};

export const IngredientCard: React.FC<Props> = ({ ingredient, onPress }) => {
  const cfg = STATUS_CONFIG[ingredient.status];
  const name = ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
        <ChevronRight size={16} color="#ccc" style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chevron: {
    marginLeft: 6,
  },
});
