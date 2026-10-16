import React, { useEffect, useState } from 'react';
import { FolderTree } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface ExplorerSquareButtonProps {
  className?: string;
  forceShow?: boolean;
}

/**
 * ExplorerSquareButton
 *
 * Dedicated standalone square button for toggling the curriculum explorer.
 * - Always visible on every tab when the explorer sidebar is collapsed (or on mobile).
 * - Sits cleanly as a distinct square (44x44px) inside headers with zero overlap.
 * - No redundant text, no extra bars created.
 */
export default function ExplorerSquareButton({ className = '', forceShow = false }: ExplorerSquareButtonProps) {
  const {
    theme,
    isExplorerCollapsed,
    toggleExplorer,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
  } = useWorkspace();

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show if collapsed on desktop, or always on mobile (since sidebar is a drawer on mobile), unless forced
  const shouldShow = forceShow || isExplorerCollapsed || isMobile;

  if (!shouldShow) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) {
      setIsMobileDrawerOpen(!isMobileDrawerOpen);
    } else {
      toggleExplorer();
    }
  };

  return (
    <button
      id="explorer-square-toggle-btn"
      onClick={handleClick}
      className={`w-11 sm:w-12 h-11 sm:h-12 border-r rounded-none shrink-0 flex items-center justify-center transition-colors cursor-pointer select-none group focus:outline-none ${
        theme === 'dark'
          ? 'bg-[#131314] hover:bg-[#1e1f20] border-[#222425] text-[#007acc] hover:text-sky-300'
          : 'bg-white hover:bg-[#dddddd] border-[#e0e0e0] text-[#007acc] hover:text-[#005a9e]'
      } ${className}`}
      title="Toggle Curriculum Explorer"
      aria-label="Toggle Curriculum Explorer"
    >
      <FolderTree className="w-5 sm:w-5.5 h-5 sm:h-5.5 shrink-0 transition-transform group-hover:scale-105" />
    </button>
  );
}
