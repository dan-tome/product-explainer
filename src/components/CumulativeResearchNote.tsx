import React, { useId } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { CumulativeResearchNote as CumulativeNoteModel } from '../types/universalBridge';
import { RESEARCH_PALETTE } from '../styles/Theme';

interface Props {
  note: CumulativeNoteModel;
}

/**
 * Tier 2 nudge — teal → purple hairline (aggregate story, not alarm).
 */
export const CumulativeResearchNote: React.FC<Props> = ({ note }) => {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  return (
    <View style={styles.outer} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={RESEARCH_PALETTE.attention} stopOpacity={0.95} />
              <Stop offset="100%" stopColor={RESEARCH_PALETTE.secondary} stopOpacity={0.95} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0.5}
            y={0.5}
            width={size.w - 1}
            height={size.h - 1}
            rx={14}
            ry={14}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={1.5}
          />
        </Svg>
      )}
      <View style={styles.inner}>
        <Text style={styles.kicker}>Aggregate signal</Text>
        <Text style={styles.title}>{note.title}</Text>
        <Text style={styles.body}>{note.body}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'visible',
  },
  inner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    margin: 2,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: RESEARCH_PALETTE.neutral,
    opacity: 0.8,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: RESEARCH_PALETTE.neutral,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#455A64',
  },
});
