import React, { useEffect, useId, useMemo, useRef } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { RESEARCH_PALETTE } from '../styles/Theme';
import { MOTION } from '../styles/motion';
import type { ViewfinderState } from '../types/viewfinder';

/** Bounds from `onBarcodeScanned` (camera view space). */
export type BarcodeBoundsInput = {
  origin: { x: number; y: number };
  size: { width: number; height: number };
};

const TEAL_GLOW = '#5EEAD4';
const GLOW_MS = 150;
const VIGNETTE_MS = 800;

interface Props {
  state: ViewfinderState;
  layoutW: number;
  layoutH: number;
  /** Barcode bounds in overlay/camera view coordinates */
  barcodeBounds: BarcodeBoundsInput | null;
  ghostLabel: string | null;
  /** Passive scan frame — relative center 0–1 */
  passiveFrame?: { cx: number; cy: number; w: number; h: number };
  style?: ViewStyle;
}

/**
 * Living Canvas: passive slate border, teal radial glow + vignette on lock, OCR purple underline, ghost pill.
 */
export const CameraOverlay: React.FC<Props> = ({
  state,
  layoutW,
  layoutH,
  barcodeBounds,
  ghostLabel,
  passiveFrame = { cx: 0.5, cy: 0.5, w: 0.8, h: 0.4 },
  style,
}) => {
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const vignetteOpacity = useRef(new Animated.Value(0)).current;
  const pillY = useRef(new Animated.Value(0)).current;
  const underline = useRef(new Animated.Value(0)).current;
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const vid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const center = useMemo(() => {
    if (!barcodeBounds || layoutW <= 0 || layoutH <= 0) return { cx: layoutW * 0.5, cy: layoutH * 0.5, r: Math.min(layoutW, layoutH) * 0.35 };
    const { origin, size } = barcodeBounds;
    const cx = origin.x + size.width / 2;
    const cy = origin.y + size.height / 2;
    const r = Math.max(size.width, size.height) * 0.85;
    return { cx, cy, r };
  }, [barcodeBounds, layoutW, layoutH]);

  useEffect(() => {
    if (state === 'barcode_lock') {
      glowOpacity.setValue(0);
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: GLOW_MS,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }).start();
      vignetteOpacity.setValue(0);
      Animated.timing(vignetteOpacity, {
        toValue: 1,
        duration: VIGNETTE_MS,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }).start();
      pillY.setValue(6);
      Animated.spring(pillY, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    } else {
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: GLOW_MS,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }).start();
      Animated.timing(vignetteOpacity, {
        toValue: 0,
        duration: GLOW_MS,
        easing: MOTION.easingStandard,
        useNativeDriver: true,
      }).start();
    }
  }, [state, glowOpacity, vignetteOpacity, pillY]);

  useEffect(() => {
    if (state === 'ocr_synthesis') {
      underline.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(underline, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(underline, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      underline.setValue(0);
    }
  }, [state, underline]);

  const passiveLeft = layoutW * (passiveFrame.cx - passiveFrame.w / 2);
  const passiveTop = layoutH * (passiveFrame.cy - passiveFrame.h / 2);
  const passiveW = layoutW * passiveFrame.w;
  const passiveH = layoutH * passiveFrame.h;

  const pillLeft = barcodeBounds
    ? barcodeBounds.origin.x + barcodeBounds.size.width / 2 - 100
    : center.cx - 100;
  const pillTop = barcodeBounds ? barcodeBounds.origin.y - 44 : center.cy - 80;

  const showGlow = state === 'barcode_lock';
  const showVignette = state === 'barcode_lock';
  const showGhost = state === 'barcode_lock' && ghostLabel;
  const underlineScale = underline.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  if (layoutW <= 0 || layoutH <= 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {/* Passive: slate / purple gradient hairline frame */}
      {state === 'passive_search' && (
        <Svg width={layoutW} height={layoutH} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={RESEARCH_PALETTE.neutral} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={RESEARCH_PALETTE.secondary} stopOpacity={0.65} />
            </SvgLinearGradient>
          </Defs>
          <Rect
            x={passiveLeft + 1}
            y={passiveTop + 1}
            width={passiveW - 2}
            height={passiveH - 2}
            rx={20}
            ry={20}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={2}
          />
        </Svg>
      )}

      {/* Blur-to-focus analogue: edge vignette (attentional blink) */}
      {showVignette && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: vignetteOpacity }]}>
          <Svg width={layoutW} height={layoutH}>
            <Defs>
              <RadialGradient id={vid} cx={`${(center.cx / layoutW) * 100}%`} cy={`${(center.cy / layoutH) * 100}%`} rx="55%" ry="55%">
                <Stop offset="0%" stopColor="rgba(15,23,42,0)" />
                <Stop offset="55%" stopColor="rgba(15,23,42,0.25)" />
                <Stop offset="100%" stopColor="rgba(15,23,42,0.58)" />
              </RadialGradient>
            </Defs>
            <Rect width={layoutW} height={layoutH} fill={`url(#${vid})`} />
          </Svg>
        </Animated.View>
      )}

      {/* Teal radial glow — 30% opacity, 150ms in */}
      {showGlow && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
            },
          ]}
        >
          <Svg width={layoutW} height={layoutH}>
            <Defs>
              <RadialGradient
                id={`${gid}-teal`}
                cx={`${(center.cx / layoutW) * 100}%`}
                cy={`${(center.cy / layoutH) * 100}%`}
                rx={`${(center.r / layoutW) * 100}%`}
                ry={`${(center.r / layoutH) * 100}%`}
              >
                <Stop offset="0%" stopColor={TEAL_GLOW} stopOpacity={1} />
                <Stop offset="45%" stopColor={TEAL_GLOW} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={TEAL_GLOW} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={layoutW} height={layoutH} fill={`url(#${gid}-teal)`} />
          </Svg>
        </Animated.View>
      )}

      {/* OCR synthesis: soft purple underline */}
      {state === 'ocr_synthesis' && (
        <View style={[styles.ocrWrap, { top: passiveTop + passiveH - 4, left: passiveLeft, width: passiveW }]}>
          <Animated.View
            style={[
              styles.ocrLine,
              {
                backgroundColor: RESEARCH_PALETTE.secondary,
                width: passiveW,
                transform: [{ scaleX: underlineScale }],
              },
            ]}
          />
        </View>
      )}

      {/* Ghost pill */}
      {showGhost && ghostLabel ? (
        <Animated.View style={[styles.ghostPill, { left: Math.max(8, pillLeft), top: pillTop, transform: [{ translateY: pillY }] }]}>
          <Text style={styles.ghostText} numberOfLines={2}>
            {ghostLabel}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

export function useOverlayLayout() {
  const [w, setW] = React.useState(0);
  const [h, setH] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setW(width);
    setH(height);
  };
  return { layoutW: w, layoutH: h, onLayout };
}

const styles = StyleSheet.create({
  ocrWrap: {
    position: 'absolute',
    right: 0,
    height: 3,
    alignItems: 'center',
  },
  ocrLine: {
    height: 3,
    borderRadius: 2,
    opacity: 0.85,
  },
  ghostPill: {
    position: 'absolute',
    maxWidth: 200,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,77,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  ghostText: {
    fontSize: 12,
    fontWeight: '600',
    color: RESEARCH_PALETTE.neutral,
    textAlign: 'center',
  },
});
