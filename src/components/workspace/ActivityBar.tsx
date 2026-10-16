/**
 * Bottom Activity Bar.
 *
 * Major upgrade: Positioned across the bottom with larger icons and 5 core columns:
 * Col 1: Topic Tier List (with brand new bespoke Tier List icon)
 * Col 2: Curriculum Explorer (Folder Tree)
 * Col 3: Study Roadmap Planning
 * Col 4: AI Extraction & Import Hub
 * Col 5: Settings & Universal App Size Adjuster (with brand new Settings icon)
 */

import React from 'react';
import {
  Layers,
  Brain,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NavigationArea } from '../../types/workspace';

/**
 * Brand new custom SVG icon for Tier List Editor (sits in column 1).
 * Features 3 progressive ranking bars (S / A / B tiers).
 */
export function TierListIcon({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      style={style}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Top / S Tier Bar */}
      <rect x="3" y="3.5" width="18" height="4" rx="1.5" className="fill-rose-500/25 stroke-rose-400" />
      {/* Mid / A Tier Bar */}
      <rect x="3" y="10" width="14" height="4" rx="1.5" className="fill-amber-500/25 stroke-amber-400" />
      {/* Base / B Tier Bar */}
      <rect x="3" y="16.5" width="10" height="4" rx="1.5" className="fill-sky-500/25 stroke-sky-400" />
    </svg>
  );
}

/**
 * Brand new custom SVG icon for Settings Page (sits in column 5).
 * Features modern precision gear/sliders mechanism.
 */
export function SettingsIcon({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      style={style}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Custom SVG icon for AI Extraction & Import.
 */
export function ImportIcon({ className = "w-6 h-6", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      style={style}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function VSCodeActivityBar() {
  const {
    activeArea,
    setActiveArea,
    toggleExplorer,
    isExplorerCollapsed,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    theme,
    activityBarIconSize,
    activityBarIconSizes,
    deckStats,
    isAITyping,
  } = useWorkspace();

  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportResize = () => {
      const isKeyboard = window.visualViewport!.height < window.innerHeight * 0.82;
      setIsKeyboardVisible(isKeyboard);
    };
    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => window.visualViewport?.removeEventListener('resize', handleViewportResize);
  }, []);

  const handleNavClick = (area: NavigationArea) => {
    if (area === 'explorer') {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        if (activeArea === 'explorer' && isMobileDrawerOpen) {
          setIsMobileDrawerOpen(false);
        } else {
          setActiveArea('explorer');
          setIsMobileDrawerOpen(true);
        }
      } else {
        if (activeArea === 'explorer') {
          toggleExplorer();
        } else {
          setActiveArea('explorer');
          if (isExplorerCollapsed) {
            toggleExplorer();
          }
        }
      }
      return;
    }

    setActiveArea(area);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileDrawerOpen(false);
    }
  };

  // Separate individual icon dimensions
  const rankingSize = activityBarIconSizes?.ranking ?? activityBarIconSize;
  const roadmapSize = activityBarIconSizes?.roadmap ?? activityBarIconSize;
  const flashcardsSize = activityBarIconSizes?.flashcards ?? activityBarIconSize;
  const aiSize = activityBarIconSizes?.ai ?? activityBarIconSize;
  const importSize = activityBarIconSizes?.import ?? activityBarIconSize;
  const settingsSize = activityBarIconSizes?.settings ?? activityBarIconSize;

  const maxIconSize = Math.max(rankingSize, roadmapSize, flashcardsSize, aiSize, importSize, settingsSize, activityBarIconSize);
  const barHeight = Math.max(54, maxIconSize + 28);

  const desktopNavItems: {
    area: NavigationArea;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      area: 'ranking',
      label: 'Topic Rankings Tier List',
      shortLabel: 'Tier List',
      icon: (
        <TierListIcon
          style={{ width: `${rankingSize}px`, height: `${rankingSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'roadmap',
      label: 'Study Roadmap',
      shortLabel: 'Roadmap',
      icon: (
        <Layers
          style={{ width: `${roadmapSize}px`, height: `${roadmapSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'flashcards',
      label: 'Spaced Repetition (FSRS)',
      shortLabel: 'Flashcards',
      badge: (deckStats?.dueCount || 0) + (deckStats?.newCount || 0),
      icon: (
        <Brain
          style={{ width: `${flashcardsSize}px`, height: `${flashcardsSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'ai',
      label: 'Gemini AI Study Tutor',
      shortLabel: 'AI Tutor',
      icon: (
        <Sparkles
          style={{ width: `${aiSize}px`, height: `${aiSize}px` }}
          className="shrink-0 text-sky-400"
        />
      ),
    },
    {
      area: 'import',
      label: 'AI Extraction & Import',
      shortLabel: 'Import',
      icon: (
        <ImportIcon
          style={{ width: `${importSize}px`, height: `${importSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'settings',
      label: 'Settings & Scale',
      shortLabel: 'Settings',
      icon: (
        <SettingsIcon
          style={{ width: `${settingsSize}px`, height: `${settingsSize}px` }}
          className="shrink-0"
        />
      ),
    },
  ];

  const mobileNavItems: {
    area: NavigationArea;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      area: 'ranking',
      label: 'Topic Rankings Tier List',
      shortLabel: 'Tier List',
      icon: (
        <TierListIcon
          style={{ width: `${rankingSize}px`, height: `${rankingSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'roadmap',
      label: 'Study Roadmap',
      shortLabel: 'Roadmap',
      icon: (
        <Layers
          style={{ width: `${roadmapSize}px`, height: `${roadmapSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'flashcards',
      label: 'Spaced Repetition (FSRS)',
      shortLabel: 'Flashcards',
      badge: (deckStats?.dueCount || 0) + (deckStats?.newCount || 0),
      icon: (
        <Brain
          style={{ width: `${flashcardsSize}px`, height: `${flashcardsSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'ai',
      label: 'Gemini AI Study Tutor',
      shortLabel: 'AI Tutor',
      icon: (
        <Sparkles
          style={{ width: `${aiSize}px`, height: `${aiSize}px` }}
          className="shrink-0 text-sky-400"
        />
      ),
    },
    {
      area: 'import',
      label: 'AI Extraction & Import',
      shortLabel: 'Import',
      icon: (
        <ImportIcon
          style={{ width: `${importSize}px`, height: `${importSize}px` }}
          className="shrink-0"
        />
      ),
    },
    {
      area: 'settings',
      label: 'Settings & Scale',
      shortLabel: 'Settings',
      icon: (
        <SettingsIcon
          style={{ width: `${settingsSize}px`, height: `${settingsSize}px` }}
          className="shrink-0"
        />
      ),
    },
  ];

  // Hide activity bar completely when typing in AI or when mobile virtual keyboard is open
  if ((activeArea === 'ai' && isAITyping) || isKeyboardVisible) {
    return null;
  }

  return (
    <nav
      id="vscode-activity-bar"
      style={{ minHeight: `${barHeight}px`, height: `${barHeight}px` }}
      className={`w-full shrink-0 select-none z-40 border-t flex items-center justify-center px-1 sm:px-4 pb-[env(safe-area-inset-bottom,0px)] transition-all ${
        theme === 'dark'
          ? 'bg-[#131314] border-[#222425] text-[#8e918f]'
          : 'bg-[#ffffff] border-[#e5e5e5] text-slate-500'
      }`}
      aria-label="Activity Bar"
    >
      {/* Desktop 6-col view */}
      <div className="hidden md:grid w-full max-w-4xl mx-auto grid-cols-6 h-full">
        {desktopNavItems.map((item) => {
          const isActive =
            activeArea === item.area &&
            (item.area !== 'explorer' || !isExplorerCollapsed || isMobileDrawerOpen);

          return (
            <button
              key={item.area}
              id={`activity-${item.area}`}
              onClick={() => handleNavClick(item.area)}
              title={item.label}
              aria-label={item.label}
              className={`relative h-full flex flex-col items-center justify-center gap-0.5 transition-all group cursor-pointer ${
                isActive
                  ? theme === 'dark'
                    ? 'text-white'
                    : 'text-[#007acc]'
                  : theme === 'dark'
                  ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 inset-x-2 sm:inset-x-4 h-[3px] bg-[#007acc] rounded-b shadow-sm" />
              )}
              <div className="relative transition-transform group-hover:scale-110">
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight truncate max-w-full px-1 ${
                isActive ? 'font-bold' : ''
              }`}>
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile 6-col view */}
      <div className="grid md:hidden w-full grid-cols-6 h-full">
        {mobileNavItems.map((item) => {
          const isActive = activeArea === item.area && !isMobileDrawerOpen;

          return (
            <button
              key={item.area}
              id={`mobile-activity-${item.area}`}
              onClick={() => handleNavClick(item.area)}
              title={item.label}
              aria-label={item.label}
              className={`relative h-full flex flex-col items-center justify-center gap-0.5 transition-all group cursor-pointer ${
                isActive
                  ? theme === 'dark'
                    ? 'text-white'
                    : 'text-[#007acc]'
                  : theme === 'dark'
                  ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 inset-x-1.5 h-[3px] bg-[#007acc] rounded-b shadow-sm" />
              )}
              <div className="relative transition-transform group-hover:scale-110">
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[8.5px] font-black bg-rose-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[8.5px] font-medium tracking-tight truncate max-w-full px-0.5 ${
                isActive ? 'font-bold' : ''
              }`}>
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Backward compatibility export
export { VSCodeActivityBar as DesktopActivityBar };
