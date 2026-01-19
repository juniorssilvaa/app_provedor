import React, { useMemo, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Text } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, G } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

export interface UsageDataPoint {
  date: string;
  downloadGB: number;
  uploadGB: number;
  label: string;
}

interface UsageChartProps {
  data: UsageDataPoint[];
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 200 });
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };

  const onLayout = (event: LayoutChangeEvent) => {
    setDimensions({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  };

  const { width, height } = dimensions;
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], maxValue: 10 };

    let max = 0;
    data.forEach(p => {
      if (p.downloadGB > max) max = p.downloadGB;
      if (p.uploadGB > max) max = p.uploadGB;
    });
    
    // Add some headroom
    const maxValue = Math.ceil(max * 1.1) || 10;

    const points = data.map((p, i) => {
      const x = padding.left + (i * graphWidth) / (data.length - 1 || 1);
      const yDownload = padding.top + graphHeight - (p.downloadGB / maxValue) * graphHeight;
      const yUpload = padding.top + graphHeight - (p.uploadGB / maxValue) * graphHeight;
      return { x, yDownload, yUpload, ...p };
    });

    return { points, maxValue };
  }, [data, width, height, graphWidth, graphHeight]);

  // Simple line path generator
  const createPath = (points: any[], key: 'yDownload' | 'yUpload') => {
    if (points.length === 0) return '';
    const first = points[0];
    let path = `M ${first.x} ${first[key]}`;
    points.forEach((p, i) => {
      if (i === 0) return;
      // Simple line for now, can be improved to bezier
      path += ` L ${p.x} ${p[key]}`;
    });
    return path;
  };

  // Create area path
  const createArea = (points: any[], key: 'yDownload' | 'yUpload') => {
    if (points.length === 0) return '';
    let path = createPath(points, key);
    const last = points[points.length - 1];
    const first = points[0];
    path += ` L ${last.x} ${height - padding.bottom} L ${first.x} ${height - padding.bottom} Z`;
    return path;
  };

  // Smooth curve generator (Catmull-Rom)
  const createSmoothPath = (points: any[], key: 'yDownload' | 'yUpload') => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0][key]}`;

    let path = `M ${points[0].x} ${points[0][key]}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1[key] + (p2[key] - p0[key]) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2[key] - (p3[key] - p1[key]) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2[key]}`;
    }
    return path;
  };

  const createSmoothArea = (points: any[], key: 'yDownload' | 'yUpload') => {
    if (points.length === 0) return '';
    let path = createSmoothPath(points, key);
    const last = points[points.length - 1];
    const first = points[0];
    path += ` L ${last.x} ${height - padding.bottom} L ${first.x} ${height - padding.bottom} Z`;
    return path;
  };

  const downloadPath = createSmoothPath(chartData.points, 'yDownload');
  const downloadArea = createSmoothArea(chartData.points, 'yDownload');
  const uploadPath = createSmoothPath(chartData.points, 'yUpload');
  const uploadArea = createSmoothArea(chartData.points, 'yUpload');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const y = padding.top + graphHeight * (1 - t);
    const value = (chartData.maxValue * t).toFixed(1);
    return { y, value };
  });

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Download</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.text }]} />
          <Text style={styles.legendText}>Upload</Text>
        </View>
      </View>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.0" />
          </LinearGradient>
          <LinearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.text} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.text} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid */}
        {gridLines.map((line, i) => (
          <G key={i}>
            <Line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke={colors.border}
              strokeDasharray="5, 5"
            />
          </G>
        ))}

        {/* Download Area & Line */}
        <Path d={downloadArea} fill="url(#downloadGradient)" />
        <Path d={downloadPath} stroke={colors.primary} strokeWidth="2" fill="none" />

        {/* Upload Area & Line */}
        <Path d={uploadArea} fill="url(#uploadGradient)" />
        <Path d={uploadPath} stroke={colors.text} strokeWidth="2" fill="none" />

        {/* Dots */}
        {chartData.points.map((p, i) => (
          <G key={i}>
            <Circle cx={p.x} cy={p.yDownload} r="4" fill={colors.primary} />
            <Circle cx={p.x} cy={p.yUpload} r="4" fill={colors.text} />
          </G>
        ))}
      </Svg>
      
      {/* Y-Axis Labels Overlay */}
      <View style={styles.yAxisOverlay}>
        {gridLines.map((line, i) => (
          <Text key={i} style={[styles.axisLabel, { top: line.y - 8 }]}>
            {line.value} GB
          </Text>
        ))}
      </View>

      {/* X-Axis Labels Overlay */}
      <View style={styles.xAxisOverlay}>
         {chartData.points.map((p, i) => (
            <Text key={i} style={[styles.xAxisLabel, { left: p.x - 15 }]}>
              {p.label}
            </Text>
         ))}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    height: 300,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 10,
    marginVertical: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  yAxisOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  axisLabel: {
    position: 'absolute',
    left: 4,
    fontSize: 10,
    color: colors.textSecondary,
  },
  xAxisOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    height: 20,
  },
  xAxisLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 10,
    color: colors.textSecondary,
    width: 30,
    textAlign: 'center',
  },
});
