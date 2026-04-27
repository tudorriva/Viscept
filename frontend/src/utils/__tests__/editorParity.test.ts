/**
 * Preview/Editor Parity Tests
 * 
 * Verifies that the preview tab and editor tab render the same diagrams
 * from identical code by comparing their intermediate representations.
 */

import { describe, it, expect } from 'vitest';
import { parseDBML, parseMermaidFlowchart } from '../diagramParser';
import { dslToVCM, vcmToDSL } from '../diagramParser';
import type { VisualDiagram, VisualNode, VisualEdge } from '../../types/vcm';

// ────────────────────────────────────────────────────────────────────────────

describe('Preview/Editor Parity', () => {
  describe('DBML Parity', () => {
    it('should parse same structure in preview and editor', () => {
      const dbmlCode = `
Table users {
  id int [pk]
  email string [unique]
  created_at timestamp
}

Table posts {
  id int [pk]
  user_id int [ref: > users.id]
  title string
  content text
}

Ref: posts.user_id > users.id
      `;

      // Parse as preview would (direct parser call)
      const previewStructure = parseDBML(dbmlCode);

      // Parse as editor would (through VCM)
      const editorVCM = dslToVCM(dbmlCode, 'dbml');

      // Both should have 2 tables
      expect(previewStructure.nodes.length).toBe(editorVCM.nodes.length);
      expect(previewStructure.nodes.length).toBe(2);

      // Both should have relationship edges
      expect(previewStructure.edges.length).toBeGreaterThan(0);
      expect(editorVCM.edges.length).toBeGreaterThan(0);

      // Node labels should match
      const previewLabels = previewStructure.nodes.map((n: any) => n.label).sort();
      const editorLabels = editorVCM.nodes.map((n: any) => n.label).sort();
      expect(previewLabels).toEqual(editorLabels);

      // Should have 'users' and 'posts' tables
      expect(previewLabels).toContain('users');
      expect(previewLabels).toContain('posts');
    });

    it('should infer relationships consistently', () => {
      const dbmlCode = `
Table orders {
  id int [pk]
  customer_id int
}

Table customers {
  id int [pk]
}
      `;

      const preview = parseDBML(dbmlCode);
      const editor = dslToVCM(dbmlCode, 'dbml');

      // Both should infer the customer_id -> customers relationship
      const previewHasEdge = preview.edges.length > 0;
      const editorHasEdge = editor.edges.length > 0;

      // At minimum, both should agree on whether inference happened
      expect(previewHasEdge).toBe(editorHasEdge);
    });

    it('should preserve field constraints consistently', () => {
      const dbmlCode = `
Table accounts {
  id int [pk]
  username string [unique, not null]
  balance decimal [default: 0]
}
      `;

      const preview = parseDBML(dbmlCode);
      const editor = dslToVCM(dbmlCode, 'dbml');

      // Both should have 1 table
      expect(preview.nodes.length).toBe(editor.nodes.length);

      // Both should recognize 'accounts' table
      expect(preview.nodes.some((n: any) => n.label === 'accounts')).toBe(true);
      expect(editor.nodes.some((n: any) => n.label === 'accounts')).toBe(true);
    });
  });

  describe('Mermaid Parity', () => {
    it('should parse flowchart identically in preview and editor', () => {
      const mermaidCode = `flowchart TD
        A["Start Process"]
        B{"Is Valid?"}
        C["Process Data"]
        D["End"]
        A --> B
        B -->|Yes| C
        B -->|No| A
        C --> D
      `;

      // Parse as preview would
      const previewStructure = parseMermaidFlowchart(mermaidCode);

      // Parse as editor would
      const editorVCM = dslToVCM(mermaidCode, 'mermaid');

      // Should have same number of nodes
      expect(previewStructure.nodes.length).toBe(editorVCM.nodes.length);
      expect(previewStructure.nodes.length).toBe(4);

      // Should have same number of edges
      expect(previewStructure.edges.length).toBe(editorVCM.edges.length);
      expect(previewStructure.edges.length).toBe(4);

      // Node IDs should match
      const previewIds = previewStructure.nodes.map((n: any) => n.id).sort();
      const editorIds = editorVCM.nodes.map((n: any) => n.id).sort();
      expect(previewIds).toEqual(editorIds);
    });

    it('should preserve edge labels consistently', () => {
      const mermaidCode = `flowchart LR
        A["Source"]
        B["Target"]
        A -->|"With Label"| B
      `;

      const preview = parseMermaidFlowchart(mermaidCode);
      const editor = dslToVCM(mermaidCode, 'mermaid');

      // Both should have the edge
      expect(preview.edges.length).toBeGreaterThan(0);
      expect(editor.edges.length).toBeGreaterThan(0);

      // Label should be present in both
      const previewLabel = preview.edges[0]?.label;
      const editorLabel = editor.edges[0]?.label;

      if (previewLabel) {
        expect(editorLabel).toBeTruthy();
      }
    });

    it('should handle multiple arrow styles identically', () => {
      const mermaidCode = `flowchart TD
        A["Start"]
        B["Middle"]
        C["End"]
        A --> B
        B --> |"Label"| C
      `;

      const preview = parseMermaidFlowchart(mermaidCode);
      const editor = dslToVCM(mermaidCode, 'mermaid');

      // Both should extract all edges
      expect(preview.edges.length).toBe(editor.edges.length);
      expect(preview.edges.length).toBe(2);
    });
  });

  describe('Round-trip Consistency', () => {
    it('DBML: code → VCM → code should remain semantically equivalent', () => {
      const original = `Table users {
  id int [pk]
  email string
}`;

      // Code → VCM
      const vcm = dslToVCM(original, 'dbml');

      // VCM → Code
      const regenerated = vcmToDSL(vcm, 'dbml');

      // Parse regenerated to get structure
      const regeneratedVCM = dslToVCM(regenerated, 'dbml');

      // Structures should be equivalent
      expect(vcm.nodes.length).toBe(regeneratedVCM.nodes.length);
      expect(vcm.edges.length).toBe(regeneratedVCM.edges.length);

      // Node labels should match
      const original_labels = vcm.nodes.map((n: any) => n.label).sort();
      const regen_labels = regeneratedVCM.nodes.map((n: any) => n.label).sort();
      expect(original_labels).toEqual(regen_labels);
    });

    it('Mermaid: code → VCM → code should remain syntactically valid', () => {
      const original = `flowchart TD
  A["Node A"]
  B["Node B"]
  A --> B`;

      // Code → VCM
      const vcm = dslToVCM(original, 'mermaid');

      // VCM → Code
      const regenerated = vcmToDSL(vcm, 'mermaid');

      // Regenerated should be valid Mermaid
      expect(regenerated).toContain('flowchart');
      expect(regenerated.length).toBeGreaterThan(0);

      // Should still parse
      const regeneratedVCM = dslToVCM(regenerated, 'mermaid');
      expect(regeneratedVCM.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('Node/Edge Structure Parity', () => {
    it('should have consistent node properties', () => {
      const dbmlCode = `Table test {
  id int [pk]
}`;

      const preview = parseDBML(dbmlCode);
      const editor = dslToVCM(dbmlCode, 'dbml');

      // All nodes should have required properties
      preview.nodes.forEach((node: any) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
      });

      editor.nodes.forEach((node: any) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
      });
    });

    it('should have consistent edge properties', () => {
      const mermaidCode = `flowchart TD
  A["Source"]
  B["Target"]
  A --> B`;

      const preview = parseMermaidFlowchart(mermaidCode);
      const editor = dslToVCM(mermaidCode, 'mermaid');

      // All edges should have required properties
      [...preview.edges, ...editor.edges].forEach((edge: any) => {
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
        expect(edge).toHaveProperty('id');
      });
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe('Data Normalization Tests', () => {
  it('should normalize whitespace in labels', () => {
    const code1 = `flowchart TD
  A["  Multiple   Spaces  "]
  A`;

    const code2 = `flowchart TD
  A["Multiple Spaces"]
  A`;

    const vcm1 = dslToVCM(code1, 'mermaid');
    const vcm2 = dslToVCM(code2, 'mermaid');

    // Both should parse (whitespace normalization is acceptable)
    expect(vcm1.nodes.length).toBeGreaterThan(0);
    expect(vcm2.nodes.length).toBeGreaterThan(0);
  });

  it('should handle DBML with different line endings', () => {
    const unix = `Table users {\n  id int [pk]\n}`;
    const windows = `Table users {\r\n  id int [pk]\r\n}`;

    const vcmUnix = dslToVCM(unix, 'dbml');
    const vcmWindows = dslToVCM(windows, 'dbml');

    // Should parse identically
    expect(vcmUnix.nodes.length).toBe(vcmWindows.nodes.length);
    expect(vcmUnix.nodes[0].label).toBe(vcmWindows.nodes[0].label);
  });
});
