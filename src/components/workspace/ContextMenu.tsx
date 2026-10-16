/**
 * Lightweight Context Menu for Tree Items.
 */

import React, { useEffect, useRef } from 'react';
import {
  Copy,
  ExternalLink,
  ChevronsUpDown,
  Check,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  FileText,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export interface ContextMenuProps {
  x: number;
  y: number;
  nodeType: 'subject' | 'group' | 'unit' | 'topic';
  itemId: string;
  itemName: string;
  pathText: string;
  onClose: () => void;
  onOpenItem?: () => void;
  onAddUnit?: () => void;
  onAddTopic?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export default function ContextMenu({
  x,
  y,
  nodeType,
  itemId,
  itemName,
  pathText,
  onClose,
  onOpenItem,
  onAddUnit,
  onAddTopic,
  onRename,
  onDelete,
}: ContextMenuProps) {
  const { theme, expandAll, collapseAll } = useWorkspace();
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  // Close on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField(null);
        onClose();
      }, 700);
    } catch {
      // ignore
    }
  };

  // Adjust positioning to avoid screen overflows
  const adjustedX = Math.min(Math.max(10, x), window.innerWidth - 230);
  const adjustedY = Math.min(Math.max(10, y), window.innerHeight - 340);

  return (
    <div
      ref={menuRef}
      id="tree-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className={`fixed z-50 w-56 py-1.5 rounded-lg shadow-2xl border text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
        theme === 'dark'
          ? 'bg-[#252526] border-[#454545] text-[#cccccc] shadow-black/80'
          : 'bg-[#ffffff] border-[#d0d7de] text-[#24292f] shadow-xl'
      }`}
    >
      <div className="px-3 py-1 text-[10px] font-semibold text-[#858585] uppercase tracking-wider truncate border-b border-inherit mb-1">
        {nodeType}: {itemName}
      </div>

      {onOpenItem && (
        <button
          id="ctx-open"
          onClick={() => {
            onOpenItem();
            onClose();
          }}
          className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
            theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open in Workspace</span>
        </button>
      )}

      {/* Add Unit / Topic depending on nodeType */}
      {onAddUnit && (
        <button
          id="ctx-add-unit"
          onClick={() => {
            onAddUnit();
            onClose();
          }}
          className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
            theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>Add New Unit</span>
        </button>
      )}

      {onAddTopic && (
        <button
          id="ctx-add-topic"
          onClick={() => {
            onAddTopic();
            onClose();
          }}
          className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
            theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Add New Topic</span>
        </button>
      )}

      {onRename && (
        <button
          id="ctx-rename"
          onClick={() => {
            onRename();
            onClose();
          }}
          className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
            theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span>Rename</span>
        </button>
      )}

      <div className="my-1 border-t border-inherit" />

      {/* Copy Actions */}
      <button
        id="ctx-copy-id"
        onClick={() => copyToClipboard(itemId, 'id')}
        className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
          theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
        }`}
      >
        {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copiedField === 'id' ? 'ID Copied!' : 'Copy Item ID'}</span>
      </button>

      <button
        id="ctx-copy-path"
        onClick={() => copyToClipboard(pathText, 'path')}
        className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
          theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
        }`}
      >
        {copiedField === 'path' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copiedField === 'path' ? 'Path Copied!' : 'Copy Path'}</span>
      </button>

      {/* Delete Action (Prominently styled in red) */}
      {onDelete && (
        <>
          <div className="my-1 border-t border-inherit" />
          <button
            id="ctx-delete"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-rose-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" />
            <span>Delete {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}</span>
          </button>
        </>
      )}

      <div className="my-1 border-t border-inherit" />

      <button
        id="ctx-expand-all"
        onClick={() => {
          expandAll();
          onClose();
        }}
        className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
          theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
        }`}
      >
        <ChevronsUpDown className="w-3.5 h-3.5" />
        <span>Expand All Folders</span>
      </button>

      <button
        id="ctx-collapse-all"
        onClick={() => {
          collapseAll();
          onClose();
        }}
        className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
          theme === 'dark' ? 'hover:bg-[#094771] hover:text-white' : 'hover:bg-[#007acc] hover:text-white'
        }`}
      >
        <ChevronsUpDown className="w-3.5 h-3.5" />
        <span>Collapse All Folders</span>
      </button>
    </div>
  );
}
