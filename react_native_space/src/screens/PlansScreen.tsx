import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList, Plan } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { CustomHeader, PlanCard } from '../components';
import { sgpService } from '../services/sgpService';

type PlansScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Plans'>;

interface Props {
  navigation: PlansScreenNavigationProp;
}

export const PlansScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerPhone, setProviderPhone] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [plansData, configData] = await Promise.all([
        sgpService.getPlans(),
        sgpService.getAppConfig()
      ]);
      setPlans(plansData);
      if (configData && configData.provider_phone) {
        setProviderPhone(configData.provider_phone);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    if (providerPhone) {
      const cleanPhone = providerPhone.replace(/\D/g, '');
      const message = `Olá! Tenho interesse no plano ${plan.name} de R$ ${plan.price.toFixed(2).replace('.', ',')}. Poderia me ajudar?`;
      const url = `whatsapp://send?phone=55${cleanPhone}&text=${encodeURIComponent(message)}`;
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback para link web se o app não estiver instalado
          Linking.openURL(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`);
        }
      });
    } else {
      console.log('Provider phone not found');
    }
  };

  const handleContactSupport = () => {
    if (providerPhone) {
      const cleanPhone = providerPhone.replace(/\D/g, '');
      const message = 'Olá! Gostaria de tirar algumas dúvidas sobre os planos de internet.';
      Linking.openURL(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title="Planos" showBack={navigation.canGoBack()} />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.subtitle}>
          Conheça nossos planos de internet fibra óptica
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando planos...</Text>
          </View>
        ) : plans.length > 0 ? (
          plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={() => handleSelectPlan(plan)}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum plano disponível no momento.</Text>
          </View>
        )}
        
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Precisa de ajuda para escolher?</Text>
          <Text style={styles.contactText}>
            Entre em contato conosco e fale com um de nossos consultores
          </Text>
          <Button
            mode="outlined"
            onPress={handleContactSupport}
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
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
    color: colors.text,
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