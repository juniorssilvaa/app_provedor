import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { CustomHeader, PlanCard } from '../components';
import { mockPlans } from '../services/mockData';

type PlansScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Plans'>;

interface Props {
  navigation: PlansScreenNavigationProp;
}

export const PlansScreen: React.FC<Props> = ({ navigation }) => {
  const handlePlanPress = (planId: string) => {
    console.log('Plan selected:', planId);
    // In real app, would navigate to plan details or contact form
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title="Planos" showBack={navigation.canGoBack()} />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.subtitle}>
          Conheça nossos planos de internet fibra óptica
        </Text>
        
        {mockPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onPress={() => handlePlanPress(plan.id)}
          />
        ))}
        
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Precisa de ajuda para escolher?</Text>
          <Text style={styles.contactText}>
            Entre em contato conosco e fale com um de nossos consultores
          </Text>
          <Button
            mode="outlined"
            onPress={() => {}}
            style={styles.contactButton}
            textColor={colors.primary}
          >
            Falar com consultor
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  contactContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  contactButton: {
    borderColor: colors.primary,
  },
});