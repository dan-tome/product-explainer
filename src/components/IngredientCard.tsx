import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Atom, ChevronDown, Sparkles } from 'lucide-react-native';
import { Ingredient, IngredientStatus } from '../types/product';
import { RESEARCH_PALETTE, STATUS_COLORS } from '../styles/Theme';
import { MOTION } from '../styles/motion';
import { checkEDC, isRespiratoryHazard } from '../services/edcService';
import { SessionSnapshotToast } from './SessionSnapshotToast';
import { hasCompoundExposure } from './sessionSnapshotExposure';
import { CompoundGroupFrame } from './CompoundGroupFrame';
import { TransparencySandwich, VentilationSvg } from './TransparencySandwich';

interface Props {
  ingredient: Ingredient;
  /** Synergy pathway — teal/purple hairline (Tier 2 aggregate) */
  compoundGroup?: boolean;
  /** When true, collapsed face shows INCI/scientific name; L1 shows common name. Default: common on face, scientific in L1. */
  showScientific?: boolean;
}

type Level = 0 | 1 | 2;

const STATUS_LABEL: Record<IngredientStatus, string> = {
  safe: 'Safe',
  warning: 'Review',
  avoid: 'Avoid',
  unknown: 'Unknown',
};

const L2_HEIGHT = 100;
const L3_HEIGHT = 140; // extra height for literacy_flag row

export const IngredientCard: React.FC<Props> = ({
  ingredient,
  compoundGroup = false,
  showScientific = false,
}) => {
  const [level, setLevel] = useState<Level>(0);
  const animL2 = useRef(new Animated.Value(0)).current;
  const animL3 = useRef(new Animated.Value(0)).current;
  const hydrateHeader = useRef(new Animated.Value(0)).current;
  const hydratePurpose = useRef(new Animated.Value(0)).current;

  const isAllergen = ingredient.allergen_info.is_match;
  const l2RevealDuration = isAllergen ? MOTION.allergenMatchMs : MOTION.standardRevealMs;

  /** 72ms stagger: Scientific Action / “what” (purpose) → then identity (name + badge). */
  useEffect(() => {
    hydratePurpose.setValue(0);
    hydrateHeader.setValue(0);
    const entrance = Animated.stagger(MOTION.hydrateStaggerMs, [
      Animated.timing(hydratePurpose, {
        toValue: 1,
        duration: MOTION.standardRevealMs,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }),
      Animated.timing(hydrateHeader, {
        toValue: 1,
        duration: MOTION.standardRevealMs,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [ingredient.common_name, ingredient.functional_purpose, ingredient.scientific_name, showScientific]);

  const advance = () => {
    if (level === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.timing(animL2, {
        toValue: 1,
        duration: l2RevealDuration,
        easing: isAllergen ? MOTION.l2RevealCurveAllergen : MOTION.l2RevealCurve,
        useNativeDriver: false,
      }).start();
      setLevel(1);
    } else if (level === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.timing(animL3, {
        toValue: 1,
        duration: MOTION.standardRevealMs,
        easing: MOTION.easingStandard,
        useNativeDriver: false,
      }).start();
      setLevel(2);
    } else {
      Animated.parallel([
        Animated.timing(animL2, {
          toValue: 0,
          duration: MOTION.collapseMs,
          easing: MOTION.easingStandard,
          useNativeDriver: false,
        }),
        Animated.timing(animL3, {
          toValue: 0,
          duration: MOTION.collapseMs,
          easing: MOTION.easingStandard,
          useNativeDriver: false,
        }),
      ]).start();
      setLevel(0);
    }
  };

  const l2MaxHeight = animL2.interpolate({ inputRange: [0, 1], outputRange: [0, L2_HEIGHT] });
  const l3MaxHeight = animL3.interpolate({ inputRange: [0, 1], outputRange: [0, L3_HEIGHT] });
  const chevronRotate = animL2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const statusColor = ingredient.allergen_info.is_match
    ? RESEARCH_PALETTE.attention
    : STATUS_COLORS[ingredient.status];

  const hasRisk = ingredient.risk_family !== null;
  const edcMatch = checkEDC(ingredient.scientific_name) ?? checkEDC(ingredient.common_name);
  const showVentilation = isRespiratoryHazard(ingredient.exposure_context, ingredient.risk_family);
  const showSessionSnapshotToast = hasCompoundExposure(ingredient, edcMatch);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const card = (
    <TouchableOpacity
      style={[styles.card, compoundGroup && styles.cardCompound, hasRisk && styles.riskBorder]}
      onPress={advance}
      activeOpacity={0.8}
    >
      {/* ── Level 1: “What” (purpose) first, then identity (name + badge) ── */}
      <Animated.View style={{ opacity: hydratePurpose }}>
        <Text style={[styles.purpose, styles.purposeLead]} numberOfLines={level === 0 ? 1 : undefined}>
          {ingredient.functional_purpose}
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: hydrateHeader }}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={styles.commonName} numberOfLines={1}>
              {showScientific ? ingredient.scientific_name : capitalize(ingredient.common_name)}
            </Text>
            {ingredient.is_ai_generated && (
              <Sparkles size={12} color={RESEARCH_PALETTE.secondary} style={styles.icon} />
            )}
            {edcMatch !== null && (
              <Atom size={12} color={RESEARCH_PALETTE.secondary} style={styles.icon} />
            )}
          </View>
          <View style={styles.right}>
            {ingredient.allergen_info.is_match ? (
              <View style={[styles.badge, { backgroundColor: RESEARCH_PALETTE.attention + '22' }]}>
                <Text style={[styles.badgeText, { color: RESEARCH_PALETTE.attention }]}>
                  Contains {ingredient.allergen_info.alias_detected}
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>
                  {STATUS_LABEL[ingredient.status]}
                </Text>
              </View>
            )}
            <Animated.View style={[styles.chevronWrap, { transform: [{ rotate: chevronRotate }] }]}>
              <ChevronDown size={14} color={RESEARCH_PALETTE.neutral} strokeWidth={2} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      {/* ── Level 2: Science layer — transparency sandwich (magnify | disclosure | vent) ── */}
      <Animated.View style={[styles.section, { maxHeight: l2MaxHeight, opacity: animL2 }]}>
        <View style={styles.fullBleedDividerWrap}>
          <View style={styles.divider} />
        </View>
        {/* Ventilation icon lives inline next to “Exposure Context” (Wind replacement); rail stays spacer. */}
        <TransparencySandwich showVentilation={false}>
          <View>
            <Text style={[styles.sectionLabel, styles.sandwichFirstLabel]}>
              {showScientific ? 'Common name' : 'Scientific Name'}
            </Text>
            <Text style={styles.sectionValue}>
              {showScientific ? ingredient.common_name : ingredient.scientific_name}
            </Text>
            <View style={styles.exposureLabelRow}>
              {showVentilation && (
                <View style={styles.ventIconWrap}>
                  <VentilationSvg />
                </View>
              )}
              <Text
                style={[
                  styles.sectionLabel,
                  styles.exposureLabelText,
                  hasRisk && { color: RESEARCH_PALETTE.attention },
                ]}
              >
                Exposure Context
              </Text>
            </View>
            <Text style={styles.sectionValue}>{ingredient.exposure_context}</Text>
          </View>
        </TransparencySandwich>
      </Animated.View>

      {/* ── Level 3: Deep science — science_note + regulatory flag + literacy ── */}
      <Animated.View style={[styles.section, { maxHeight: l3MaxHeight, opacity: animL3 }]}>
        <View style={styles.l3DividerWrap}>
          <View style={styles.divider} />
        </View>
        <Text style={styles.sectionLabel}>How it works</Text>
        <Text style={styles.sectionValue}>{ingredient.science_note}</Text>
        <Text style={styles.sectionLabel}>Regulated in</Text>
        <Text style={styles.sectionValue}>{ingredient.regulatory_context}</Text>
        {ingredient.literacy_flag ? (
          <>
            <Text style={[styles.sectionLabel, { color: RESEARCH_PALETTE.secondary }]}>
              Did You Know?
            </Text>
            <Text style={styles.sectionValue}>{ingredient.literacy_flag}</Text>
          </>
        ) : null}
        {/* EDC concern note shown at deepest level */}
        {edcMatch !== null && (
          <>
            <Text style={[styles.sectionLabel, { color: RESEARCH_PALETTE.secondary }]}>
              Hormone disruptor concern
            </Text>
            <Text style={styles.sectionValue}>{edcMatch.concern}</Text>
          </>
        )}
      </Animated.View>

      {showSessionSnapshotToast ? <SessionSnapshotToast /> : null}
    </TouchableOpacity>
  );

  return compoundGroup ? <CompoundGroupFrame>{card}</CompoundGroupFrame> : card;
};

const styles = StyleSheet.create({
  card: {
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
    overflow: 'hidden',
  },
  cardCompound: {
    marginVertical: 0,
  },
  riskBorder: {
    borderLeftWidth: 3,
    borderLeftColor: RESEARCH_PALETTE.attention,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  commonName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  icon: {
    marginLeft: 4,
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevronWrap: {
    opacity: 0.55,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  purpose: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  purposeLead: {
    marginTop: 0,
    marginBottom: 8,
  },
  section: {
    overflow: 'hidden',
  },
  fullBleedDividerWrap: {
    marginHorizontal: -16,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  sandwichFirstLabel: {
    marginTop: 0,
  },
  exposureLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  ventIconWrap: {
    marginRight: 6,
  },
  exposureLabelText: {
    marginTop: 0,
    marginBottom: 2,
  },
  l3DividerWrap: {
    marginVertical: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: RESEARCH_PALETTE.neutral,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionValue: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
});
