/**
 * ValidationPanel — Displays visual validation results and provides
 * a "Check Diagram" button for on-demand diagram inspection.
 */

import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, AlertTriangle, Loader, RefreshCw } from 'lucide-react';
import { theme } from '../theme';
import { ValidationResult } from '../utils/api';

interface ValidationPanelProps {
  /** Latest validation result (null if not yet validated) */
  validation: ValidationResult | null;
  /** Number of generation attempts */
  attempts?: number;
  /** Whether a validation is currently running */
  isValidating: boolean;
  /** Trigger a manual validation */
  onValidate: () => void;
  /** Whether there is code to validate */
  hasCode: boolean;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validation,
  attempts,
  isValidating,
  onValidate,
  hasCode,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    if (!validation) return <Eye size={16} />;
    switch (validation.status) {
      case 'PASS':
        return <CheckCircle size={16} />;
      case 'FAIL':
        return <XCircle size={16} />;
      case 'ERROR':
        return <AlertTriangle size={16} />;
    }
  };

  const getStatusColor = () => {
    if (!validation) return theme.colors.text.tertiary;
    switch (validation.status) {
      case 'PASS':
        return theme.colors.status.success;
      case 'FAIL':
        return theme.colors.status.error;
      case 'ERROR':
        return theme.colors.status.warning;
    }
  };

  const getStatusLabel = () => {
    if (isValidating) return 'Validating...';
    if (!validation) return 'Not validated';
    switch (validation.status) {
      case 'PASS':
        return 'Passed';
      case 'FAIL':
        return 'Issues Found';
      case 'ERROR':
        return 'Validation Error';
    }
  };

  const confidencePercent = validation
    ? Math.round(validation.confidence * 100)
    : 0;

  return (
    <div
      className="border-t"
      style={{
        borderColor: theme.colors.border.medium,
        backgroundColor: theme.colors.bg.secondary,
      }}
    >
      {/* Header / Summary bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        onClick={() => validation && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div style={{ color: getStatusColor() }}>{getStatusIcon()}</div>
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: getStatusColor() }}
          >
            {getStatusLabel()}
          </span>

          {validation && validation.status !== 'ERROR' && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${getStatusColor()}20`,
                color: getStatusColor(),
              }}
            >
              {confidencePercent}% conf.
            </span>
          )}

          {attempts && attempts > 1 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
              style={{
                backgroundColor: `${theme.colors.accent.primary}20`,
                color: theme.colors.accent.primary,
              }}
            >
              <RefreshCw size={10} />
              {attempts} attempts
            </span>
          )}
        </div>

        {/* Check Diagram button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onValidate();
          }}
          disabled={!hasCode || isValidating}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          style={{
            backgroundColor:
              !hasCode || isValidating
                ? theme.colors.bg.tertiary
                : `${theme.colors.accent.secondary}15`,
            color:
              !hasCode || isValidating
                ? theme.colors.text.tertiary
                : theme.colors.accent.secondary,
            border: `1px solid ${
              !hasCode || isValidating
                ? theme.colors.border.medium
                : theme.colors.accent.secondary
            }`,
            cursor: !hasCode || isValidating ? 'not-allowed' : 'pointer',
            opacity: !hasCode || isValidating ? 0.5 : 1,
          }}
        >
          {isValidating ? (
            <>
              <Loader size={12} className="animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Eye size={12} />
              Check Diagram
            </>
          )}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && validation && (
        <div
          className="px-4 pb-3 space-y-2"
          style={{ borderTop: `1px solid ${theme.colors.border.medium}` }}
        >
          {/* Reason */}
          <div className="pt-2">
            <p
              className="text-xs font-medium mb-1"
              style={{ color: theme.colors.text.secondary }}
            >
              Analysis
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: theme.colors.text.primary }}
            >
              {validation.reason}
            </p>
          </div>

          {/* Suggestions */}
          {validation.suggestions.length > 0 && (
            <div>
              <p
                className="text-xs font-medium mb-1"
                style={{ color: theme.colors.text.secondary }}
              >
                Suggestions
              </p>
              <ul className="space-y-1">
                {validation.suggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="text-xs flex items-start gap-1.5"
                    style={{ color: theme.colors.text.primary }}
                  >
                    <span style={{ color: theme.colors.accent.primary }}>•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <p
            className="text-xs pt-1"
            style={{ color: theme.colors.text.tertiary }}
          >
            Validated at {new Date(validation.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};
