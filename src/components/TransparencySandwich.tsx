import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { RESEARCH_PALETTE } from '../styles/Theme';

const ICON = 22;

type Props = {
  children: React.ReactNode;
  showVentilation: boolean;
  style?: ViewStyle;
};

/** Left: scrutiny (magnify). Center: disclosure content. Right: ventilation when respiratory hazard. */
export const TransparencySandwich: React.FC<Props> = ({ children, showVentilation, style }) => (
  <View style={[styles.row, style]}>
    <View style={styles.side}>
      <MagnifyingGlassSvg />
    </View>
    <View style={styles.fill}>{children}</View>
    <View style={styles.side}>{showVentilation ? <VentilationSvg /> : <View style={styles.iconSpacer} />}</View>
  </View>
);

export function MagnifyingGlassSvg() {
  const stroke = RESEARCH_PALETTE.neutral;
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" accessibilityLabel="Scientific scrutiny">
      <Circle cx="10" cy="10" r="6.5" fill="none" stroke={stroke} strokeWidth="1.75" />
      <Line x1="14.5" y1="14.5" x2="20" y2="20" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
    </Svg>
  );
}

/** Soft-teal ventilation mark — use instead of legacy Wind icon. */
export function VentilationSvg() {
  const c = RESEARCH_PALETTE.ventilation;
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" accessibilityLabel="Ventilation advisory">
      <Path
        d="M4 12h6M4 8h4.5M4 16h4.5"
        fill="none"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M12.5 9c2 1.2 2 4.8 0 6M14 7.5c3 1.8 3 7.2 0 9M15.5 6c4 2.4 4 9.6 0 12"
        fill="none"
        stroke={c}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  side: {
    width: ICON,
    alignItems: 'center',
    paddingTop: 2,
  },
  fill: {
    flex: 1,
    minWidth: 0,
  },
  iconSpacer: {
    width: ICON,
    height: ICON,
  },
});
