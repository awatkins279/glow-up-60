import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Line as SvgLine, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme';
import { Empty } from './ui';

export interface Point {
  x: number; // e.g. program day
  y: number;
  label?: string;
}

export function LineChart({
  points,
  color = colors.accent,
  height = 160,
  unit = '',
  emptyText = 'No data yet',
  minY,
  maxY,
}: {
  points: Point[];
  color?: string;
  height?: number;
  unit?: string;
  emptyText?: string;
  minY?: number;
  maxY?: number;
}) {
  const [width, setWidth] = useState(0);
  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 22;

  if (points.length === 0) {
    return (
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Empty emoji="📈" title={emptyText} />
      </View>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs, x0 + 1);
  let y0 = minY ?? Math.min(...ys);
  let y1 = maxY ?? Math.max(...ys);
  if (y1 === y0) {
    y0 -= 1;
    y1 += 1;
  }
  const padY = (y1 - y0) * 0.1;
  y0 = minY ?? y0 - padY;
  y1 = maxY ?? y1 + padY;

  const w = Math.max(0, width - padL - padR);
  const h = height - padT - padB;
  const sx = (x: number) => padL + ((x - x0) / (x1 - x0)) * w;
  const sy = (y: number) => padT + (1 - (y - y0) / (y1 - y0)) * h;

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const d = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L ${sx(sorted[sorted.length - 1].x).toFixed(1)} ${(padT + h).toFixed(1)} L ${sx(sorted[0].x).toFixed(1)} ${(padT + h).toFixed(1)} Z`;
  const ticks = [y0, (y0 + y1) / 2, y1];
  const last = sorted[sorted.length - 1];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map((t, i) => (
            <SvgLine key={i} x1={padL} x2={width - padR} y1={sy(t)} y2={sy(t)} stroke={colors.border} strokeWidth={1} />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`t${i}`} x={padL - 6} y={sy(t) + 4} fill={colors.text3} fontSize={10} textAnchor="end">
              {formatTick(t)}
            </SvgText>
          ))}
          <SvgText x={sx(x0)} y={height - 6} fill={colors.text3} fontSize={10} textAnchor="start">
            Day {x0}
          </SvgText>
          <SvgText x={sx(x1)} y={height - 6} fill={colors.text3} fontSize={10} textAnchor="end">
            Day {x1}
          </SvgText>
          {sorted.length > 1 ? <Path d={area} fill="url(#g)" /> : null}
          <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {sorted.map((p) => (
            <Circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={colors.bg} stroke={color} strokeWidth={2} />
          ))}
          <Circle cx={sx(last.x)} cy={sy(last.y)} r={5} fill={color} />
        </Svg>
      ) : null}
      <Text style={{ position: 'absolute', right: 12, top: 0, color, fontWeight: '900', fontSize: 13 }}>
        {formatTick(last.y)}
        {unit}
      </Text>
    </View>
  );
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
