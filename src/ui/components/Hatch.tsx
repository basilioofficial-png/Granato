import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

/** Fills its parent with the diagonal hatch the design uses for unknown time. */
export function Hatch({ color }: { color: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <Pattern id="hatch" patternUnits="userSpaceOnUse" width={5} height={5} patternTransform="rotate(45)">
              <Line x1={0} y1={0} x2={0} y2={5} stroke={color} strokeWidth={2} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill="url(#hatch)" />
        </Svg>
      ) : null}
    </View>
  );
}
