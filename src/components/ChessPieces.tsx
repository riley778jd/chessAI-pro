import React from 'react';
import type { BoardThemeId, PieceStyleId } from '../types/chess';

export interface BoardThemeConfig {
  id: BoardThemeId;
  name: string;
  light: string;
  dark: string;
  highlightFrom: string;
  highlightTo: string;
  coordLight: string;
  coordDark: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Emerald Slate',
    light: '#E2E8E4',
    dark: '#4B7B65',
    highlightFrom: 'rgba(16, 185, 129, 0.34)',
    highlightTo: 'rgba(16, 185, 129, 0.50)',
    coordLight: '#4B7B65',
    coordDark: '#E2E8E4',
  },
  tournament: {
    id: 'tournament',
    name: 'Tournament Green',
    light: '#EEEED2',
    dark: '#769656',
    highlightFrom: 'rgba(246, 246, 105, 0.45)',
    highlightTo: 'rgba(186, 202, 43, 0.58)',
    coordLight: '#769656',
    coordDark: '#EEEED2',
  },
  walnut: {
    id: 'walnut',
    name: 'Championship Walnut',
    light: '#F0D9B5',
    dark: '#B58863',
    highlightFrom: 'rgba(205, 210, 106, 0.48)',
    highlightTo: 'rgba(170, 162, 58, 0.58)',
    coordLight: '#B58863',
    coordDark: '#F0D9B5',
  },
  cobalt: {
    id: 'cobalt',
    name: 'Midnight Cobalt',
    light: '#DCE3EA',
    dark: '#577399',
    highlightFrom: 'rgba(56, 189, 248, 0.35)',
    highlightTo: 'rgba(14, 165, 233, 0.48)',
    coordLight: '#577399',
    coordDark: '#DCE3EA',
  },
  marble: {
    id: 'marble',
    name: 'Graphite Marble',
    light: '#D8DCE0',
    dark: '#69727D',
    highlightFrom: 'rgba(16, 185, 129, 0.32)',
    highlightTo: 'rgba(16, 185, 129, 0.46)',
    coordLight: '#69727D',
    coordDark: '#D8DCE0',
  },
};

export const PIECE_STYLES: { id: PieceStyleId; name: string }[] = [
  { id: 'staunton', name: 'Classic Staunton' },
  { id: 'neo', name: 'Neo Precision' },
  { id: 'editorial', name: 'Editorial Serif' },
  { id: 'mono', name: 'Minimalist Mono' },
];

interface PieceSvgProps {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  styleId: PieceStyleId;
  className?: string;
}

export const ChessPieceSvg: React.FC<PieceSvgProps> = ({
  type,
  color,
  styleId,
  className = 'w-full h-full',
}) => {
  const isWhite = color === 'w';

  const palette = (() => {
    switch (styleId) {
      case 'neo':
        return {
          fill: isWhite ? '#FFFFFF' : '#1E242B',
          stroke: isWhite ? '#232931' : '#0B0D10',
          detail: isWhite ? '#232931' : '#D5DCE4',
          strokeWidth: 1.6,
        };
      case 'editorial':
        return {
          fill: isWhite ? '#FAF6EE' : '#2D2520',
          stroke: isWhite ? '#3E332B' : '#14100D',
          detail: isWhite ? '#3E332B' : '#E8DFD1',
          strokeWidth: 1.5,
        };
      case 'mono':
        return {
          fill: isWhite ? '#F3F5F7' : '#262B33',
          stroke: isWhite ? '#12151A' : '#12151A',
          detail: isWhite ? '#12151A' : '#A9B2C0',
          strokeWidth: 1.8,
        };
      case 'staunton':
      default:
        return {
          fill: isWhite ? '#FCFAF5' : '#24272B',
          stroke: isWhite ? '#1C1E22' : '#0E1012',
          detail: isWhite ? '#1C1E22' : '#ECEEF2',
          strokeWidth: 1.5,
        };
    }
  })();

  if (styleId === 'mono') {
    return (
      <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
        {type === 'p' && (
          <g fill={palette.fill} stroke={palette.stroke} strokeWidth={palette.strokeWidth} strokeLinejoin="round">
            <circle cx="22.5" cy="14" r="5" />
            <path d="M16.5 34h12l-2-12h-8l-2 12z" />
            <rect x="12" y="34" width="21" height="4.5" rx="1.5" />
          </g>
        )}
        {type === 'r' && (
          <g fill={palette.fill} stroke={palette.stroke} strokeWidth={palette.strokeWidth} strokeLinejoin="round">
            <path d="M12 10h4v4h4v-4h5v4h4v-4h4v8l-3 3v12l3 2v4H12v-4l3-2V21l-3-3v-8z" />
          </g>
        )}
        {type === 'n' && (
          <g fill={palette.fill} stroke={palette.stroke} strokeWidth={palette.strokeWidth} strokeLinejoin="round">
            <path d="M13 38.5v-4l3-3 2-8-4.5 2-2-4 7-9 4.5-2.5 2 2.5c5.5 1 9 6 9 13v13.5H13z" />
            <circle cx="19.5" cy="17.5" r="1.2" fill={palette.detail} stroke="none" />
          </g>
        )}
        {type === 'b' && (
          <g fill={palette.fill} stroke={palette.stroke} strokeWidth={palette.strokeWidth} strokeLinejoin="round">
            <circle cx="22.5" cy="9" r="2.2" />
            <path d="M15 32c0-7 3-13 7.5-18 4.5 5 7.5 11 7.5 18H15z" />
            <rect x="12" y="34" width="21" height="4.5" rx="1.5" />
            <path d="M19.5 23h6M22.5 20v6" stroke={palette.detail} strokeWidth="1.6" />
          </g>
        )}
        {type === 'q' && (
          <g fill={palette.fill} stroke={palette.stroke} strokeWidth={palette.strokeWidth} strokeLinejoin="round">
            <path d="M9 14l5 16h17l5-16-7 7-6.5-10-6.5 10-7-7z" />
            <rect x="12" y="32" width="21" height="6" rx="1.5" />
          </g>
        )}
        {type === 'k' && (
          <g fill={palette.fill} stroke={palette.stroke} strokeWidth={palette.strokeWidth} strokeLinejoin="round">
            <path d="M22.5 7v7M19 10.5h7" stroke={palette.stroke} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M12 31l-2-10c0-4 4-6 12.5-6S35 17 35 21l-2 10H12z" />
            <rect x="12" y="33" width="21" height="5.5" rx="1.5" />
          </g>
        )}
      </svg>
    );
  }

  // Standard high-craft Staunton / Neo / Editorial vector paths
  return (
    <svg
      viewBox="0 0 45 45"
      className={`${className} drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]`}
      aria-hidden="true"
    >
      {type === 'p' && (
        <g
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={palette.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
        </g>
      )}

      {type === 'r' && (
        <g
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={palette.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
          <path d="M34 14l-3 3H14l-3-3" />
          <path d="M31 17v12.5H14V17" />
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
          <path d="M11 14h23" fill="none" />
          {!isWhite && (
            <>
              <path d="M14 17h17" stroke={palette.detail} strokeWidth="1" />
              <path d="M14 29.5h17" stroke={palette.detail} strokeWidth="1" />
              <path d="M12.5 32h20" stroke={palette.detail} strokeWidth="1" />
            </>
          )}
        </g>
      )}

      {type === 'n' && (
        <g
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={palette.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
          <circle cx="15" cy="15.5" r="1" fill={palette.detail} stroke="none" />
          <path
            d="M9.5 25.5a0.5 0.5 0 1 1-1 0 0.5 0.5 0 1 1 1 0z"
            fill={palette.detail}
            stroke="none"
          />
        </g>
      )}

      {type === 'b' && (
        <g
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={palette.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <circle cx="22.5" cy="8" r="2.5" />
          <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke={palette.detail} fill="none" />
        </g>
      )}

      {type === 'q' && (
        <g
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={palette.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="12" r="2.2" />
          <circle cx="14" cy="9" r="2.2" />
          <circle cx="22.5" cy="8" r="2.2" />
          <circle cx="31" cy="9" r="2.2" />
          <circle cx="39" cy="12" r="2.2" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
          <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" stroke={palette.detail} fill="none" />
        </g>
      )}

      {type === 'k' && (
        <g
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={palette.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22.5 11.63V6M20 8h5" stroke={palette.stroke} fill="none" />
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
          <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke={palette.detail} fill="none" />
        </g>
      )}
    </svg>
  );
};
