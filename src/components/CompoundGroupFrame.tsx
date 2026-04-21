import React, { useId, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RESEARCH_PALETTE } from '../styles/Theme';

interface Props {
  children: React.ReactNode;
}

/**
 * Teal → purple hairline linking synergy pathway cards (compound group).
 */
export const CompoundGroupFrame: React.FC<Props> = ({ children }) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id={gid} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={RESEARCH_PALETTE.attention} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={RESEARCH_PALETTE.secondary} stopOpacity={0.9} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0.5}
            y={0.5}
            width={size.w - 1}
            height={size.h - 1}
            rx={13}
            ry={13}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={2}
          />
        </Svg>
      )}
      <View style={styles.inner}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 4,
    borderRadius: 14,
  },
  inner: {
    margin: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
