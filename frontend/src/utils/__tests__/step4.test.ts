/**
 * Tests for Step 4: useVCMHistory + layoutEngine
 *
 * Run with:  npx tsx src/utils/__tests__/step4.test.ts
 */

// ── Inline test runner ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    if (failed === passed + failed) {
      // no new failures
    }
    passed++;
    console.log(`✅  Test ${passed + failed} passed: ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`❌  Test ${passed + failed} FAILED: ${name}`);
    console.error(`    ${err.message ?? err}`);
  }
}

// ── Imports ────────────────────────────────────────────────────────────────

import {
  createVisualDiagram,
  createVisualNode,
  createVisualEdge,
  addNode,
  addEdge,
  updateDiagram,
  createVisualGroup,
  type VisualDiagram,
} from '../../types/vcm';

import { autoLayout } from '../layoutEngine';

// ══════════════════════════════════════════════════════════════════════════════
// Layout Engine tests
// ══════════════════════════════════════════════════════════════════════════════

test('autoLayout topological — assigns positions', () => {
  let d = createVisualDiagram('mermaid', 'flowchart');
  d = addNode(d, createVisualNode({ id: 'A', label: 'Start' }));
  d = addNode(d, createVisualNode({ id: 'B', label: 'Process' }));
  d = addNode(d, createVisualNode({ id: 'C', label: 'End' }));
  d = addEdge(d, createVisualEdge({ id: 'e1', sourceNodeId: 'A', targetNodeId: 'B' }));
  d = addEdge(d, createVisualEdge({ id: 'e2', sourceNodeId: 'B', targetNodeId: 'C' }));

  const laid = autoLayout(d, { algorithm: 'topological', direction: 'TB' });

  // A should be above B, B above C (TB direction)
  const posA = laid.nodes.find((n) => n.id === 'A')!.position;
  const posB = laid.nodes.find((n) => n.id === 'B')!.position;
  const posC = laid.nodes.find((n) => n.id === 'C')!.position;

  assert(posA.y < posB.y, 'A should be above B');
  assert(posB.y < posC.y, 'B should be above C');
  assert(laid.version > d.version, 'version should be bumped');
});

test('autoLayout grid — distributes nodes in a grid', () => {
  let d = createVisualDiagram('dbml', 'erDiagram');
  for (let i = 0; i < 9; i++) {
    d = addNode(d, createVisualNode({ id: `n${i}`, label: `Node ${i}` }));
  }

  const laid = autoLayout(d, { algorithm: 'grid' });

  // 9 nodes → 3×3 grid (ceil(sqrt(9)) = 3 columns).
  // Check that positions are spread out
  const positions = laid.nodes.map((n) => n.position);
  const uniqueX = new Set(positions.map((p) => p.x));
  const uniqueY = new Set(positions.map((p) => p.y));

  assert(uniqueX.size === 3, `Expected 3 unique x positions, got ${uniqueX.size}`);
  assert(uniqueY.size === 3, `Expected 3 unique y positions, got ${uniqueY.size}`);
});

test('autoLayout LR direction — horizontal layout', () => {
  let d = createVisualDiagram('mermaid', 'flowchart');
  d = updateDiagram(d, { direction: 'LR' });
  d = addNode(d, createVisualNode({ id: 'A', label: 'A' }));
  d = addNode(d, createVisualNode({ id: 'B', label: 'B' }));
  d = addEdge(d, createVisualEdge({ id: 'e1', sourceNodeId: 'A', targetNodeId: 'B' }));

  const laid = autoLayout(d, { algorithm: 'topological' });

  const posA = laid.nodes.find((n) => n.id === 'A')!.position;
  const posB = laid.nodes.find((n) => n.id === 'B')!.position;

  assert(posA.x < posB.x, 'A should be left of B in LR layout');
});

test('autoLayout computes group bounds', () => {
  let d = createVisualDiagram('mermaid', 'flowchart');
  d = addNode(d, createVisualNode({ id: 'A', label: 'A', parentGroupId: 'g1' }));
  d = addNode(d, createVisualNode({ id: 'B', label: 'B', parentGroupId: 'g1' }));

  const group = createVisualGroup({ id: 'g1', label: 'Group 1', nodeIds: ['A', 'B'] });
  d = updateDiagram(d, { groups: [group] });

  d = addEdge(d, createVisualEdge({ id: 'e1', sourceNodeId: 'A', targetNodeId: 'B' }));

  const laid = autoLayout(d, { algorithm: 'topological' });

  const g = laid.groups.find((g) => g.id === 'g1');
  assert(g != null, 'Group should exist');
  assert(g!.bounds != null, 'Group should have computed bounds');
  assert(g!.bounds!.width > 0, 'Group width should be > 0');
  assert(g!.bounds!.height > 0, 'Group height should be > 0');
});

test('autoLayout empty diagram — returns unchanged', () => {
  const d = createVisualDiagram('mermaid', 'flowchart');
  const laid = autoLayout(d);
  assert(laid.nodes.length === 0, 'Should have 0 nodes');
});

test('autoLayout handles cycles gracefully', () => {
  let d = createVisualDiagram('mermaid', 'flowchart');
  d = addNode(d, createVisualNode({ id: 'A', label: 'A' }));
  d = addNode(d, createVisualNode({ id: 'B', label: 'B' }));
  d = addEdge(d, createVisualEdge({ id: 'e1', sourceNodeId: 'A', targetNodeId: 'B' }));
  d = addEdge(d, createVisualEdge({ id: 'e2', sourceNodeId: 'B', targetNodeId: 'A' }));

  // Should not throw
  const laid = autoLayout(d, { algorithm: 'topological' });
  assert(laid.nodes.length === 2, 'All nodes should be positioned');
});

// ══════════════════════════════════════════════════════════════════════════════
// vcmToReactFlow collapse tests (group collapsing)
// ══════════════════════════════════════════════════════════════════════════════

import { vcmToReactFlow } from '../vcmAdapter';

test('vcmToReactFlow hides nodes in collapsed groups', () => {
  let d = createVisualDiagram('mermaid', 'flowchart');
  d = addNode(d, createVisualNode({ id: 'A', label: 'A', parentGroupId: 'g1' }));
  d = addNode(d, createVisualNode({ id: 'B', label: 'B', parentGroupId: 'g1' }));
  d = addNode(d, createVisualNode({ id: 'C', label: 'C' }));

  const group = createVisualGroup({
    id: 'g1',
    label: 'Group 1',
    nodeIds: ['A', 'B'],
    collapsed: true,
  });
  d = updateDiagram(d, { groups: [group] });

  const { nodes } = vcmToReactFlow(d);

  // A and B should be hidden, C and the group node should be visible
  const nodeIds = nodes.map((n) => n.id);
  assert(!nodeIds.includes('A'), 'A should be hidden (collapsed group)');
  assert(!nodeIds.includes('B'), 'B should be hidden (collapsed group)');
  assert(nodeIds.includes('C'), 'C should be visible');
  assert(nodeIds.includes('__group__g1'), 'Group node should be present');
});

test('vcmToReactFlow shows all nodes when groups are expanded', () => {
  let d = createVisualDiagram('mermaid', 'flowchart');
  d = addNode(d, createVisualNode({ id: 'A', label: 'A', parentGroupId: 'g1' }));
  d = addNode(d, createVisualNode({ id: 'B', label: 'B' }));

  const group = createVisualGroup({
    id: 'g1',
    label: 'Group 1',
    nodeIds: ['A'],
    collapsed: false,
  });
  d = updateDiagram(d, { groups: [group] });

  const { nodes } = vcmToReactFlow(d);
  const nodeIds = nodes.map((n) => n.id);
  assert(nodeIds.includes('A'), 'A should be visible');
  assert(nodeIds.includes('B'), 'B should be visible');
  assert(nodeIds.includes('__group__g1'), 'Group node should be present');
});

test('vcmToReactFlow filters edges for collapsed nodes', () => {
  let d = createVisualDiagram('mermaid', 'flowchart');
  d = addNode(d, createVisualNode({ id: 'A', label: 'A', parentGroupId: 'g1' }));
  d = addNode(d, createVisualNode({ id: 'B', label: 'B' }));
  d = addEdge(d, createVisualEdge({ id: 'e1', sourceNodeId: 'A', targetNodeId: 'B' }));

  const group = createVisualGroup({
    id: 'g1',
    label: 'Group 1',
    nodeIds: ['A'],
    collapsed: true,
  });
  d = updateDiagram(d, { groups: [group] });

  const { edges } = vcmToReactFlow(d);
  assert(edges.length === 0, 'Edge to collapsed node should be filtered');
});

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${failed === 0 ? '✅' : '❌'}  Step 4 tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
