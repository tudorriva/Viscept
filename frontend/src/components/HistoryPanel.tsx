import React from 'react';
import { getHistory } from '../utils/storage';

interface HistoryPanelProps {
  diagramType: string;
  onSelectVersion: (code: string) => void;
}

/**
 * Shows version history for the current diagram type.
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({ diagramType, onSelectVersion }) => {
  const history = getHistory(diagramType);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">📚 History</h3>
        <p className="text-xs text-gray-600 mt-1">Last {history.length} versions</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <p>No history yet</p>
            <p className="text-xs mt-1">Generate diagrams to see versions</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {history.map((version, index) => (
              <li key={index} className="p-3 hover:bg-gray-50 cursor-pointer transition">
                <button
                  onClick={() => onSelectVersion(version.code)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600">
                      v{history.length - index}
                    </span>
                    <span className="text-xs text-gray-500">{formatTime(version.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2 break-words">
                    {version.code.substring(0, 60)}
                    {version.code.length > 60 ? '...' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
