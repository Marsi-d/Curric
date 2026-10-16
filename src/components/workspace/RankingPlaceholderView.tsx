/**
 * Ranking Workspace Placeholder View.
 *
 * Acknowledges the planned ranking workspace (Step 3) while surfacing
 * active ranking profiles and assignments already stored in the canonical schema.
 */

import React from 'react';
import { ArrowUpDown, Tag, Layers, CheckCircle2, FolderTree } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function RankingPlaceholderView() {
  const { theme, curriculumDoc, setActiveArea } = useWorkspace();

  return (
    <div id="ranking-placeholder-view" className="p-6 max-w-3xl space-y-5 text-xs">
      <div className="border-b pb-3 border-inherit flex items-center gap-2">
        <ArrowUpDown className="w-5 h-5 text-indigo-400" />
        <div>
          <h1 className="text-sm font-bold tracking-tight text-inherit">
            Ranking Workspace (Planned for Next Step)
          </h1>
          <p className="text-xs text-[#888888]">
            Decoupled tier and ordered topic ranking profiles based on the canonical data schema.
          </p>
        </div>
      </div>

      <div
        className={`p-4 rounded border space-y-3 ${
          theme === 'dark' ? 'bg-[#252526] border-[#333333]' : 'bg-[#ffffff] border-[#e0e0e0]'
        }`}
      >
        <div className="font-semibold text-xs text-inherit flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Decoupled Ranking Schema Ready
        </div>
        <p className="text-xs text-[#888888] leading-relaxed">
          The underlying canonical data model cleanly separates curriculum physical hierarchy from ranking profiles.
          Topics in the Explorer maintain immutable locations, while ranking profiles reference them by stable ID.
        </p>

        <div className="pt-2 border-t border-inherit space-y-2">
          <span className="font-semibold text-[11px] text-[#888888] uppercase tracking-wider">
            Detected Ranking Profiles in Active Document ({curriculumDoc.rankingProfiles.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {curriculumDoc.rankingProfiles.map((p) => {
              const assignedCount = curriculumDoc.rankingAssignments.filter(
                (a) => a.rankingProfileId === p.id
              ).length;

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded border ${
                    theme === 'dark'
                      ? 'bg-[#1e1e1e] border-[#3c3c3c]'
                      : 'bg-[#f8f9fa] border-[#e5e5e5]'
                  }`}
                >
                  <div className="font-semibold text-xs text-inherit">{p.name}</div>
                  <div className="text-[10px] text-[#888888] font-mono mt-0.5">
                    Type: <span className="text-amber-400">{p.type}</span> • Scope:{' '}
                    {p.scope}
                  </div>
                  <div className="text-[10px] text-[#888888] mt-1">
                    {assignedCount} topic assignment(s) recorded
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 flex items-center gap-2">
          <button
            onClick={() => setActiveArea('explorer')}
            className="px-3 py-1.5 bg-[#007acc] text-white rounded text-xs font-medium hover:bg-[#0066b8] transition-colors flex items-center gap-1.5"
          >
            <FolderTree className="w-3.5 h-3.5" />
            Return to Curriculum Explorer
          </button>
        </div>
      </div>
    </div>
  );
}
