import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, FlatList, ActivityIndicator,
  Modal, TouchableOpacity, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { ShieldCheck, AlertTriangle, XCircle, HelpCircle, X } from 'lucide-react-native';
import { analyzeIngredients, IngredientAnalysis, IngredientStatus } from '../src/services/analysisService';
import { IngredientCard } from '../src/components/IngredientCard';

const STATUS_CONFIG: Record<IngredientStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  safe:    { label: 'Safe',    bg: '#e8f5e9', text: '#2e7d32', icon: <ShieldCheck size={32} color="#2e7d32" /> },
  warning: { label: 'Warning', bg: '#fff3e0', text: '#e65100', icon: <AlertTriangle size={32} color="#e65100" /> },
  avoid:   { label: 'Avoid',   bg: '#ffebee', text: '#c62828', icon: <XCircle size={32} color="#c62828" /> },
  unknown: { label: 'Unknown', bg: '#f5f5f5', text: '#757575', icon: <HelpCircle size={32} color="#757575" /> },
};

export default function ResultsScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();
  const [ingredients, setIngredients] = useState<IngredientAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IngredientAnalysis | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    analyzeIngredients(text || '').then(result => {
      setIngredients(result);
      setLoading(false);
    });
  }, [text]);

  const stats = {
    total: ingredients.length,
    safe: ingredients.filter(i => i.status === 'safe').length,
    warning: ingredients.filter(i => i.status === 'warning').length,
    avoid: ingredients.filter(i => i.status === 'avoid').length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Analysis Results', headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#1a1a1a' }} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator testID="loading-indicator" size="large" color="#f4511e" />
          <Text style={styles.loaderText}>Analysing ingredients…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = selected ? STATUS_CONFIG[selected.status] : null;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Analysis Results', headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#1a1a1a' }} />

      <View style={styles.summary}>
        <View style={styles.totalBox}>
          <Text style={styles.totalValue}>{stats.total}</Text>
          <Text style={styles.totalLabel}>Ingredients</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[styles.statPillValue, { color: '#2e7d32' }]}>{stats.safe}</Text>
            <Text style={[styles.statPillLabel, { color: '#2e7d32' }]}>Safe</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#fff3e0' }]}>
            <Text style={[styles.statPillValue, { color: '#e65100' }]}>{stats.warning}</Text>
            <Text style={[styles.statPillLabel, { color: '#e65100' }]}>Warning</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#ffebee' }]}>
            <Text style={[styles.statPillValue, { color: '#c62828' }]}>{stats.avoid}</Text>
            <Text style={[styles.statPillLabel, { color: '#c62828' }]}>Avoid</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={ingredients}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => (
          <IngredientCard ingredient={item} onPress={() => setSelected(item)} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ingredients found to analyze.</Text>
          </View>
        }
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelected(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        {selected && cfg && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity style={styles.closeButton} onPress={() => setSelected(null)}>
              <X size={20} color="#999" />
            </TouchableOpacity>

            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
              {cfg.icon}
            </View>

            <Text style={styles.sheetName}>
              {selected.name.charAt(0).toUpperCase() + selected.name.slice(1)}
            </Text>

            <View style={[styles.sheetBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.sheetBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
            </View>

            <Text style={styles.sheetInfo}>{selected.info}</Text>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loaderText: {
    fontSize: 15,
    color: '#999',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  totalBox: {
    alignItems: 'center',
    marginRight: 20,
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  totalLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statPill: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 62,
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#bbb',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 16,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    padding: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sheetName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  sheetBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  sheetBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  sheetInfo: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    textAlign: 'center',
  },
});
