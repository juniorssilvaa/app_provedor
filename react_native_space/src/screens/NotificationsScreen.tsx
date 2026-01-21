import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import { CustomHeader } from '../components/CustomHeader';

interface Warning {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  whatsapp_btn?: string | null;
  sticky: boolean;
  show_home: boolean;
  created_at: string;
}

export const NotificationsScreen = () => {
  const { colors } = useTheme();
  const { user, activeContract } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWarnings = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('provider_token', config.apiToken || '');
      if (user?.cpfCnpj) params.append('cpf', user.cpfCnpj);
      if (activeContract?.id) params.append('contract_id', activeContract.id.toString());

      const response = await fetch(`${config.apiBaseUrl}public/warnings/?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWarnings(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('provider_token', config.apiToken || '');
        if (user?.cpfCnpj) params.append('cpf', user.cpfCnpj);
        if (activeContract?.id) params.append('contract_id', activeContract.id.toString());

        const response = await fetch(`${config.apiBaseUrl}public/warnings/?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok && isMounted) {
          const data = await response.json();
          setWarnings(data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.cpfCnpj, activeContract?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWarnings(true);
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'success': return { icon: 'check-circle', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'warning': return { icon: 'alert', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'critical': return { icon: 'alert-circle', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { icon: 'information', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
  };

  const renderItem = ({ item }: { item: Warning }) => {
    const { icon, color, bg } = getIconAndColor(item.type);
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        </View>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>
        {item.whatsapp_btn && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: color }]}
            onPress={() => Linking.openURL(`whatsapp://send?phone=${item.whatsapp_btn}`)}
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Falar no WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="NOTIFICAÇÕES" />
      <View style={styles.content}>
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={warnings}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="bell-off-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma notificação no momento.</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
