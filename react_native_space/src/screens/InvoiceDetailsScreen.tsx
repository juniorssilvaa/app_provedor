import React from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../types';
import { CustomHeader, PixIcon } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

type InvoiceDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InvoiceDetails'>;
type InvoiceDetailsScreenRouteProp = RouteProp<RootStackParamList, 'InvoiceDetails'>;

interface Props {
  navigation: InvoiceDetailsScreenNavigationProp;
  route: InvoiceDetailsScreenRouteProp;
}

export const InvoiceDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { invoice } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const handleCopyPix = async () => {
    const pixKey = invoice.codigoPix || invoice.codigopix;
    if (pixKey && pixKey.trim().length > 0) {
      await Clipboard.setStringAsync(pixKey.trim());
      Alert.alert('Sucesso', 'Chave PIX copiada para a área de transferência!');
    } else {
      Alert.alert('Aviso', 'Chave PIX indisponível para esta fatura.');
    }
  };

  const handleCopyBarcode = async () => {
    if (invoice.linhaDigitavel && invoice.linhaDigitavel.trim().length > 0) {
      await Clipboard.setStringAsync(invoice.linhaDigitavel.trim());
      Alert.alert('Sucesso', 'Código de barras copiado para a área de transferência!');
    } else {
      Alert.alert('Aviso', 'Código de barras indisponível para esta fatura.');
    }
  };

  const handleOpenBoleto = async () => {
    const url = invoice.link || invoice.linkCobranca;
    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link do boleto.');
      }
    } else {
      Alert.alert('Aviso', 'Link do boleto indisponível.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'overdue':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paga';
      case 'overdue':
        return 'Vencida';
      default:
        return 'Pendente';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader title="Detalhes da Fatura" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Fatura #{invoice.numeroDocumento || invoice.id}</Text>
          <Text style={styles.amount}>{formatCurrency(invoice.amount)}</Text>
          <Text style={[styles.status, { color: getStatusColor(invoice.status) }]}>
            {getStatusLabel(invoice.status)}
          </Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vencimento</Text>
            <Text style={styles.rowValue}>{formatDate(invoice.dueDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Contrato</Text>
            <Text style={styles.rowValue}>{invoice.contractId}</Text>
          </View>
        </View>

        {invoice.status !== 'paid' && (
          <View style={styles.actionsContainer}>
            {(invoice.codigoPix || invoice.codigopix) && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.primary }]}
                onPress={handleCopyPix}
              >
                <PixIcon size={24} color={colors.white} />
              </TouchableOpacity>
            )}
            {invoice.linhaDigitavel && (
              <Button
                mode="contained"
                onPress={handleCopyBarcode}
                style={styles.button}
                buttonColor={colors.primary}
                icon="barcode"
              >
                Copiar Código de Barras
              </Button>
            )}
            {(invoice.link || invoice.linkCobranca) && (
              <Button
                mode="outlined"
                onPress={handleOpenBoleto}
                style={[styles.button, styles.outlineButton]}
                textColor={colors.primary}
                icon="file-pdf-box"
              >
                Abrir Boleto PDF
              </Button>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    amount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.white,
      marginBottom: 8,
    },
    status: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      marginVertical: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    rowLabel: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    rowValue: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '500',
    },
    actionsContainer: {
      gap: 12,
    },
    iconButton: {
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    button: {
      marginBottom: 12,
      borderRadius: 8,
    },
    outlineButton: {
      borderColor: colors.primary,
      borderWidth: 1,
    },
  });
