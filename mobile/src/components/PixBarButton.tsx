import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { PixIcon } from './PixIcon';

interface Props {
  label?: string;
  onPress: () => void;
  height?: number;
  backgroundColor: string;
  iconColor?: string;
}

export function PixBarButton({
  label = 'Pagar com PIX',
  onPress,
  height = 44,
  backgroundColor,
  iconColor = '#2196F3',
}: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.container, { height }]}>
        <Svg width="100%" height="100%">
          <Rect x="0" y="0" width="100%" height="100%" rx={height / 2} fill={backgroundColor} />
        </Svg>
        <View style={styles.contentRow}>
          <PixIcon size={22} color={iconColor} />
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    flex: 1,
  },
  contentRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
