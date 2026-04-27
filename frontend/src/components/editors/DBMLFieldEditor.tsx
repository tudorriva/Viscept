/**
 * DBMLFieldEditor — Panel for editing DBML table fields.
 *
 * Shows when a table node is selected in the DBML canvas editor.
 * Allows:
 * - Add/remove fields
 * - Edit field name and data type
 * - Toggle constraints (PK, FK, NOT NULL, UNIQUE)
 * - Create relationships to other tables
 */

import React, { useState } from 'react';
import { Plus, Trash2, RefreshCw, Database } from 'lucide-react';
import { theme } from '../../theme';
import type { VisualNode, VisualDiagram } from '../../types/vcm';

interface DBMLFieldEditorProps {
  node: VisualNode;
  allTables: VisualNode[];
  diagram: VisualDiagram;
  onAddField: (fieldName: string, dataType: string) => void;
  onRemoveField: (fieldIndex: number) => void;
  onUpdateField: (fieldIndex: number, name: string, dataType: string, constraints: string[]) => void;
  onCreateRelationship: (targetTableId: string, sourceColumn: string) => void;
}

export const DBMLFieldEditor: React.FC<DBMLFieldEditorProps> = ({
  node,
  allTables,
  diagram,
  onAddField,
  onRemoveField,
  onUpdateField,
  onCreateRelationship,
}) => {
  const [newFieldName, setNewFieldName] = useState('new_field');
  const [newFieldType, setNewFieldType] = useState('string');
  const [showRelationshipUI, setShowRelationshipUI] = useState(false);
  const [selectedFieldForRel, setSelectedFieldForRel] = useState<number | null>(null);
  const [selectedTargetTable, setSelectedTargetTable] = useState<string | null>(null);

  const fields = node.fields || [];

  const handleAddField = () => {
    onAddField(newFieldName.trim() || 'field', newFieldType.trim() || 'string');
    setNewFieldName('new_field');
    setNewFieldType('string');
  };

  const handleCreateRelationship = () => {
    if (selectedFieldForRel !== null && selectedTargetTable) {
      const field = fields[selectedFieldForRel];
      onCreateRelationship(selectedTargetTable, field?.name || `field_${selectedFieldForRel}`);
      setShowRelationshipUI(false);
      setSelectedFieldForRel(null);
      setSelectedTargetTable(null);
    }
  };

  const otherTables = allTables.filter((t) => t.id !== node.id && t.shape === 'table');

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg border"
      style={{
        backgroundColor: theme.colors.bg.tertiary,
        borderColor: theme.colors.border.medium,
        maxHeight: '500px',
        overflowY: 'auto',
      }}
    >
      {/* Table Header */}
      <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: theme.colors.border.medium }}>
        <Database size={18} style={{ color: theme.colors.accent.primary }} />
        <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
          {node.label}
        </span>
      </div>

      {/* Fields List */}
      <div className="flex flex-col gap-2">
        {fields.length === 0 ? (
          <div className="text-xs italic" style={{ color: theme.colors.text.tertiary }}>
            No fields. Add one below.
          </div>
        ) : (
          fields.map((field, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: theme.colors.bg.secondary }}>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono" style={{ color: theme.colors.text.primary }}>
                  {field.name} : {field.dataType}
                </div>
                {field.constraints && field.constraints.length > 0 && (
                  <div className="text-xs flex gap-1 mt-1">
                    {field.constraints.map((c) => (
                      <span
                        key={c}
                        className="px-1 rounded text-white text-xs"
                        style={{ backgroundColor: theme.colors.accent.secondary }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <button
                onClick={() => {
                  setSelectedFieldForRel(idx);
                  setShowRelationshipUI(true);
                }}
                className="p-1 rounded hover:opacity-80 transition"
                style={{ backgroundColor: theme.colors.accent.secondary, color: 'white' }}
                title="Create relationship"
              >
                <RefreshCw size={14} />
              </button>

              <button
                onClick={() => onRemoveField(idx)}
                className="p-1 rounded hover:opacity-80 transition"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
                title="Remove field"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: theme.colors.border.medium, opacity: 0.3 }} />

      {/* Add Field */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold" style={{ color: theme.colors.text.secondary }}>
          Add Field
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="field_name"
            className="flex-1 px-2 py-1 rounded text-xs border"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              borderColor: theme.colors.border.medium,
              color: theme.colors.text.primary,
            }}
          />
          <input
            type="text"
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value)}
            placeholder="type"
            className="flex-1 px-2 py-1 rounded text-xs border"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              borderColor: theme.colors.border.medium,
              color: theme.colors.text.primary,
            }}
          />
          <button
            onClick={handleAddField}
            className="px-2 py-1 rounded text-xs flex items-center gap-1 hover:opacity-80 transition"
            style={{
              backgroundColor: theme.colors.accent.primary,
              color: 'white',
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Relationship UI */}
      {showRelationshipUI && selectedFieldForRel !== null && (
        <div className="flex flex-col gap-2 p-2 rounded border" style={{ borderColor: theme.colors.accent.primary, backgroundColor: `${theme.colors.accent.primary}15` }}>
          <div className="text-xs font-semibold" style={{ color: theme.colors.text.secondary }}>
            Create Relationship
          </div>
          <div className="text-xs" style={{ color: theme.colors.text.tertiary }}>
            {fields[selectedFieldForRel]?.name} → ?
          </div>

          {otherTables.length === 0 ? (
            <div className="text-xs italic" style={{ color: theme.colors.text.tertiary }}>
              Create another table first.
            </div>
          ) : (
            <>
              <select
                value={selectedTargetTable || ''}
                onChange={(e) => setSelectedTargetTable(e.target.value || null)}
                className="px-2 py-1 rounded text-xs border"
                style={{
                  backgroundColor: theme.colors.bg.secondary,
                  borderColor: theme.colors.border.medium,
                  color: theme.colors.text.primary,
                }}
              >
                <option value="">-- Select target table --</option>
                {otherTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateRelationship}
                  disabled={!selectedTargetTable}
                  className="flex-1 px-2 py-1 rounded text-xs font-semibold hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: theme.colors.accent.primary,
                    color: 'white',
                  }}
                >
                  Create Link
                </button>
                <button
                  onClick={() => {
                    setShowRelationshipUI(false);
                    setSelectedFieldForRel(null);
                  }}
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme.colors.bg.secondary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
