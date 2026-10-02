import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './useTheme';
import { StarField } from './StarField';
import { useLocale } from '../../shared/i18n/useLocale';
import type { ThemeMode } from './skyTime';
import type { Locale, TranslationKey } from '../../shared/i18n/translations';

const NODES = [
  { id: 'wardrobe', x: 48, y: 38 },
  { id: 'items', x: 25, y: 32 },
  { id: 'ts', x: 72, y: 28 },
  { id: 'seasons', x: 18, y: 58 },
  { id: 'news', x: 62, y: 65 },
  { id: 'maps', x: 38, y: 72 },
];

const EDGES = [
  ['center', 'wardrobe'],
  ['center', 'items'],
  ['center', 'ts'],
  ['center', 'seasons'],
  ['center', 'news'],
  ['center', 'maps'],
  ['items', 'ts'],
  ['items', 'seasons'],
  ['wardrobe', 'news'],
  ['ts', 'news'],
  ['seasons', 'maps'],
];

const CENTER_NODE = { id: 'center', x: 50, y: 48 };

export function ConstellationLanding() {
  const navigate = useNavigate();
  const { mode, setMode } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const handleNodeClick = () => {
    navigate('/hub'); // Navigate to hub, could pass hash or state later if needed
  };

  const getAllNodes = () => [...NODES, CENTER_NODE];
  const allNodes = getAllNodes();

  const isEdgeActive = (from: string, to: string) => {
    if (!hoveredNode) return false;
    return hoveredNode === from || hoveredNode === to;
  };

  const isEdgeDim = (from: string, to: string) => {
    if (!hoveredNode) return false;
    return !isEdgeActive(from, to);
  };

  return (
    <div className="constellation-root" aria-label="Constellation Landing">
      <StarField />
      
      <div className="shooting-star shooting-star--1"></div>
      <div className="shooting-star shooting-star--2"></div>

      <svg className="constellation-svg" aria-hidden="true">
        {EDGES.map(([fromId, toId], i) => {
          const fromNode = allNodes.find(n => n.id === fromId)!;
          const toNode = allNodes.find(n => n.id === toId)!;
          const active = isEdgeActive(fromId, toId);
          const dim = isEdgeDim(fromId, toId);
          
          return (
            <g key={i} className={`const-edge ${active ? 'const-edge--active' : ''} ${dim ? 'const-edge--dim' : ''}`}>
              <line
                x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                stroke="var(--sky-bloom)" strokeWidth="6" opacity="0.2"
              />
              <line
                x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                stroke="var(--sky-node-glow)" strokeWidth="2" opacity="0.5"
              />
              <line
                x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                stroke="var(--sky-text-primary)" strokeWidth="1" opacity={active ? "1" : "0.3"}
              />
            </g>
          );
        })}
      </svg>

      {NODES.map(node => (
        <button
          key={node.id}
          className="const-node"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          onFocus={() => setHoveredNode(node.id)}
          onBlur={() => setHoveredNode(null)}
          aria-label={t(`feature.${node.id}` as TranslationKey)}
        >
          <div className="node-ring"></div>
          <div className="node-label">{t(`feature.${node.id}` as TranslationKey)}</div>
          <div className="node-desc">{t(`feature.${node.id}.desc` as TranslationKey)}</div>
        </button>
      ))}

      <button
        className="const-node const-node--center"
        style={{ left: `${CENTER_NODE.x}%`, top: `${CENTER_NODE.y}%` }}
        onMouseEnter={() => setHoveredNode(CENTER_NODE.id)}
        onMouseLeave={() => setHoveredNode(null)}
        onFocus={() => setHoveredNode(CENTER_NODE.id)}
        onBlur={() => setHoveredNode(null)}
        onClick={() => handleNodeClick()}
        aria-label={t('landing.title')}
      >
        <div className="node-ring node-ring--center"></div>
        <div className="center-identity">
          <div className="center-identity__title">{t('landing.title')}</div>
          <div className="center-identity__subtitle">{t('landing.subtitle')}</div>
          <div className="enter-button">{t('landing.enter')}</div>
        </div>
      </button>

      <div className="theme-selector">
        {(['auto', 'daylight', 'sunset', 'night'] as ThemeMode[]).map(m => (
          <button
            key={m}
            className={`theme-btn ${mode === m ? 'theme-btn--active' : ''}`}
            onClick={() => setMode(m)}
            aria-label={t(`landing.theme.${m}` as TranslationKey)}
          >
            {t(`landing.theme.${m}` as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="lang-selector">
        {(['vi', 'en'] as Locale[]).map(l => (
          <button
            key={l}
            className={`lang-btn ${locale === l ? 'lang-btn--active' : ''}`}
            onClick={() => setLocale(l)}
            aria-label={t(`lang.${l}` as TranslationKey)}
          >
            {t(`lang.${l}` as TranslationKey)}
          </button>
        ))}
      </div>
      
      <a href="#main-content" className="skip-to-content" aria-label={t('a11y.skipNav')} style={{ position: 'absolute', left: '-9999px' }}>
        {t('a11y.skipNav')}
      </a>
    </div>
  );
}
