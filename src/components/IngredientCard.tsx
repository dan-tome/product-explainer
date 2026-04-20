import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, AlertTriangle, XCircle, HelpCircle } from 'lucide-react-native';
import { IngredientAnalysis, IngredientStatus } from '../services/analysisService';

interface Props {
  ingredient: IngredientAnalysis;
}

const getStatusColor = (status: IngredientStatus) => {
  switch (status) {
    case 'safe': return '#4caf50';
    case 'warning': return '#ff9800';
    case 'avoid': return '#f44336';
    default: return '#9e9e9e';
  }
};

const getStatusIcon = (status: IngredientStatus) => {
  const size = 24;
  const color = getStatusColor(status);
  switch (status) {
    case 'safe': return <ShieldCheck size={size} color={color} />;
    case 'warning': return <AlertTriangle size={size} color={color} />;
    case 'avoid': return <XCircle size={size} color={color} />;
    default: return <HelpCircle size={size} color={color} />;
  }
};

export const IngredientCard: React.FC<Props> = ({ ingredient }) => {
  const color = getStatusColor(ingredient.status);

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        {getStatusIcon(ingredient.status)}
        <Text style={styles.name}>{ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)}</Text>
      </View>
      <Text style={styles.info}>{ingredient.info}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  info: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
