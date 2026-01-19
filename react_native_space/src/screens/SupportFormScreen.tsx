import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { sgpService } from '../services/sgpService';
import { CustomHeader } from '../components/CustomHeader';
import { SGPTipoOcorrencia } from '../types';

export const SupportFormScreen = () => {
  const navigation = useNavigation();
  const { user, activeContract } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  
  const [types, setTypes] = useState<SGPTipoOcorrencia[]>([]);
  const [selectedType, setSelectedType] = useState<SGPTipoOcorrencia | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [motivo, setMotivo] = useState('');
  const [telefone, setTelefone] = useState('');

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    if (!user?.cpfCnpj) return;
    try {
      setLoadingTypes(true);
      const data = await sgpService.getTiposOcorrencia(user.cpfCnpj);
      setTypes(data);
      // Set default type if exists (e.g., 'Suporte - Sem Acesso' which is code 1)
      const defaultType = data.find(t => t.codigo === 1);
      if (defaultType) {
        setSelectedType(defaultType);
      } else if (data.length > 0) {
        setSelectedType(data[0]);
      }
    } catch (error) {
      console.error('Error fetching types:', error);
      Alert.alert('Erro', 'Não foi possível carregar os tipos de ocorrência.');
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleSend = async () => {
    if (!selectedType) {
      Alert.alert('Atenção', 'Selecione um tipo de ocorrência.');
      return;
    }

    if (!motivo.trim()) {
      Alert.alert('Atenção', 'Por favor, descreva o motivo do chamado.');
      return;
    }

    if (!activeContract) {
      Alert.alert('Erro', 'Contrato não identificado.');
      return;
    }

    setLoading(true);
    try {
      const finalContent = telefone ? `${motivo}\nTelefone: ${telefone}` : motivo;
      
      const response = await sgpService.abrirChamado(activeContract.id, selectedType.codigo, finalContent);
      
      if (response.status === 1) {
        Alert.alert(
          'Sucesso',
          `Chamado aberto com sucesso!\nProtocolo: ${response.protocolo}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Erro', response.msg || 'Não foi possível abrir o chamado.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Ocorreu um erro ao abrir o chamado.');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeItem = ({ item }: { item: SGPTipoOcorrencia }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedType(item);
        setModalVisible(false);
      }}
    >
      <Text style={[
        styles.modalItemText, 
        selectedType?.codigo === item.codigo && styles.modalItemTextSelected
      ]}>
        {item.descricao}
      </Text>
      {selectedType?.codigo === item.codigo && (
        <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="SUPORTE" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons name="headset" size={60} color="#00BCD4" />
          <Text style={styles.title}>PRECISA DE AJUDA?</Text>
          <Text style={styles.subtitle}>
            Caso esteja com problemas para navegar na internet, abra um chamado.
          </Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity 
            style={styles.pickerContainer}
            onPress={() => setModalVisible(true)}
            disabled={loadingTypes}
          >
            {loadingTypes ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.pickerText} numberOfLines={1}>
                  {selectedType ? selectedType.descricao : 'Selecione o tipo...'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSecondary} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="(  ) ____-____"
              placeholderTextColor={colors.textSecondary}
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Motivo"
              placeholderTextColor={colors.textSecondary}
              value={motivo}
              onChangeText={setMotivo}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSend}
            disabled={loading || loadingTypes}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ABRIR CHAMADO</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Type Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecione o Tipo</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={types}
                  keyExtractor={(item) => item.codigo.toString()}
                  renderItem={renderTypeItem}
                  style={styles.modalList}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  pickerText: {
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalList: {
    width: '100%',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});


