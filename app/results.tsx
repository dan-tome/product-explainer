import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { analyzeIngredients } from '../src/services/analysisService';
import { IngredientCard } from '../src/components/IngredientCard';

export default function ResultsScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();
  
  const analyzedIngredients = useMemo(() => {
    return analyzeIngredients(text || '');
  }, [text]);

  const stats = useMemo(() => {
    return {
      total: analyzedIngredients.length,
      safe: analyzedIngredients.filter(i => i.status === 'safe').length,
      warning: analyzedIngredients.filter(i => i.status === 'warning').length,
      avoid: analyzedIngredients.filter(i => i.status === 'avoid').length,
      unknown: analyzedIngredients.filter(i => i.status === 'unknown').length,
    };
  }, [analyzedIngredients]);

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
        data={analyzedIngredients}
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
