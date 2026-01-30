import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Svg, Circle, G } from 'react-native-svg';

const { width } = Dimensions.get('window');
const GAUGE_SIZE = width * 0.7;
const STROKE_WIDTH = 20;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const SpeedTestScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [testing, setTesting] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [progress, setSpeedProgress] = useState(0); // 0 to 1
  const [phase, setPhase] = useState<'idle' | 'download' | 'complete'>('idle');

  const handleGoBack = () => {
    navigation.goBack();
  };

  const runTest = async () => {
    setTesting(true);
    setPhase('download');
    setSpeed(0);
    setSpeedProgress(0);

    // Simulação de teste de velocidade nativo
    // Em uma implementação real, baixaríamos um arquivo grande e mediríamos o tempo
    for (let i = 0; i <= 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const randomFluctuation = Math.random() * 5;
      const currentSpeed = Math.min(100, i + randomFluctuation);
      setSpeed(Math.round(currentSpeed));
      setSpeedProgress(currentSpeed / 100);
    }

    setPhase('complete');
    setTesting(false);
  };

  const strokeDashoffset = CIRCUMFERENCE - progress * (CIRCUMFERENCE * 0.75);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="speedometer" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Teste de Velocidade</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.gaugeContainer}>
          <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}>
            <G rotation="-225" origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}>
              {/* Background Circle */}
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={RADIUS}
                stroke={colors.border}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE * 0.75} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
              />
              {/* Progress Circle */}
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={RADIUS}
                stroke={colors.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE * 0.75} ${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </G>
          </Svg>
          
          <View style={styles.speedTextContainer}>
            <Text style={styles.speedValue}>{speed}</Text>
            <Text style={styles.speedUnit}>Mbps</Text>
            <Text style={styles.phaseText}>
              {phase === 'idle' ? 'Pronto' : phase === 'download' ? 'Baixando...' : 'Concluído'}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="arrow-down-circle" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>Download</Text>
            <Text style={styles.infoValue}>{speed} Mbps</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="arrow-up-circle" size={24} color="#10b981" />
            <Text style={styles.infoLabel}>Upload</Text>
            <Text style={styles.infoValue}>{phase === 'complete' ? Math.round(speed * 0.6) : '--'} Mbps</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="timer-outline" size={24} color="#f59e0b" />
            <Text style={styles.infoLabel}>Ping</Text>
            <Text style={styles.infoValue}>{phase === 'complete' ? '12 ms' : '--'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.testButton, testing && styles.disabledButton]} 
          onPress={runTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.testButtonText}>
              {phase === 'complete' ? 'Testar Novamente' : 'Iniciar Teste'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    gaugeContainer: {
      width: GAUGE_SIZE,
      height: GAUGE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
    },
    speedTextContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    speedValue: {
      fontSize: 64,
      fontWeight: 'bold',
      color: colors.text,
    },
    speedUnit: {
      fontSize: 18,
      color: colors.textSecondary,
      marginTop: -10,
    },
    phaseText: {
      fontSize: 14,
      color: colors.primary,
      marginTop: 10,
      fontWeight: '600',
    },
    infoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 40,
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderBottomColor: colors.border,
    },
    infoItem: {
      alignItems: 'center',
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 4,
    },
    testButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 40,
      paddingVertical: 16,
      borderRadius: 30,
      width: '100%',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    disabledButton: {
      opacity: 0.7,
    },
    testButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
