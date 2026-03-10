/**
 * VCM Adapter tests — verifies bidirectional conversions:
 *   DSL → VCM → React Flow → VCM → DSL
 *
 * Run:  npx tsx frontend/src/utils/__tests__/vcmAdapter.test.ts
 */

import {
  dslToVCM,
  vcmToDSL,
  vcmToReactFlow,
  parsedDiagramToVCM,
  reactFlowToVCM,
  roundTrip,
  diffDiagrams,
  visualNodeToRF,
  visualEdgeToRF,
} from '../vcmAdapter';
import { parseDiagramCode } from '../diagramParser';
import {
  createVisualDiagram,
  createVisualNode,
  createVisualEdge,
  addNode,
  addEdge,
  updateDiagram,
  type VisualDiagram,
} from '../../types/vcm';

// ── Helpers ────────────────────────────────────────────────────────────────────

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// ════════════════════════════════════════════════════════════════════════════════
// Test 1: Mermaid Flowchart — DSL → VCM → ReactFlow → VCM → DSL
// ════════════════════════════════════════════════════════════════════════════════

const flowchartCode = `flowchart TD
    A["Login Page"]
    B{"Valid?"}
    C["Dashboard"]
    A --> B
    B -->|yes| C
    B -->|no| A`;

const vcm1 = dslToVCM(flowchartCode, 'mermaid');

assert(vcm1.language === 'mermaid', 'flowchart language');
assert(vcm1.subType === 'flowchart', 'flowchart subType');
assert(vcm1.nodes.length === 3, `flowchart: expected 3 nodes, got ${vcm1.nodes.length}`);
assert(vcm1.edges.length === 3, `flowchart: expected 3 edges, got ${vcm1.edges.length}`);

// Shape inference from code
const nodeA = vcm1.nodes.find((n) => n.id === 'A')!;
const nodeB = vcm1.nodes.find((n) => n.id === 'B')!;
assert(nodeA.label === 'Login Page', `node A label = "${nodeA.label}"`);
assert(nodeA.shape === 'rect', `node A shape = "${nodeA.shape}" (expected rect)`);
assert(nodeB.shape === 'diamond', `node B shape = "${nodeB.shape}" (expected diamond)`);

// Edge labels preserved
const edgeYes = vcm1.edges.find((e) => e.label === 'yes');
assert(edgeYes !== undefined, 'edge with label "yes" exists');

// Convert to React Flow
const rf1 = vcmToReactFlow(vcm1);
assert(rf1.nodes.length === 3, 'RF: 3 nodes');
assert(rf1.edges.length === 3, 'RF: 3 edges');
assert(rf1.nodes.every((n) => n.data?.vcmShape), 'RF nodes carry vcmShape');

// React Flow → VCM (simulates visual edit)
const vcm1b = reactFlowToVCM(rf1.nodes, rf1.edges, vcm1);
assert(vcm1b.nodes.length === 3, 'round-trip: 3 nodes');
// Shapes preserved through round-trip
assert(vcm1b.nodes.find((n) => n.id === 'B')!.shape === 'diamond', 'diamond preserved');

// VCM → DSL
const dsl1 = vcmToDSL(vcm1);
assert(dsl1.includes('flowchart'), 'serialised contains flowchart');
assert(dsl1.includes('Login Page'), 'serialised contains label');

console.log('✅  Test 1 passed: Mermaid flowchart round-trip');

// ════════════════════════════════════════════════════════════════════════════════
// Test 2: Mermaid classDiagram — DSL → VCM → RF
// ════════════════════════════════════════════════════════════════════════════════

const classCode = `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +fetch()
    }
    Animal <|-- Dog`;

const vcm2 = dslToVCM(classCode, 'mermaid');

assert(vcm2.subType === 'classDiagram', 'classDiagram subType');
assert(vcm2.nodes.length >= 2, `class: expected ≥2 nodes, got ${vcm2.nodes.length}`);

const animal = vcm2.nodes.find((n) => n.id === 'Animal')!;
assert(animal.shape === 'table', `Animal shape = "${animal.shape}"`);
assert(animal.fields !== undefined && animal.fields.length >= 2, 'Animal has fields');
assert(animal.methods !== undefined && animal.methods.length >= 1, 'Animal has methods');

const rf2 = vcmToReactFlow(vcm2);
assert(rf2.nodes.find((n) => n.id === 'Animal')!.type === 'tableNode', 'RF: tableNode');
assert((rf2.nodes.find((n) => n.id === 'Animal')!.data as any).fields.length >= 2, 'RF: fields carried');

const dsl2 = vcmToDSL(vcm2);
assert(dsl2.includes('classDiagram'), 'serialised classDiagram');
assert(dsl2.includes('Animal'), 'serialised class name');

console.log('✅  Test 2 passed: Mermaid classDiagram');

// ════════════════════════════════════════════════════════════════════════════════
// Test 3: Mermaid erDiagram — cardinalities
// ════════════════════════════════════════════════════════════════════════════════

const erCode = `erDiagram
    CUSTOMER {
        string name
        int id
    }
    ORDER {
        int id
        int customer_id
    }
    CUSTOMER ||--o{ ORDER : "places"`;

const vcm3 = dslToVCM(erCode, 'mermaid');

assert(vcm3.subType === 'erDiagram', 'erDiagram subType');
assert(vcm3.nodes.length >= 2, 'ER: 2+ nodes');
assert(vcm3.nodes.find((n) => n.id === 'CUSTOMER')!.shape === 'table', 'CUSTOMER is table');
assert(vcm3.nodes.find((n) => n.id === 'CUSTOMER')!.fields!.length >= 2, 'CUSTOMER fields');

const dsl3 = vcmToDSL(vcm3);
assert(dsl3.includes('erDiagram'), 'serialised erDiagram');

console.log('✅  Test 3 passed: Mermaid erDiagram');

// ════════════════════════════════════════════════════════════════════════════════
// Test 4: Mermaid sequenceDiagram — lifeline shapes
// ════════════════════════════════════════════════════════════════════════════════

const seqCode = `sequenceDiagram
    participant Client
    participant Server
    Client->>Server: HTTP GET
    Server-->>Client: 200 OK`;

const vcm4 = dslToVCM(seqCode, 'mermaid');

assert(vcm4.subType === 'sequenceDiagram', 'sequenceDiagram subType');
assert(vcm4.nodes.find((n) => n.id === 'Client')!.shape === 'lifeline', 'Client is lifeline');
assert(vcm4.edges.length === 2, 'seq: 2 edges');

// Dashed edge for -->>
const returnEdge = vcm4.edges.find((e) => e.label?.includes('200'));
assert(returnEdge?.lineType === 'dashed', 'return edge is dashed');

console.log('✅  Test 4 passed: Mermaid sequenceDiagram');

// ════════════════════════════════════════════════════════════════════════════════
// Test 5: Mermaid stateDiagram — start/end shapes
// ════════════════════════════════════════════════════════════════════════════════

const stateCode = `stateDiagram-v2
    [*] --> Idle
    Idle --> Running : start
    Running --> [*]`;

const vcm5 = dslToVCM(stateCode, 'mermaid');

assert(vcm5.subType === 'stateDiagram', 'stateDiagram subType');
const startNode = vcm5.nodes.find((n) => n.id === '__start__');
assert(startNode?.shape === 'circle', 'start is circle');
const endNode = vcm5.nodes.find((n) => n.id === '__end__');
assert(endNode?.shape === 'doubleCircle', 'end is doubleCircle');

console.log('✅  Test 5 passed: Mermaid stateDiagram');

// ════════════════════════════════════════════════════════════════════════════════
// Test 6: DBML — DSL → VCM → DSL
// ════════════════════════════════════════════════════════════════════════════════

const dbmlCode = `Table users {
  id integer [primary key]
  name varchar
  email varchar
}

Table posts {
  id integer [primary key]
  user_id integer [ref: > users.id]
  title varchar
}`;

const vcm6 = dslToVCM(dbmlCode, 'dbml');

assert(vcm6.language === 'dbml', 'dbml language');
assert(vcm6.nodes.length === 2, `dbml: expected 2 nodes, got ${vcm6.nodes.length}`);
assert(vcm6.nodes.every((n) => n.shape === 'table'), 'all DBML nodes are tables');
assert(vcm6.edges.length >= 1, 'dbml: at least 1 edge');

const dsl6 = vcmToDSL(vcm6);
assert(dsl6.includes('Table'), 'serialised DBML');

console.log('✅  Test 6 passed: DBML');

// ════════════════════════════════════════════════════════════════════════════════
// Test 7: Graphviz DOT — DSL → VCM → DSL
// ════════════════════════════════════════════════════════════════════════════════

const dotCode = `digraph {
    rankdir=LR;
    API [label="API Gateway"];
    DB [label="Database"];
    API -> DB [label="query"];
}`;

const vcm7 = dslToVCM(dotCode, 'graphviz');

assert(vcm7.language === 'graphviz', 'graphviz language');
assert(vcm7.nodes.length === 2, `dot: expected 2 nodes, got ${vcm7.nodes.length}`);
assert(vcm7.nodes.find((n) => n.id === 'API')!.label === 'API Gateway', 'DOT label parsed');
assert(vcm7.edges.length === 1, 'dot: 1 edge');
assert(vcm7.edges[0].label === 'query', 'DOT edge label');

const dsl7 = vcmToDSL(vcm7);
assert(dsl7.includes('digraph'), 'serialised DOT');
assert(dsl7.includes('API Gateway'), 'serialised label');

console.log('✅  Test 7 passed: Graphviz DOT');

// ════════════════════════════════════════════════════════════════════════════════
// Test 8: reactFlowToVCM — visual edit preserves VCM metadata
// ════════════════════════════════════════════════════════════════════════════════

// Start with a VCM that has a diamond shape
let vcm8 = createVisualDiagram('mermaid', 'flowchart');
vcm8 = addNode(vcm8, createVisualNode({
  id: 'X', label: 'Check', shape: 'diamond', position: { x: 0, y: 0 },
}));
vcm8 = addNode(vcm8, createVisualNode({
  id: 'Y', label: 'Done', shape: 'roundedRect', position: { x: 200, y: 0 },
}));
vcm8 = addEdge(vcm8, createVisualEdge({
  id: 'e-XY', sourceNodeId: 'X', targetNodeId: 'Y',
  label: 'ok',
  sourceCardinality: { min: '1', max: '1' },
}));

// Simulate RF: user dragged node X to new position
const rf8 = vcmToReactFlow(vcm8);
rf8.nodes[0].position = { x: 100, y: 100 }; // drag

const vcm8b = reactFlowToVCM(rf8.nodes, rf8.edges, vcm8);

// Shape preserved even though RF doesn't carry it
assert(vcm8b.nodes.find((n) => n.id === 'X')!.shape === 'diamond', 'shape preserved after drag');
// Position updated
assert(vcm8b.nodes.find((n) => n.id === 'X')!.position.x === 100, 'position updated');
// Cardinality preserved
assert(vcm8b.edges[0].sourceCardinality?.max === '1', 'cardinality preserved');

console.log('✅  Test 8 passed: reactFlowToVCM preserves metadata');

// ════════════════════════════════════════════════════════════════════════════════
// Test 9: diffDiagrams
// ════════════════════════════════════════════════════════════════════════════════

let dA = createVisualDiagram('mermaid', 'flowchart');
dA = addNode(dA, createVisualNode({ id: 'n1', label: 'A', position: { x: 0, y: 0 } }));
dA = addNode(dA, createVisualNode({ id: 'n2', label: 'B', position: { x: 100, y: 0 } }));
dA = addEdge(dA, createVisualEdge({ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' }));

let dB = updateDiagram(dA, {
  nodes: [
    { ...dA.nodes[0], position: { x: 50, y: 50 }, label: 'A-renamed' },
    // n2 removed
    createVisualNode({ id: 'n3', label: 'C', position: { x: 200, y: 0 } }),
  ],
  edges: [],
});

const diff = diffDiagrams(dA, dB);
assert(diff.addedNodes.includes('n3'), 'n3 added');
assert(diff.removedNodes.includes('n2'), 'n2 removed');
assert(diff.movedNodes.includes('n1'), 'n1 moved');
assert(diff.renamedNodes.includes('n1'), 'n1 renamed');
assert(diff.removedEdges.includes('e1'), 'e1 removed');

console.log('✅  Test 9 passed: diffDiagrams');

// ════════════════════════════════════════════════════════════════════════════════
// Test 10: roundTrip — DSL → VCM → DSL preserves structure
// ════════════════════════════════════════════════════════════════════════════════

const rt = roundTrip(flowchartCode, 'mermaid');
// Verify structural preservation (labels and edges present)
assert(rt.includes('Login Page'), 'round-trip preserves label');
assert(rt.includes('yes'), 'round-trip preserves edge label');
assert(rt.includes('flowchart'), 'round-trip preserves directive');

console.log('✅  Test 10 passed: roundTrip');

// ════════════════════════════════════════════════════════════════════════════════
// Test 11: visualNodeToRF / visualEdgeToRF — individual converters
// ════════════════════════════════════════════════════════════════════════════════

const tableNode = createVisualNode({
  id: 'T1', label: 'Users', shape: 'table',
  fields: [
    { raw: 'int id PK', name: 'id', dataType: 'int', constraints: ['PK'] },
    { raw: 'string name', name: 'name', dataType: 'string' },
  ],
  position: { x: 50, y: 50 },
});

const rfTable = visualNodeToRF(tableNode);
assert(rfTable.type === 'tableNode', 'table → tableNode');
assert((rfTable.data as any).fields.length === 2, 'fields passed through');
assert(rfTable.position.x === 50, 'position passed through');

const dashedEdge = createVisualEdge({
  id: 'ed', sourceNodeId: 'A', targetNodeId: 'B',
  lineType: 'dashed', animated: true,
  targetArrow: 'arrowClosed',
});
const rfDash = visualEdgeToRF(dashedEdge);
assert(rfDash.animated === true, 'animated');
assert((rfDash.style as any).strokeDasharray === '6,3', 'dashed style');
assert(rfDash.markerEnd != null, 'has markerEnd');

console.log('✅  Test 11 passed: individual converters');

// ════════════════════════════════════════════════════════════════════════════════

console.log('\n✅  All VCM Adapter tests passed!\n');
