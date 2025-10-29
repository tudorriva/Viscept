import React, { useEffect, useState } from 'react';
import { getHistory } from '../utils/storage';

interface HistoryItem {
  code: string;
  timestamp: string;
  diagramType: string;
}

interface HistoryPanelProps {
  diagramType: string;
  onSelectVersion: (code: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ diagramType, onSelectVersion }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const items = getHistory(diagramType as any);
    setHistory(items);
  }, [diagramType]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-80 flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
            <span className="text-sm">⏱️</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">History</h2>
            <p className="text-xs text-slate-500 mt-0.5">{history.length} versions</p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <p className="text-sm">No history yet</p>
            <p className="text-xs mt-2">Generate diagrams to see versions here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {history.map((item, index) => (
              <button
                key={`${item.timestamp}-${index}`}
                onClick={() => onSelectVersion(item.code)}
                className="w-full text-left p-4 hover:bg-slate-700/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-300 truncate group-hover:text-slate-100">
                      {item.code.substring(0, 30).replace(/\n/g, ' ')}...
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{formatTime(item.timestamp)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                      {item.code.length} chars
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};