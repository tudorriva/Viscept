/**
 * VCM smoke-test — verifies that every interface, factory, look-up and
 * mutation helper compiles correctly and behaves as expected.
 *
 * Run:  npx tsx frontend/src/types/__tests__/vcm.test.ts
 *   or: npx vitest run --reporter verbose -- vcm.test
 */

import {
  // Types
  type VisualDiagram,
  type VisualNode,
  type VisualEdge,
  type VisualGroup,
  type VisualPort,
  type VisualStyle,
  type VisualTheme,
  type NodeShape,
  type EdgeLineType,
  type ArrowShape,
  type Cardinality,
  type DiagramLanguage,
  type DiagramSubType,
  type NodeField,

  // Factories
  createVisualDiagram,
  createVisualNode,
  createVisualEdge,
  createVisualGroup,
  DEFAULT_PORTS,

  // Look-ups
  findNode,
  findEdge,
  findGroup,
  nodesInGroup,
  edgesForNode,

  // Mutations
  updateDiagram,
  replaceNode,
  replaceEdge,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  moveNode,
  updateNodeLabel,

  // Validation
  validateDiagram,
} from '../vcm';

// ─── Helper to assert ──────────────────────────────────────────────────────────

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// ─── 1.  Factory defaults ──────────────────────────────────────────────────────

const diagram = createVisualDiagram('mermaid', 'flowchart');
assert(diagram.language === 'mermaid', 'language');
assert(diagram.subType === 'flowchart', 'subType');
assert(diagram.version === 0, 'initial version is 0');
assert(diagram.nodes.length === 0, 'empty nodes');
assert(diagram.edges.length === 0, 'empty edges');
assert(diagram.groups.length === 0, 'empty groups');

const node = createVisualNode({ id: 'A', label: 'Start' });
assert(node.shape === 'roundedRect', 'default shape');
assert(node.ports.length === 4, '4 default ports');

const edge = createVisualEdge({ id: 'e1', sourceNodeId: 'A', targetNodeId: 'B' });
assert(edge.lineType === 'solid', 'default lineType');
assert(edge.targetArrow === 'arrowClosed', 'default target arrow');
assert(!edge.animated, 'not animated by default');

const group = createVisualGroup({ id: 'g1', label: 'Backend Services' });
assert(group.nodeIds.length === 0, 'empty nodeIds');
assert(!group.collapsed, 'not collapsed by default');

// ─── 2.  Build a small diagram ─────────────────────────────────────────────────

let d = createVisualDiagram('mermaid', 'flowchart');

// Add nodes
const nodeA = createVisualNode({ id: 'A', label: 'Login', position: { x: 0, y: 0 } });
const nodeB = createVisualNode({ id: 'B', label: 'Validate', position: { x: 300, y: 0 } });
const nodeC = createVisualNode({
  id: 'C', label: 'Decision', shape: 'diamond', position: { x: 150, y: 150 },
});

d = addNode(d, nodeA);
d = addNode(d, nodeB);
d = addNode(d, nodeC);
assert(d.nodes.length === 3, '3 nodes');
assert(d.version === 3, 'version bumped 3 times');

// Add edges
d = addEdge(d, createVisualEdge({ id: 'e-AB', sourceNodeId: 'A', targetNodeId: 'B', label: 'submit' }));
d = addEdge(d, createVisualEdge({ id: 'e-BC', sourceNodeId: 'B', targetNodeId: 'C' }));
assert(d.edges.length === 2, '2 edges');

// ─── 3.  Look-ups ──────────────────────────────────────────────────────────────

assert(findNode(d, 'A')?.label === 'Login', 'findNode');
assert(findEdge(d, 'e-AB')?.label === 'submit', 'findEdge');
assert(edgesForNode(d, 'B').length === 2, 'edgesForNode B has 2 connections');
assert(findNode(d, 'MISSING') === undefined, 'missing node returns undefined');

// ─── 4.  Mutations ─────────────────────────────────────────────────────────────

const d2 = moveNode(d, 'A', { x: 100, y: 200 });
assert(d2.version === d.version + 1, 'version bumped on move');
assert(findNode(d2, 'A')!.position.x === 100, 'position updated');
// Original untouched (immutable)
assert(findNode(d, 'A')!.position.x === 0, 'original unchanged');

const d3 = updateNodeLabel(d2, 'A', 'Auth');
assert(findNode(d3, 'A')!.label === 'Auth', 'label updated');

const d4 = removeNode(d3, 'C');
assert(d4.nodes.length === 2, 'node removed');
assert(d4.edges.length === 1, 'connected edge removed');

const d5 = removeEdge(d4, 'e-AB');
assert(d5.edges.length === 0, 'edge removed');

// ─── 5.  Groups ─────────────────────────────────────────────────────────────────

let gd = createVisualDiagram('graphviz', 'digraph');
gd = addNode(gd, createVisualNode({ id: 'n1', label: 'API', parentGroupId: 'cluster0' }));
gd = addNode(gd, createVisualNode({ id: 'n2', label: 'DB',  parentGroupId: 'cluster0' }));
gd = addNode(gd, createVisualNode({ id: 'n3', label: 'Frontend' }));

const cluster = createVisualGroup({
  id: 'cluster0',
  label: 'Backend',
  nodeIds: ['n1', 'n2'],
});
gd = updateDiagram(gd, { groups: [cluster] });

assert(nodesInGroup(gd, 'cluster0').length === 2, '2 nodes in cluster');
assert(findGroup(gd, 'cluster0')!.label === 'Backend', 'findGroup');

// ─── 6.  ER diagram with cardinalities ──────────────────────────────────────────

let er = createVisualDiagram('mermaid', 'erDiagram');
const customer = createVisualNode({
  id: 'CUSTOMER', label: 'CUSTOMER', shape: 'table',
  fields: [
    { raw: 'string name', name: 'name', dataType: 'string' },
    { raw: 'int id PK', name: 'id', dataType: 'int', constraints: ['PK'] },
  ],
});
const order = createVisualNode({
  id: 'ORDER', label: 'ORDER', shape: 'table',
  fields: [
    { raw: 'int id PK', name: 'id', dataType: 'int', constraints: ['PK'] },
    { raw: 'int customer_id FK', name: 'customer_id', dataType: 'int', constraints: ['FK'] },
  ],
});
er = addNode(er, customer);
er = addNode(er, order);

const erEdge = createVisualEdge({
  id: 'e-cust-ord',
  sourceNodeId: 'CUSTOMER',
  targetNodeId: 'ORDER',
  label: 'places',
  sourceCardinality: { min: '1', max: '1' },
  targetCardinality: { min: '0', max: 'n' },
});
er = addEdge(er, erEdge);

assert(findEdge(er, 'e-cust-ord')!.sourceCardinality!.max === '1', 'source card');
assert(findEdge(er, 'e-cust-ord')!.targetCardinality!.max === 'n', 'target card');

// ─── 7.  Sequence diagram with lifelines ────────────────────────────────────────

let seq = createVisualDiagram('mermaid', 'sequenceDiagram');
seq = addNode(seq, createVisualNode({ id: 'Client', label: 'Client', shape: 'lifeline' }));
seq = addNode(seq, createVisualNode({ id: 'Server', label: 'Server', shape: 'lifeline' }));
seq = addEdge(seq, createVisualEdge({
  id: 'e-msg1', sourceNodeId: 'Client', targetNodeId: 'Server',
  label: 'HTTP GET', lineType: 'solid',
}));
assert(findNode(seq, 'Client')!.shape === 'lifeline', 'lifeline shape');

// ─── 8.  Validation ─────────────────────────────────────────────────────────────

const bad = createVisualDiagram();
bad.edges.push(createVisualEdge({ id: 'e-bad', sourceNodeId: 'X', targetNodeId: 'Y' }));
bad.groups.push(createVisualGroup({ id: 'g-bad', label: 'Ghost', nodeIds: ['Z'] }));

const warnings = validateDiagram(bad);
assert(warnings.length >= 3, `expected ≥3 warnings, got ${warnings.length}: ${warnings.join('; ')}`);

// ─── 9.  Theme interface smoke check ────────────────────────────────────────────

const themeOverride: VisualTheme = {
  canvasBackground: '#0a0e27',
  nodeDefaults: { fill: '#141b2e', stroke: '#3b82f6', strokeWidth: 2, borderRadius: 8 },
  shapeDefaults: {
    diamond: { fill: '#1a2340', minWidth: 100, minHeight: 100 },
    cylinder: { fill: '#232f45', borderRadius: 50 },
  },
  edgeDefaults: { stroke: '#64748b', strokeWidth: 2 },
  groupDefaults: { fill: 'rgba(59,130,246,0.1)', stroke: '#3b82f6', strokeDasharray: '5,5' },
  gridSize: 16,
};
// Just verify it type-checks — no runtime assertion needed
const themed = updateDiagram(d, { theme: themeOverride });
assert(themed.theme?.gridSize === 16, 'theme applied');

// ─── Done ───────────────────────────────────────────────────────────────────────

console.log('✅  All VCM tests passed!');
