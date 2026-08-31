import React from 'react';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';

export default function Icon({ name, size = 24, color = '#1d1b20', filled = false }) {
  const sw = Math.max(1.5, size / 12);
  const s = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none'
  };

  const vb = '0 0 24 24';
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...s} />
          <Path d="M9 22V12h6v10" {...s} />
        </Svg>);

    case 'arrow-left':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M19 12H5" {...s} />
          <Path d="M12 19l-7-7 7-7" {...s} />
        </Svg>);

    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M9 18l6-6-6-6" {...s} />
        </Svg>);

    case 'check':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M20 6L9 17l-5-5" {...s} />
        </Svg>);

    case 'x':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Line x1="18" y1="6" x2="6" y2="18" {...s} />
          <Line x1="6" y1="6" x2="18" y2="18" {...s} />
        </Svg>);

    case 'menu':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Line x1="3" y1="12" x2="21" y2="12" {...s} />
          <Line x1="3" y1="6" x2="21" y2="6" {...s} />
          <Line x1="3" y1="18" x2="21" y2="18" {...s} />
        </Svg>);

    case 'bell':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...s} />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...s} />
        </Svg>);

    case 'star':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none" />
          
        </Svg>);

    case 'star-filled':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            stroke={color}
            strokeWidth={sw}
            fill={color} />
          
        </Svg>);

    case 'heart':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            stroke={color}
            strokeWidth={sw}
            fill={filled ? color : 'none'} />
          
        </Svg>);

    case 'send':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M22 2L11 13" {...s} />
          <Path d="M22 2L15 22 11 13 2 9l20-7z" {...s} />
        </Svg>);

    case 'settings':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="12" cy="12" r="3" {...s} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...s} />
        </Svg>);

    case 'shield':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s} />
        </Svg>);

    case 'globe':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Path d="M2 12h20" {...s} />
          <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s} />
        </Svg>);

    case 'user':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...s} />
          <Circle cx="12" cy="7" r="4" {...s} />
        </Svg>);

    case 'users':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s} />
          <Circle cx="9" cy="7" r="4" {...s} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...s} />
        </Svg>);

    case 'credit-card':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" {...s} />
          <Line x1="1" y1="10" x2="23" y2="10" {...s} />
        </Svg>);

    case 'file-text':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s} />
          <Path d="M14 2v6h6" {...s} />
          <Line x1="16" y1="13" x2="8" y2="13" {...s} />
          <Line x1="16" y1="17" x2="8" y2="17" {...s} />
        </Svg>);

    case 'book-open':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...s} />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...s} />
        </Svg>);

    case 'message-circle':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...s} />
        </Svg>);

    case 'log-out':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...s} />
          <Path d="M16 17l5-5-5-5" {...s} />
          <Line x1="21" y1="12" x2="9" y2="12" {...s} />
        </Svg>);

    case 'rotate-cw':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M23 4v6h-6" {...s} />
          <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" {...s} />
        </Svg>);

    case 'crown':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M12 2L8 8 2 6l2 12h16l2-12-6 2-4-6z" {...s} />
          <Line x1="5" y1="18" x2="19" y2="18" {...s} />
        </Svg>);

    case 'phone-off':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 16.29 8.76 15.62 8 14.89m-3.5-3.07A19.79 19.79 0 0 1 1.43 3.2 2 2 0 0 1 3.41 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.39 8.91" {...s} />
          <Line x1="23" y1="1" x2="1" y2="23" {...s} />
        </Svg>);

    case 'wallet':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" {...s} />
          <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" {...s} />
          <Circle cx="16" cy="13" r="1" fill={color} stroke="none" />
        </Svg>);

    case 'edit-2':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...s} />
        </Svg>);

    case 'connect':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 16.29 7.76 14.59 6.5 12.55a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 5.41 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91A16 16 0 0 0 16 16l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" {...s} />
        </Svg>);

    case 'rooms':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Rect x="3" y="3" width="7" height="7" {...s} />
          <Rect x="14" y="3" width="7" height="7" {...s} />
          <Rect x="14" y="14" width="7" height="7" {...s} />
          <Rect x="3" y="14" width="7" height="7" {...s} />
        </Svg>);

    case 'phone':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 16.29 7.76 14.59 6.5 12.55a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 5.41 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91A16 16 0 0 0 16 16l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" {...s} fill={filled ? color : 'none'} />
        </Svg>);

    case 'headphones':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M3 18v-6a9 9 0 0 1 18 0v6" {...s} />
          <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" {...s} />
          <Path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" {...s} />
        </Svg>);

    case 'lock':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...s} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...s} />
        </Svg>);

    case 'list':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Line x1="8" y1="6" x2="21" y2="6" {...s} />
          <Line x1="8" y1="12" x2="21" y2="12" {...s} />
          <Line x1="8" y1="18" x2="21" y2="18" {...s} />
          <Line x1="3" y1="6" x2="3.01" y2="6" {...s} />
          <Line x1="3" y1="12" x2="3.01" y2="12" {...s} />
          <Line x1="3" y1="18" x2="3.01" y2="18" {...s} />
        </Svg>);

    case 'gift':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M20 12v10H4V12" {...s} />
          <Path d="M22 7H2v5h20V7z" {...s} />
          <Path d="M12 22V7" {...s} />
          <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" {...s} />
          <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" {...s} />
        </Svg>);

    case 'zap':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" {...s} fill={filled ? color : 'none'} />
        </Svg>);

    case 'mic':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" {...s} />
          <Path d="M19 10v2a7 7 0 0 1-14 0v-2" {...s} />
          <Line x1="12" y1="19" x2="12" y2="23" {...s} />
          <Line x1="8" y1="23" x2="16" y2="23" {...s} />
        </Svg>);

    case 'search':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="11" cy="11" r="8" {...s} />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" {...s} />
        </Svg>);

    case 'volume-2':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M11 5L6 9H2v6h4l5 4V5z" {...s} fill={filled ? color : 'none'} />
          <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" {...s} />
          <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" {...s} />
        </Svg>);

    case 'plus':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Line x1="12" y1="5" x2="12" y2="19" {...s} />
          <Line x1="5" y1="12" x2="19" y2="12" {...s} />
        </Svg>);

    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" {...s} />
          <Line x1="16" y1="2" x2="16" y2="6" {...s} />
          <Line x1="8" y1="2" x2="8" y2="6" {...s} />
          <Line x1="3" y1="10" x2="21" y2="10" {...s} />
        </Svg>);

    case 'more-vertical':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="12" cy="5" r="1" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="1" fill={color} stroke="none" />
          <Circle cx="12" cy="19" r="1" fill={color} stroke="none" />
        </Svg>);

    case 'volume':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M11 5L6 9H2v6h4l5 4V5z" {...s} />
          <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" {...s} />
        </Svg>);

    case 'filter':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" {...s} />
        </Svg>);

    case 'location':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" {...s} />
          <Circle cx="12" cy="10" r="3" {...s} />
        </Svg>);

    case 'verified':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s} fill={color} />
          <Path d="M9 12l2 2 4-4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>);

    case 'discover':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" {...s} />
        </Svg>);

    case 'undo':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M1 4v6h6" {...s} />
          <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" {...s} />
        </Svg>);

    case 'close':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Line x1="18" y1="6" x2="6" y2="18" {...s} />
          <Line x1="6" y1="6" x2="18" y2="18" {...s} />
        </Svg>);

    case 'keypad':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Rect x="5" y="5" width="4" height="4" {...s} />
          <Rect x="10" y="5" width="4" height="4" {...s} />
          <Rect x="15" y="5" width="4" height="4" {...s} />
          <Rect x="5" y="10" width="4" height="4" {...s} />
          <Rect x="10" y="10" width="4" height="4" {...s} />
          <Rect x="15" y="10" width="4" height="4" {...s} />
          <Rect x="5" y="15" width="4" height="4" {...s} />
          <Rect x="10" y="15" width="4" height="4" {...s} />
          <Rect x="15" y="15" width="4" height="4" {...s} />
        </Svg>);

    case 'chat':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...s} />
        </Svg>);

    case 'apple':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M12 20.94c1.88 0 3.05-1.07 4.07-1.07 1.06 0 2.02.94 3.82.94 2.15 0 3.34-1.83 4.11-3.3 1.6-3.03.11-5.74-1.01-6.84-1.14-1.12-2.73-1.61-4.14-1.61-1.39 0-2.8.54-3.85.54-1.04 0-2.61-.59-4.22-.59-2.12 0-4.08 1.15-5.17 3.04-2.18 3.79-.56 9.4 1.55 12.48 1.02 1.5 2.37 3.38 4.05 3.38.16 0 .32-.01.48-.03z" {...s} fill={color} stroke="none" />
          <Path d="M12.03 5.42c.89-1.08 1.49-2.58 1.33-4.08-1.29.05-2.85.86-3.78 1.94-.83.95-1.57 2.48-1.4 3.95 1.44.11 2.94-.71 3.85-1.81z" {...s} fill={color} stroke="none" />
        </Svg>);

    case 'pineapple':
      return (
        <Svg width={size} height={size * 1.25} viewBox="0 0 800 1000" fill="none">
          <Path d="M400 20 C360 120 360 200 400 280 C440 200 440 120 400 20Z" fill="#4BAA43" />
          <Path d="M250 80 C300 180 340 260 395 340 C390 220 340 130 250 80Z" fill="#4BAA43" />
          <Path d="M550 80 C460 130 410 220 405 340 C460 260 500 180 550 80Z" fill="#4BAA43" />
          <Path d="M120 240 C220 220 310 260 395 360 C280 340 200 310 120 240Z" fill="#4BAA43" />
          <Path d="M680 240 C600 310 520 340 405 360 C490 260 580 220 680 240Z" fill="#4BAA43" />
          <Path d="M220 360 C300 390 350 450 395 530 C300 500 250 450 220 360Z" fill="#4BAA43" />
          <Path d="M580 360 C550 450 500 500 405 530 C450 450 500 390 580 360Z" fill="#4BAA43" />
          <Path d="M400 880 C260 740 160 620 160 500 C160 400 230 340 320 340 C370 340 410 370 400 430 C390 370 430 340 480 340 C570 340 640 400 640 500 C640 620 540 740 400 880" fill="#F7A11A" />
          <Path d="M220 450L540 780" stroke="white" strokeWidth="14" />
          <Path d="M180 540L500 870" stroke="white" strokeWidth="14" />
          <Path d="M280 370L600 700" stroke="white" strokeWidth="14" />
          <Path d="M340 330L650 640" stroke="white" strokeWidth="14" />
          <Path d="M580 450L260 780" stroke="white" strokeWidth="14" />
          <Path d="M620 540L300 870" stroke="white" strokeWidth="14" />
          <Path d="M520 370L200 700" stroke="white" strokeWidth="14" />
          <Path d="M460 330L150 640" stroke="white" strokeWidth="14" />
        </Svg>);

    case 'video':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M23 7l-7 5 7 5V7z" {...s} fill={filled ? color : 'none'} />
          <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" {...s} />
        </Svg>);

    case 'video-off':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" {...s} />
          <Line x1="1" y1="1" x2="23" y2="23" {...s} />
        </Svg>);

    case 'mic-off':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Line x1="1" y1="1" x2="23" y2="23" {...s} />
          <Path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" {...s} />
          <Path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" {...s} />
          <Line x1="12" y1="19" x2="12" y2="23" {...s} />
          <Line x1="8" y1="23" x2="16" y2="23" {...s} />
        </Svg>);

    case 'speaker':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Rect x="4" y="2" width="16" height="20" rx="2" ry="2" {...s} />
          <Circle cx="12" cy="14" r="4" {...s} />
          <Line x1="12" y1="6" x2="12.01" y2="6" {...s} />
        </Svg>);

    case 'flip-camera':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M20 7h-3.5l-1.5-2h-6L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" {...s} />
          <Path d="M9 13a3 3 0 1 0 3-3" {...s} />
          <Path d="M9 10l-1.5 1.5L9 13" {...s} />
        </Svg>);

    case 'coins':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="8" cy="8" r="6" {...s} />
          <Path d="M18.09 10.37A6 6 0 1 1 10.34 18" {...s} />
          <Path d="M7 6h1v4" {...s} />
          <Line x1="16.71" y1="13.88" x2="17.5" y2="14.5" {...s} />
        </Svg>);

    case 'share':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="18" cy="5" r="3" {...s} />
          <Circle cx="6" cy="12" r="3" {...s} />
          <Circle cx="18" cy="19" r="3" {...s} />
          <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" {...s} />
          <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" {...s} />
        </Svg>);

    case 'shuffle':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M16 3h5v5" {...s} />
          <Path d="M4 20L21 3" {...s} />
          <Path d="M21 16v5h-5" {...s} />
          <Path d="M15 15l5.1 5.1" {...s} />
          <Path d="M4 4l5 5" {...s} />
        </Svg>);

    case 'eye-off':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" {...s} />
          <Line x1="1" y1="1" x2="23" y2="23" {...s} />
        </Svg>);

    case 'alert-triangle':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...s} />
          <Line x1="12" y1="9" x2="12" y2="13" {...s} />
          <Line x1="12" y1="17" x2="12.01" y2="17" {...s} />
        </Svg>);

    case 'arrow-right':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Path d="M5 12h14" {...s} />
          <Path d="M12 5l7 7-7 7" {...s} />
        </Svg>);

    case 'slash':
      return (
        <Svg width={size} height={size} viewBox={vb}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Line x1="4.93" y1="4.93" x2="19.07" y2="19.07" {...s} />
        </Svg>);

    default:
      return <Svg width={size} height={size} viewBox={vb} />;
  }
}