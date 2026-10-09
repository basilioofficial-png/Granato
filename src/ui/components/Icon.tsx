import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Icons copied from docs/design/granato-mockup.html (24×24 grid, 2px stroke).

export type IconName =
  | 'timer'
  | 'list'
  | 'chart'
  | 'user'
  | 'swap'
  | 'stop'
  | 'play'
  | 'right'
  | 'left'
  | 'close'
  | 'plus'
  | 'search';

interface IconProps {
  readonly name: IconName;
  readonly color: ColorValue;
  readonly size?: number;
}

export function Icon({ name, color, size = 24 }: IconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'timer' && (
        <>
          <Circle cx={12} cy={13} r={8} {...stroke} />
          <Path d="M12 9v4l2.5 2.5" {...stroke} />
          <Path d="M9.5 2.5h5" {...stroke} />
        </>
      )}
      {name === 'list' && (
        <>
          <Path d="M4 6h16" {...stroke} />
          <Path d="M4 12h10" {...stroke} />
          <Path d="M4 18h13" {...stroke} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Path d="M5 20v-8" {...stroke} />
          <Path d="M12 20V5" {...stroke} />
          <Path d="M19 20v-5" {...stroke} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx={12} cy={8} r={4} {...stroke} />
          <Path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" {...stroke} />
        </>
      )}
      {name === 'swap' && (
        <>
          <Path d="M7 7h13l-4-4" {...stroke} />
          <Path d="M17 17H4l4 4" {...stroke} />
        </>
      )}
      {name === 'stop' && <Rect x={6} y={6} width={12} height={12} rx={2.5} {...stroke} />}
      {name === 'play' && (
        <Path
          d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"
          fill={color}
        />
      )}
      {name === 'right' && <Path d="M9 5l7 7-7 7" {...stroke} />}
      {name === 'left' && <Path d="M15 5l-7 7 7 7" {...stroke} />}
      {name === 'close' && (
        <>
          <Path d="M6 6l12 12" {...stroke} />
          <Path d="M18 6L6 18" {...stroke} />
        </>
      )}
      {name === 'plus' && (
        <>
          <Path d="M12 5v14" {...stroke} />
          <Path d="M5 12h14" {...stroke} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={6.5} {...stroke} />
          <Path d="M16 16l4.5 4.5" {...stroke} />
        </>
      )}
    </Svg>
  );
}
