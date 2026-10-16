import React, { useState } from 'react';
import { Download, Share, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useWorkspace } from '../../context/WorkspaceContext';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { theme } = useWorkspace();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 3000);
    }
  };

  if (justInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Installed!</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (compact) {
      return (
        <button
          id="btn-pwa-install-compact"
          onClick={handleInstallClick}
          className={`p-1.5 rounded transition-colors flex items-center justify-center ${
            theme === 'dark'
              ? 'hover:bg-[#333333] text-sky-400 hover:text-sky-300'
              : 'hover:bg-slate-200 text-sky-600 hover:text-sky-700'
          }`}
          title="Install App for Offline Use"
          aria-label="Install App for Offline Use"
        >
          <Download className="w-4 h-4" />
        </button>
      );
    }

    return (
      <button
        id="btn-pwa-install"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all shadow-sm cursor-pointer ${
          theme === 'dark'
            ? 'bg-sky-600 hover:bg-sky-500 text-white'
            : 'bg-sky-600 hover:bg-sky-700 text-white'
        }`}
        title="Install as standalone offline desktop or mobile app"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors border cursor-pointer ${
            theme === 'dark'
              ? 'border-[#3a3a3a] text-slate-300 hover:bg-[#2d2d2d]'
              : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
          title="Install to iPhone/iPad Home Screen"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Install Offline App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className={`w-full max-w-sm rounded-xl p-5 shadow-2xl border ${
                theme === 'dark'
                  ? 'bg-[#1e1e1e] border-[#333333] text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Download className="w-4 h-4 text-sky-500" />
                  Install on iPhone or iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded bg-slate-800/40 border border-slate-700/40">
                  <Share className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Step 1: </span>
                    Tap the <strong>Share</strong> icon in the Safari toolbar (bottom on iPhone, top on iPad).
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded bg-slate-800/40 border border-slate-700/40">
                  <Download className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Step 2: </span>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  Once added, the Curriculum & Study Planner launches in fullscreen mode with 100% offline access.
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
