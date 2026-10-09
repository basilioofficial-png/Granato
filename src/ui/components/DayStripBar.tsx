import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import type { DayStrip } from '@/domain/timeline';
import type { Interval } from '@/domain/types';
import { useTheme } from '@/ui/theme/useTheme';
import { fonts } from '@/ui/theme/tokens';

interface DayStripBarProps {
  readonly strip: DayStrip;
  readonly day: Interval;
  /** Color for each category id (the branch color). */
  readonly colorOf: (categoryId: string) => string;
  readonly height?: number;
}

const HOUR_LABELS = ['00', '06', '12', '18', '24'];

/** "Seeds of the day": 00–24 bar, tracked time in category colors, unknown time hatched. */
export function DayStripBar({ strip, day, colorOf, height = 14 }: DayStripBarProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const dayLength = day.end - day.start;
  const x = (t: number) => ((t - day.start) / dayLength) * width;

  return (
    <View>
      <View
        style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.track }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <Pattern
                id="hatch"
                patternUnits="userSpaceOnUse"
                width={5}
                height={5}
                patternTransform="rotate(45)">
                <Line x1={0} y1={0} x2={0} y2={5} stroke={colors.muted} strokeWidth={2} />
              </Pattern>
            </Defs>
            {strip.segments.map((segment) => {
              const left = x(segment.interval.start);
              const segmentWidth = Math.max(x(segment.interval.end) - left, 1);
              return (
                <Rect
                  key={`${segment.interval.start}-${segment.categoryId ?? 'unknown'}`}
                  x={left}
                  y={0}
                  width={segmentWidth}
                  height={height}
                  fill={segment.categoryId ? colorOf(segment.categoryId) : 'url(#hatch)'}
                />
              );
            })}
            {/* Thin gaps between seeds, as in the design. */}
            {strip.segments.map((segment) => (
              <Rect
                key={`gap-${segment.interval.start}`}
                x={x(segment.interval.end) - 1.5}
                y={0}
                width={1.5}
                height={height}
                fill={colors.track}
              />
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.labels}>
        {HOUR_LABELS.map((label) => (
          <Text key={label} style={[styles.label, { color: colors.text2 }]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  labels: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
});
