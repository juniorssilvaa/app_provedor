import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Share,
} from 'react-native';
import { Text, Avatar, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getNetworkInfo, ensureLocationPermission } from '../utils/networkUtils';
import { config } from '../config';
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

export const AIChatScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `${getGreeting()}, ${user?.name?.split(' ')[0] || 'cliente'}! Sou seu Assistente Técnico inteligente. Posso analisar seu Wi-Fi ou ajudar com dúvidas financeiras. Deseja que eu analise sua conexão agora?`,
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const collectAndSendTelemetry = async () => {
    try {
      setIsAnalyzing(true);
      const permission = await ensureLocationPermission();
      if (permission !== 'granted') {
        Alert.alert('Aviso', 'Para uma análise precisa do Wi-Fi, precisamos de permissão de localização.');
      }

      const netInfo = await getNetworkInfo();
      
      const telemetryPayload = {
        provider_token: config.apiToken,
        cpf: user?.cpfCnpj,
        ssid: netInfo.ssid,
        wifi_dbm: netInfo.strength,
        band: netInfo.frequency ? (netInfo.frequency > 4000 ? '5GHz' : '2.4GHz') : null,
        link_speed: netInfo.linkSpeed,
        latency: netInfo.latency,
        packet_loss: netInfo.packetLoss,
        jitter: netInfo.jitter,
        network_type: netInfo.type,
      };

      await axios.post(`${config.apiBaseUrl}telemetry/network/`, telemetryPayload);
      
      setIsAnalyzing(false);
      return true;
    } catch (error) {
      console.error('Erro na telemetria:', error);
      setIsAnalyzing(false);
      return false;
    }
  };

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    Keyboard.dismiss();

    try {
      // Se for a primeira interação ou o usuário pedir análise, coleta telemetria
      if (messages.length < 3 || text.toLowerCase().includes('analis') || text.toLowerCase().includes('wi-fi')) {
        await collectAndSendTelemetry();
      }

      const response = await axios.post(`${config.apiBaseUrl}ai/chat/`, {
        provider_token: config.apiToken,
        cpf: user?.cpfCnpj,
        message: text.trim(),
        session_id: sessionId,
      });

      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      // Se o backend enviou múltiplas mensagens curtas, adiciona uma por uma
      if (response.data.messages && Array.isArray(response.data.messages)) {
        for (const msgText of response.data.messages) {
          const aiMessage: Message = {
            id: Math.random().toString(36).substr(2, 9),
            text: msgText,
            role: 'assistant',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
          // Pequeno delay entre mensagens para parecer mais humano
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.response,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Erro no chat IA:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, tive um problema de conexão. Poderia tentar novamente?',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'Pix' | 'Boleto') => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Sucesso', `Código ${type} copiado para a área de transferência!`);
  };

  const extractPixCode = (text: string) => {
    // Regex para capturar o código Pix (geralmente começa com 000201)
    // O SGP envia códigos Pix longos que contêm barras, pontos e outros caracteres.
    // Adicionada a barra '/' que estava faltando no set de caracteres.
    const pixMatch = text.match(/000201[a-zA-Z0-9.\-_$#@%&*\/]{80,}/);
    return pixMatch ? pixMatch[0] : null;
  };

  const extractBarcode = (text: string) => {
    // Regex para Linha Digitável (Boleto) - Geralmente 47 ou 48 dígitos com pontos e espaços
    const barcodeMatch = text.match(/\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14}/);
    if (barcodeMatch) return barcodeMatch[0];
    
    // Fallback para códigos de barras numéricos puros (44-48 dígitos)
    const numericMatch = text.match(/\d{44,48}/);
    return numericMatch ? numericMatch[0] : null;
  };

  const extractPdfLink = (text: string) => {
    const pdfMatch = text.match(/https?:\/\/[^\s]+\.pdf[^\s]*/i);
    return pdfMatch ? pdfMatch[0] : null;
  };

  const renderMessage = (message: Message) => {
    const isAssistant = message.role === 'assistant';
    const pixCode = isAssistant ? extractPixCode(message.text) : null;
    const barcode = isAssistant ? extractBarcode(message.text) : null;
    const pdfLink = isAssistant ? extractPdfLink(message.text) : null;

    // Limpa o texto da IA para não mostrar o código Pix longo no balão de conversa
    let cleanText = message.text;
    if (pixCode) {
      cleanText = cleanText.replace(pixCode, '').trim();
      // Remove possíveis prefixos como "Código Pix:" ou "Chave Pix:" que ficam sobrando
      cleanText = cleanText.replace(/(?:Código|Chave|Copia e cola)\s*Pix:\s*$/i, '').trim();
      if (!cleanText) cleanText = "Aqui está o seu QR Code para pagamento:";
    }

    return (
      <View
        key={message.id}
        style={[
          styles.messageWrapper,
          isAssistant ? styles.assistantWrapper : styles.userWrapper,
        ]}
      >
        {isAssistant && (
          <Avatar.Icon
            size={32}
            icon="robot"
            style={styles.assistantAvatar}
            color="#FFFFFF"
          />
        )}
        <View style={styles.bubbleContainer}>
          <View
            style={[
              styles.messageBubble,
              isAssistant ? styles.assistantBubble : styles.userBubble,
            ]}
          >
            <Text style={[styles.messageText, !isAssistant && { color: '#FFFFFF' }]}>
              {cleanText}
            </Text>
            <Text style={[styles.timestamp, !isAssistant && { color: 'rgba(255,255,255,0.7)' }]}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Card de Pagamento Dinâmico (PIX e Boleto) */}
          {(pixCode || barcode || pdfLink) && (
            <Card style={styles.paymentCard}>
              <Card.Content style={styles.paymentContent}>
                <Text style={styles.paymentTitle}>Opções de Pagamento</Text>
                
                {pixCode && (
                  <View style={styles.paymentSection}>
                    <Text style={styles.sectionLabel}>PIX - Copia e Cola</Text>
                    <View style={styles.qrContainer}>
                      <QRCode value={pixCode} size={140} />
                    </View>
                    <Button 
                      mode="contained" 
                      onPress={() => copyToClipboard(pixCode, 'Pix')}
                      style={styles.actionButton}
                      icon="content-copy"
                      buttonColor="#25D366"
                    >
                      Copiar Chave Pix
                    </Button>
                  </View>
                )}

                {barcode && (
                  <View style={[styles.paymentSection, pixCode && { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
                    <Text style={styles.sectionLabel}>Boleto - Linha Digitável</Text>
                    <Button 
                      mode="outlined" 
                      onPress={() => copyToClipboard(barcode, 'Boleto')}
                      style={styles.actionButton}
                      icon="barcode"
                      textColor={colors.primary}
                    >
                      Copiar Código de Barras
                    </Button>
                  </View>
                )}

                {pdfLink && (
                  <Button 
                    mode="text" 
                    onPress={() => Share.share({ url: pdfLink, message: 'Aqui está o boleto em PDF' })}
                    style={{ marginTop: 8 }}
                    icon="file-pdf-box"
                    textColor="#e11d48"
                  >
                    Compartilhar PDF
                  </Button>
                )}
              </Card.Content>
            </Card>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="robot" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Assistente Técnico e Financeiro</Text>
        </View>
        <View style={styles.headerRight}>
          {isAnalyzing && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContent}
          contentContainerStyle={styles.scrollContent}
        >
          {messages.map(renderMessage)}
          {isTyping && (
            <View style={[styles.messageWrapper, styles.assistantWrapper]}>
              <Avatar.Icon
                size={32}
                icon="robot"
                style={styles.assistantAvatar}
                color="#FFFFFF"
              />
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Digite sua dúvida..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
          >
            <MaterialCommunityIcons name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -40,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 8,
    },
    headerRight: {
      width: 40,
      alignItems: 'center',
    },
    chatContent: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
    },
    messageWrapper: {
      flexDirection: 'row',
      marginBottom: 16,
      maxWidth: '85%',
    },
    assistantWrapper: {
      alignSelf: 'flex-start',
    },
    userWrapper: {
      alignSelf: 'flex-end',
      flexDirection: 'row-reverse',
    },
    assistantAvatar: {
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    bubbleContainer: {
      flex: 1,
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    paymentCard: {
      marginTop: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
    },
    paymentContent: {
      paddingVertical: 12,
    },
    paymentTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
      color: colors.text,
      textAlign: 'center',
    },
    paymentSection: {
      alignItems: 'center',
    },
    sectionLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    qrContainer: {
      padding: 10,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      marginBottom: 12,
    },
    actionButton: {
      width: '100%',
      borderRadius: 8,
    },
    assistantBubble: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 4,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderTopRightRadius: 4,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    timestamp: {
      fontSize: 10,
      marginTop: 4,
      alignSelf: 'flex-end',
      color: colors.textSecondary,
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      marginRight: 8,
      fontSize: 16,
      maxHeight: 100,
      color: colors.text,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
