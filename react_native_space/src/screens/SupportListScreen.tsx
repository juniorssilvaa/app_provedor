import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { sgpService } from '../services/sgpService';
import { SGPChamado } from '../types';
import { CustomHeader } from '../components/CustomHeader';

export const SupportListScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { user, activeContract } = useAuth();
  const [chamados, setChamados] = useState<SGPChamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChamados = async (isRefreshing = false) => {
    if (!activeContract || !user) return;
    if (!isRefreshing) setLoading(true);
    try {
      const data = await sgpService.getChamados(activeContract.id, user.cpfCnpj);
      setChamados(data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os chamados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChamados();
    }, [activeContract])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChamados(true);
  };

  const renderItem = ({ item }: { item: SGPChamado }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.protocolo}>Protocolo: {item.oc_protocolo}</Text>
          <View style={[styles.badge, { backgroundColor: item.oc_status === 0 ? colors.warning : colors.success }]}>
            <Text style={styles.badgeText}>{item.oc_status_descricao}</Text>
          </View>
        </View>
        <Text style={styles.tipo}>{item.oc_tipo_descricao}</Text>
        <Text style={styles.conteudo}>{item.oc_conteudo}</Text>
        <Text style={styles.data}>{item.oc_data_cadastro}</Text>
      </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="SUPORTE" />
      <View style={styles.content}>
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <FlatList
            data={chamados}
            renderItem={renderItem}
            keyExtractor={(item) => item.oc_protocolo}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum chamado aberto.</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
        
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('SupportForm')}
        >
          <MaterialCommunityIcons name="plus" size={30} color="#fff" />
          <Text style={styles.fabText}>NOVO CHAMADO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  protocolo: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tipo: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conteudo: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  data: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});


