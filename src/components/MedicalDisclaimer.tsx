import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RESEARCH_PALETTE } from '../styles/Theme';

export const DISCLAIMER_TITLE = 'For learning, not medical advice';
export const DISCLAIMER_BODY =
  'HealthScan explains what ingredients are and why they are used. It cannot tell you what is safe for you, and AI-generated explanations can be wrong. Always check the label, and ask a pharmacist, doctor or allergist about allergies or health concerns.';

/** Persistent footer on every results screen. Calm tone, research palette, never alarming. */
export const MedicalDisclaimer: React.FC = () => (
  <View
    style={styles.wrap}
    accessible
    accessibilityRole="text"
    accessibilityLabel={`${DISCLAIMER_TITLE}. ${DISCLAIMER_BODY}`}
    testID="medical-disclaimer"
  >
    <Text style={styles.title}>{DISCLAIMER_TITLE}</Text>
    <Text style={styles.body}>{DISCLAIMER_BODY}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CFD8DC',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: RESEARCH_PALETTE.neutral,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    color: '#546E7A',
  },
});
