# Visual Editor Implementation - Phase 6: Test Gates & Parity Verification

## Overview

This document outlines the test gates and quality checks implemented for the visual editors to ensure round-trip fidelity, parity between preview/editor, and robust interaction handling.

## Test Coverage

### 1. Round-trip Parity Tests (`visualEditor.test.ts`)

**Purpose**: Ensure that converting code → VCM → code produces equivalent output.

**Coverage**:
- ✅ Mermaid flowchart: simple nodes, edges, labels
- ✅ DBML tables and relationships (explicit + inferred)
- ✅ Edge labels and cardinality preservation

**Acceptance Criteria**:
- Code → parse → serialize → code produces syntactically valid output
- No data loss in round-trip conversion
- Relationship inference (FK naming conventions) works correctly

### 2. Editor Interaction Tests

**Purpose**: Verify that editor operations (CRUD) work correctly.

**Coverage**:
- ✅ Node creation with proper IDs and metadata
- ✅ Node deletion (cascades to incident edges)
- ✅ Edge creation between nodes
- ✅ Edge label updates
- ✅ Undo/redo state tracking

**Acceptance Criteria**:
- Add node: node appears in VCM with unique ID
- Delete node: node and all incident edges removed
- Create edge: edge connects correct source/target
- Update label: edge/node label changes persist
- Undo: reverts to previous state correctly
- Redo: restores next state correctly

### 3. Preview/Editor Parity Tests

**Purpose**: Ensure preview tab and editor tab render the same diagram from identical code.

**Key Test Cases**:
- Same DBML code produces same visual structure in both tabs
- Relationship inference consistent between preview and editor
- Node positions and labels match

**Acceptance Criteria**:
- Loading a diagram in preview tab shows same structure as editor tab
- Inferred relationships visible in both
- All fields/columns displayed consistently

### 4. Multi-DSL Regression Tests

**Purpose**: Ensure all supported diagram types work without regression.

**Coverage**:
- ✅ Mermaid: flowchart, classDiagram, sequenceDiagram, stateDiagram
- ✅ DBML: tables, relationships, naming convention inference
- ✅ Graphviz: node/edge definitions (if implemented)

**Acceptance Criteria**:
- Each DSL type parses without errors
- Nodes and edges extracted correctly
- Round-trip conversion succeeds

## Test Execution

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- visualEditor.test.ts

# Run with coverage
npm test -- --coverage
```

## Quality Gates (CI/CD Integration)

### Pre-merge checks:
1. ✅ All unit tests pass (visualEditor.test.ts)
2. ✅ All existing adapter tests pass (vcmAdapter.test.ts, step4.test.ts)
3. ✅ No TypeScript compilation errors
4. ✅ No ESLint warnings in editor components

### Deployment gate:
- Test coverage ≥ 80% for editor code paths
- Round-trip parity verified for all DSLs
- No performance regressions (< 100ms for typical diagram operations)

## Known Limitations & Future Work

### Current Test Coverage:
- ✅ Synchronous round-trip conversions
- ✅ Static structure validation
- ⏳ UI interaction simulation (requires React Flow mock)
- ⏳ Performance benchmarks (drag, selection, layout)
- ⏳ Cross-browser compatibility

### Future Enhancements:
1. Visual regression tests (screenshots of editor canvas)
2. Performance benchmarks for large diagrams (1000+ nodes)
3. Accessibility compliance (WCAG 2.1 AA)
4. E2E tests with Playwright (user workflows)
5. Stress tests (rapid CRUD operations, memory leaks)

## Verification Checklist

Before marking Phase 6 complete:

- [ ] All `visualEditor.test.ts` tests passing
- [ ] All existing parity tests still passing (`vcmAdapter.test.ts`)
- [ ] DBML editor round-trip verified manually with screenshot schema
- [ ] Mermaid editor round-trip verified manually with flowchart
- [ ] Undo/redo tested manually
- [ ] Keyboard shortcuts working (Ctrl+Z, Del, Ctrl+N)
- [ ] Status bar displays correct counts
- [ ] Both editors export valid code
- [ ] No console errors or warnings

## Manual Acceptance Tests

### DBML Editor Vertical Slice
**Build schema in editor**: users, posts, comments tables with fields and relationships
**Export code**: Should produce valid DBML
**Re-import**: Code re-parses with same structure

### Mermaid Editor Vertical Slice
**Build flowchart**: Multiple nodes with different shapes (rect, diamond, cylinder)
**Add labels**: All edge labels persist
**Export code**: Valid Mermaid syntax
**Re-import**: Same diagram structure

### Undo/Redo
1. Add 3 nodes
2. Ctrl+Z: revert to 2 nodes
3. Ctrl+Z: revert to 1 node
4. Ctrl+Shift+Z: forward to 2 nodes
5. Verify code matches state

## Test Reporting

All tests logged in CI/CD pipeline with:
- ✅ Pass/fail status
- 📊 Coverage percentage
- ⚠️ Any warnings or deprecations
- 📈 Performance metrics (if benchmarks added)

## References

- Unit Test File: [visualEditor.test.ts](./visualEditor.test.ts)
- Adapter Tests: [vcmAdapter.test.ts](./vcmAdapter.test.ts)
- Parser Tests: [diagramParser.ts](../diagramParser.ts)
- Editor Components: [MermaidCanvasEditor.tsx](../../components/diagramEditors/MermaidCanvasEditor.tsx), [DBMLCanvasEditor.tsx](../../components/diagramEditors/DBMLCanvasEditor.tsx)
