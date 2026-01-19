import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { CustomHeader } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { sgpService } from '../services/sgpService';
import { UsageChart, UsageDataPoint } from '../components/UsageChart';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface UsageReportItem extends UsageDataPoint {
  duration?: string | null;
}

type UsageScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Usage'>;

interface Props {
  navigation: UsageScreenNavigationProp;
}

export const UsageScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const activeContract = user?.contracts?.[0];
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  const months = useMemo(
    () => [
      { id: 1, label: 'Janeiro' },
      { id: 2, label: 'Fevereiro' },
      { id: 3, label: 'Março' },
      { id: 4, label: 'Abril' },
      { id: 5, label: 'Maio' },
      { id: 6, label: 'Junho' },
      { id: 7, label: 'Julho' },
      { id: 8, label: 'Agosto' },
      { id: 9, label: 'Setembro' },
      { id: 10, label: 'Outubro' },
      { id: 11, label: 'Novembro' },
      { id: 12, label: 'Dezembro' },
    ],
    []
  );

  const load = async () => {
    if (!user || !activeContract?.servicePassword || !activeContract?.id) return;
    setLoading(true);
    try {
      const res = await sgpService.extratoUso(user.cpfCnpj, activeContract.id, activeContract.servicePassword, year, month);
      setData(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, activeContract?.id]);

  const points = useMemo((): UsageReportItem[] => {
    const list = Array.isArray(data?.list) ? data.list : [];
    // Sort by date just in case
    list.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
    
    return list.map((item: any) => {
      const dateObj = new Date(item.data);
      const label = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      return {
        date: item.data,
        label,
        downloadGB: item.download ? item.download / (1024 * 1024 * 1024) : 0,
        uploadGB: item.upload ? item.upload / (1024 * 1024 * 1024) : 0,
        duration: item.tempo_conectado || null,
      };
    });
  }, [data]);

  const formatGB = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' GB';

  const renderPicker = () => (
    <Modal visible={pickerVisible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecione o Período</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerColumn}>
              <Text style={styles.columnHeader}>Ano</Text>
              {years.map(y => (
                <TouchableOpacity key={y} onPress={() => setYear(y)} style={[styles.pickerItem, year === y && styles.pickerItemActive]}>
                  <Text style={[styles.pickerItemText, year === y && styles.pickerItemTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.pickerColumn}>
              <Text style={styles.columnHeader}>Mês</Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {months.map(m => (
                  <TouchableOpacity key={m.id} onPress={() => setMonth(m.id)} style={[styles.pickerItem, month === m.id && styles.pickerItemActive]}>
                    <Text style={[styles.pickerItemText, month === m.id && styles.pickerItemTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => setPickerVisible(false)}>
            <Text style={styles.closeButtonText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title="CONSUMO" />
      {renderPicker()}
      
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Month Selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MÊS E ANO</Text>
        </View>
        <TouchableOpacity style={styles.selectorButton} onPress={() => setPickerVisible(true)}>
          <Text style={styles.selectorText}>
            {months.find(m => m.id === month)?.label.substring(0, 3).toUpperCase()}/{year}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Chart */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>GRÁFICO</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ margin: 20 }} />
        ) : (
          <UsageChart data={points} />
        )}

        {/* List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RELATÓRIO</Text>
        </View>

        {points.map((item, index) => (
          <View key={index} style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.dateText}>
                {new Date(item.date).toLocaleDateString('pt-BR')} 
                {item.duration ? ` - ${item.duration}` : ''}
              </Text>
              <MaterialCommunityIcons name="chart-bar" size={24} color={colors.primary} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="download" size={20} color={colors.white} />
                <Text style={styles.statValue}>{formatGB(item.downloadGB)}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="upload" size={20} color={colors.white} />
                <Text style={styles.statValue}>{formatGB(item.uploadGB)}</Text>
              </View>
            </View>
          </View>
        ))}

        {!loading && points.length === 0 && (
          <Text style={styles.emptyText}>Nenhum dado encontrado para este período.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F222B', // Dark background
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1, // Visual style similar to lines in image? Or just lines on side.
    // The image has lines on sides of text. Let's simplify with just text for now.
    textAlign: 'center',
  },
  selectorButton: {
    backgroundColor: '#2A2E3D',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportCard: {
    backgroundColor: '#2A2E3D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2E3D',
    width: '90%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  columnHeader: {
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  pickerItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 5,
    backgroundColor: '#1F222B',
  },
  pickerItemActive: {
    backgroundColor: colors.primary,
  },
  pickerItemText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pickerItemTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
