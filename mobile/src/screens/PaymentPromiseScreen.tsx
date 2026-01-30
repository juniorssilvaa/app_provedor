import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { sgpService } from '../services/sgpService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PaymentPromise'>;
};

export const PaymentPromiseScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Use the first contract if multiple exist, or handle logic for selection if needed
  const activeContract = user?.contracts?.[0];

  const handlePromise = async () => {
    if (!activeContract?.id) {
      Alert.alert('Erro', 'Nenhum contrato encontrado.');
      return;
    }

    setLoading(true);
    try {
      const result = await sgpService.liberacaoPromessa(activeContract.id);
      
      // Check for status 1 (number) or "1" (string)
      if (Number(result.status) === 1) {
        Alert.alert(
          'Sucesso',
          `Desbloqueio realizado com sucesso!\n\nLiberado por: ${result.liberado_dias} dias`,
          [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack() 
            }
          ]
        );
      } else {
        Alert.alert('Atenção', result.msg || 'Não foi possível realizar o desbloqueio.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Ocorreu um erro ao tentar realizar a liberação. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    // Placeholder for terms link
    Linking.openURL('https://google.com'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REATIVAÇÃO</Text>
        <TouchableOpacity style={styles.helpButton}>
           <MaterialCommunityIcons name="help-circle-outline" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="alert-circle" size={120} color="#F44336" />
        </View>

        <Text style={styles.title}>CONTRATO SUSPENSO!</Text>
        
        <Text style={styles.description}>
          Você pode reativar seu contrato prometendo que irá pagar a fatura atrasada o mais rápido possível, clicando no botão abaixo.
        </Text>

        <View style={styles.spacer} />

        <Button
          mode="contained"
          onPress={handlePromise}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          REATIVAR
        </Button>

        <TouchableOpacity onPress={openTerms} style={styles.termsButton}>
          <Text style={styles.termsText}>LEIA OS TERMOS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  helpButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800', // Orange color matching the screenshot title
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    backgroundColor: 'rgba(244, 67, 54, 0.1)', // Light red background
    borderRadius: 100,
    padding: 4, // Adjust based on visual preference
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: '90%',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  spacer: {
    flex: 0.1,
  },
  button: {
    width: '100%',
    backgroundColor: '#FF9800', // Orange button
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  termsButton: {
    padding: 12,
  },
  termsText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
