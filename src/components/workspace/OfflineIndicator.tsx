import React, { useState } from 'react';
import { WifiOff, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useWorkspace } from '../../context/WorkspaceContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { theme } = useWorkspace();
  const [showInfo, setShowInfo] = useState(false);

  // When offline, render a persistent top/floating badge
  if (!isOnline) {
    return (
      <>
        <div
          id="offline-status-banner"
          onClick={() => setShowInfo(true)}
          className="fixed bottom-7 right-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600/90 text-white px-3 py-1.5 text-xs font-medium shadow-xl backdrop-blur-xs cursor-pointer border border-amber-400/40 hover:bg-amber-600 transition-all animate-fade-in"
          title="Click to view offline storage details"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — All changes saved locally</span>
        </div>

        {showInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className={`w-full max-w-sm rounded-xl p-5 shadow-2xl border ${
                theme === 'dark'
                  ? 'bg-[#1e1e1e] border-[#333333] text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-500">
                  <WifiOff className="w-4 h-4" />
                  Offline Mode Active
                </h3>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <p>
                  You are currently offline or disconnected from the internet.
                </p>
                <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    <strong>100% Offline Guaranteed:</strong> You can continue editing curriculum topics, reorganizing folders, adjusting priority rankings, and updating study roadmaps. Everything is saved locally.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowInfo(false)}
                className="mt-4 w-full py-1.5 rounded text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                Continue Working
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
