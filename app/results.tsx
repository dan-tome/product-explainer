import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { analyzeIngredients, IngredientAnalysis } from '../src/services/analysisService';
import { IngredientCard } from '../src/components/IngredientCard';

export default function ResultsScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();
  const [ingredients, setIngredients] = useState<IngredientAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

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
    unknown: ingredients.filter(i => i.status === 'unknown').length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Analysis Results' }} />
        <ActivityIndicator testID="loading-indicator" size="large" color="#f4511e" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Analysis Results' }} />

      <View style={styles.summaryContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#4caf50', borderTopWidth: 4 }]}>
          <Text style={styles.statLabel}>Safe</Text>
          <Text style={styles.statValue}>{stats.safe}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#ff9800', borderTopWidth: 4 }]}>
          <Text style={styles.statLabel}>Warning</Text>
          <Text style={styles.statValue}>{stats.warning}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#f44336', borderTopWidth: 4 }]}>
          <Text style={styles.statLabel}>Avoid</Text>
          <Text style={styles.statValue}>{stats.avoid}</Text>
        </View>
      </View>

      <FlatList
        data={ingredients}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => <IngredientCard ingredient={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ingredients found to analyze.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statBox: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    minWidth: 70,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
