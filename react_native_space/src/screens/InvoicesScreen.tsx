import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainTabsParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Invoice } from '../types';
import { StatusBadge } from '../components';

type InvoicesScreenNavigationProp = BottomTabNavigationProp<MainTabsParamList, 'Invoices'>;

interface Props {
  navigation: InvoicesScreenNavigationProp;
}

export const InvoicesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const allInvoices = useMemo(() => {
    if (!user?.contracts) return [];
    
    // Collect all invoices from all contracts and sort by due date (descending)
    const invoices: Invoice[] = [];
    user.contracts.forEach(contract => {
      if (contract.invoices) {
        invoices.push(...contract.invoices);
      }
    });

    return invoices.sort((a, b) => 
      new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );
  }, [user]);

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

  const handleInvoicePress = (invoice: Invoice) => {
    // Navigate to details or open link directly?
    // For now, let's navigate to the details screen we created
    navigation.getParent()?.navigate('InvoiceDetails', { invoice });
  };

  if (allInvoices.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="file-document-multiple-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>Sem faturas</Text>
            <Text style={styles.emptyMessage}>
              Você não possui faturas disponíveis no momento.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Minhas Faturas</Text>
        
        {allInvoices.map((invoice) => (
          <Card
            key={invoice.id}
            style={styles.card}
            onPress={() => handleInvoicePress(invoice)}
          >
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text style={styles.invoiceAmount}>
                  {formatCurrency(invoice.amount)}
                </Text>
                <StatusBadge status={invoice.status} />
              </View>
              
              <Text style={styles.invoiceDate}>
                Vence em {formatDate(invoice.dueDate)}
              </Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.contractText}>
                  Contrato: {invoice.contractId}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
        
        <View style={styles.footerSpacing} />
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
    padding: 16,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  invoiceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  contractText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerSpacing: {
    height: 20,
  },
});
