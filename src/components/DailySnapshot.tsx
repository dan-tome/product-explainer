import React, { useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Cloud, CloudSun, Sun } from 'lucide-react-native';
import { Ingredient, IngredientStatus } from '../types/product';
import { RESEARCH_PALETTE } from '../styles/Theme';
import { OUTLOOK_COPY, buildSegments, headlineForTone } from './dailySnapshotMetrics';

interface Props {
  ingredients: Ingredient[];
}

export const DailySnapshot: React.FC<Props> = ({ ingredients }) => {
  const [cardWidth, setCardWidth] = useState(0);
  const gradId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { tone, segments, summaryLine } = useMemo(() => buildSegments(ingredients), [ingredients]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setCardWidth(width);
  };

  const Icon = tone === 'clear' ? Sun : tone === 'bright' ? CloudSun : Cloud;
  const iconColor =
    tone === 'clear'
      ? 'rgba(61, 90, 254, 0.45)'
      : tone === 'bright'
        ? 'rgba(124, 77, 255, 0.4)'
        : 'rgba(48, 63, 159, 0.38)';

  return (
    <View style={styles.outer} onLayout={onLayout}>
      <View style={styles.card}>
        {cardWidth > 0 && (
          <Svg width={cardWidth} height={172} style={StyleSheet.absoluteFillObject}>
            <Defs>
              <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#EDE7F6" stopOpacity={1} />
                <Stop offset="48%" stopColor="#E3F2FD" stopOpacity={1} />
                <Stop offset="100%" stopColor="#E0F7FA" stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={cardWidth} height={172} fill={`url(#${gradId})`} />
          </Svg>
        )}

        <View style={styles.inner}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.kicker}>Daily snapshot</Text>
              <Text style={styles.headline}>{headlineForTone(tone)}</Text>
            </View>
            <Icon size={36} color={iconColor} strokeWidth={1.25} />
          </View>

          <Text style={styles.summary}>{summaryLine}</Text>

          <Text style={styles.stripLabel}>Ingredients across this scan</Text>
          <View style={styles.strip}>
            {segments.map((seg, i) => (
              <View
                key={i}
                style={[styles.segment, { backgroundColor: seg.color }]}
                accessibilityLabel={`Segment ${i + 1}, ${seg.label}`}
              />
            ))}
          </View>
          <Text style={styles.stripHint}>{OUTLOOK_COPY[tone]}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 172,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48, 63, 159, 0.08)',
  },
  inner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: RESEARCH_PALETTE.neutral,
    opacity: 0.75,
    marginBottom: 4,
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#263238',
    letterSpacing: -0.3,
    maxWidth: '78%',
  },
  summary: {
    marginTop: 10,
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
  },
  stripLabel: {
    marginTop: 16,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#78909C',
  },
  strip: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    opacity: 0.92,
  },
  stripHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#90A4AE',
    fontStyle: 'italic',
  },
});
