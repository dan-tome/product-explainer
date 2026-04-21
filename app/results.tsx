import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { analyzeIngredients, detectProductType } from '../src/services/analysisService';
import { Ingredient, ProductType } from '../src/types/product';
import { IngredientCard } from '../src/components/IngredientCard';
import { DailySnapshot } from '../src/components/DailySnapshot';
import { ProductPulse } from '../src/components/ProductPulse';
import { SkeletonLoader } from '../src/components/SkeletonLoader';
import { RESEARCH_PALETTE } from '../src/styles/Theme';
import { ResearchSlateContainer } from '../src/components/UniversalOcrBridge';
import {
  isCompoundGroupMember,
  resolveAggregateBridge,
} from '../src/components/universalBridgeResolve';

export default function ResultsScreen() {
  const router = useRouter();
  const { text } = useLocalSearchParams<{ text: string }>();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [productType, setProductType] = useState<ProductType>('UNKNOWN');
  const [loading, setLoading] = useState(true);
  const [showScientific, setShowScientific] = useState(false);

  useEffect(() => {
    const raw = text || '';
    setProductType(detectProductType(raw));
    analyzeIngredients(raw).then(result => {
      setIngredients(result);
      setLoading(false);
      const pt = detectProductType(raw);
      // First Light slate: selection tick (maps to UISelectionFeedback on iOS / light tick on Android)
      if (pt === 'UNKNOWN' && result.length > 0) {
        Haptics.selectionAsync();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  }, [text]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Analysing…', headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#1a1a1a' }} />

        <View testID="loading-indicator" style={styles.loaderContainer}>
          <SkeletonLoader />
        </View>
      </SafeAreaView>
    );
  }

  const bridge = resolveAggregateBridge(ingredients);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{ title: 'Results', headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#1a1a1a' }}
      />

      <ResearchSlateContainer
        productType={productType}
        ingredientCount={ingredients.length}
        validatedFamily={bridge.validatedFamily}
        cumulativeNote={bridge.cumulativeNote}
      >
        <FlatList
          data={ingredients}
          keyExtractor={(item, index) => `${item.scientific_name}-${index}`}
          renderItem={({ item }) => (
            <IngredientCard
              ingredient={item}
              compoundGroup={isCompoundGroupMember(item, bridge.synergyActive)}
              showScientific={showScientific}
            />
          )}
          ListHeaderComponent={
            ingredients.length > 0 ? (
              <View>
                <DailySnapshot ingredients={ingredients} />
                <ProductPulse ingredients={ingredients} productType={productType} />
                <View style={styles.ingredientsToggleRow}>
                  <Text style={styles.ingredientsSectionLabel}>INGREDIENTS</Text>
                  <View style={styles.ingredientsToggleOptions}>
                    <TouchableOpacity
                      onPress={() => setShowScientific(false)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !showScientific }}
                    >
                      <Text
                        style={[
                          styles.ingredientsToggleOption,
                          showScientific ? styles.ingredientsToggleInactive : styles.ingredientsToggleActive,
                        ]}
                      >
                        Common
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowScientific(true)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: showScientific }}
                    >
                      <Text
                        style={[
                          styles.ingredientsToggleOption,
                          showScientific ? styles.ingredientsToggleActive : styles.ingredientsToggleInactive,
                        ]}
                      >
                        INCI
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyKicker}>Nothing found this pass</Text>
              <Text style={styles.emptyText}>
                Hold the camera closer to the ingredients list and try again.
              </Text>
              <TouchableOpacity style={styles.rescanButton} onPress={() => router.back()}>
                <Text style={styles.rescanButtonText}>Scan again</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </ResearchSlateContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RESEARCH_PALETTE.surface,
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
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  ingredientsToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  ingredientsSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#78909C',
  },
  ingredientsToggleOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ingredientsToggleOption: {
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientsToggleActive: {
    color: RESEARCH_PALETTE.primary,
    opacity: 1,
  },
  ingredientsToggleInactive: {
    color: '#B0BEC5',
    opacity: 0.7,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyKicker: {
    fontSize: 13,
    fontWeight: '600',
    color: RESEARCH_PALETTE.neutral,
    opacity: 0.85,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  rescanButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: RESEARCH_PALETTE.primary,
  },
  rescanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
