/**
 * QuickRankTiles Component.
 *
 * Provides instant 1-tap/click horizontal ranking tiles directly under topic cards,
 * search results, and curriculum views without requiring drag-and-drop.
 *
 * Dynamically refers to the active ranking preset and custom tier labels/colors.
 * Shows active tier indicator ring, tooltip, and unrank option (✕).
 */

import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { RankingTier } from '../../types/curriculum';
import { X } from 'lucide-react';

interface QuickRankTilesProps {
  topicId: string;
  topicName?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  onRankAssigned?: (tierId: string | null) => void;
}

export const QuickRankTiles: React.FC<QuickRankTilesProps> = ({
  topicId,
  topicName,
  size = 'md',
  showLabel = true,
  className = '',
  onRankAssigned,
}) => {
  const {
    curriculumDoc,
    activeRankingProfileId,
    assignTopicToTier,
    removeTopicFromTier,
    theme,
  } = useWorkspace();

  // Find active profile and tiers
  const activeProfile =
    curriculumDoc.rankingProfiles?.find((p) => p.id === activeRankingProfileId) ||
    curriculumDoc.rankingProfiles?.[0];

  const tiers: RankingTier[] = activeProfile?.tiers || [];

  // Find if topic is currently assigned in this active profile
  const currentAssignment = curriculumDoc.rankingAssignments?.find(
    (a) => a.rankingProfileId === activeProfile?.id && a.itemId === topicId
  );
  const currentTierId = currentAssignment?.rank;

  if (!activeProfile || tiers.length === 0) {
    return null;
  }

  const handleTileClick = (e: React.MouseEvent, tierId: string) => {
    e.stopPropagation();
    if (!activeProfile) return;

    if (currentTierId === tierId) {
      // Tapping the active tier unranks it (toggle behavior)
      removeTopicFromTier(activeProfile.id, topicId);
      onRankAssigned?.(null);
    } else {
      assignTopicToTier(activeProfile.id, topicId, tierId);
      onRankAssigned?.(tierId);
    }
  };

  const handleUnrankClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProfile) return;
    removeTopicFromTier(activeProfile.id, topicId);
    onRankAssigned?.(null);
  };

  const buttonSizeClass =
    size === 'sm'
      ? 'min-w-[22px] h-[20px] px-1 text-[9.5px]'
      : 'min-w-[26px] h-[23px] px-1.5 text-[10.5px]';

  return (
    <div
      className={`quick-rank-tiles flex items-center flex-wrap gap-1 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {showLabel && (
        <span className="text-[9px] uppercase font-mono text-slate-400 tracking-wider mr-0.5 shrink-0">
          Rank:
        </span>
      )}

      {tiers.map((tier) => {
        const isActive = currentTierId === tier.id;
        // Clean short label (e.g. S, A, B or first 2 chars)
        const displayLabel = tier.label.length <= 3 ? tier.label : tier.label.slice(0, 2);

        return (
          <button
            key={tier.id}
            type="button"
            onClick={(e) => handleTileClick(e, tier.id)}
            title={`Assign to Tier ${tier.label}${isActive ? ' (Currently Active - Click to Unrank)' : ''}`}
            aria-pressed={isActive}
            aria-label={`Rank ${tier.label}`}
            className={`font-black rounded flex items-center justify-center transition-all cursor-pointer shadow-xs ${buttonSizeClass} ${
              isActive
                ? 'ring-2 ring-sky-400 ring-offset-1 scale-105 z-10 font-black'
                : 'opacity-85 hover:opacity-100 hover:scale-108 active:scale-95'
            } ${
              theme === 'dark' ? 'ring-offset-[#1e1e1e]' : 'ring-offset-white'
            }`}
            style={{
              backgroundColor: tier.color,
              color: '#0f172a', // Deep dark text for high contrast on pastel & vivid tier colors
            }}
          >
            {displayLabel}
          </button>
        );
      })}

      {/* Direct Unrank (✕) button when currently placed in a tier */}
      {currentTierId && (
        <button
          type="button"
          onClick={handleUnrankClick}
          title="Unrank topic (remove from tier list)"
          aria-label="Unrank topic"
          className={`rounded flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer border border-transparent hover:border-rose-500/30 ${
            size === 'sm' ? 'w-5 h-[20px]' : 'w-6 h-[23px]'
          }`}
        >
          <X className="w-3 h-3 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};

export default QuickRankTiles;
