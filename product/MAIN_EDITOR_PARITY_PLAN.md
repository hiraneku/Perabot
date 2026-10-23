# Main Editor: Blender-class capability plan

## Product target

The **Modeling / Main Editor** is a general-purpose 3D creation environment. Blender-class breadth is the target; work is sequenced into deliverable milestones, not reduced to architecture-only features. House mode remains separate.

## Existing capability inventory (initial code audit)

Already present in some form: object-level translate/rotate/scale, multi-select, simple groups, undo/redo, snapping, primitive catalog, basic material properties and procedural pattern presets, limited deform/mirror modifiers, subdivision-style block cuts, CSG, custom lathe/extrude profiles, model import/export, terrain sculpting, camera presets, and studio snapshots.

Do not duplicate these. Extend them where appropriate. Existing features are not assumed to equal Blender equivalents: terrain sculpt is not general mesh sculpt; current modifier controls are not an arbitrary modifier stack; basic material parameters are not a node graph.

## Stage 1 capability tracks

1. **Mesh topology / Edit Mode** — Object/Edit modes; vertex/edge/face selection and feedback; component transforms; extrude, inset, bevel, loop cut, dissolve/merge, normals, proportional editing and snapping; persisted topology; undo/redo and export integration.
2. **Scene hierarchy** — outliner with collections, parent-child transforms, visibility, selectability, locking, mobile-friendly filtering and reordering.
3. **General sculpting** — sculpt arbitrary supported meshes; brush controls, symmetry, masks, remesh/subdivision and undo-safe strokes. Preserve terrain sculpt.
4. **UV editing** — UV channels, seams/unwrap, pack, inspect and edit UV islands; persistence and export.
5. **Material node graph** — typed nodes for materials/textures/mapping/output, validation and mobile-capable graph editing.
6. **Animation and rigging** — timeline, keyframes, channels/dope sheet, interpolation, transform animation, armatures/weights and playback.
7. **Geometry nodes, compositing, rendering, workspaces** — non-destructive node graphs, render settings/output and extensible editor/workspace layout.

## Mobile-first acceptance criteria for every track

- Every core action works by touch; no required hover, right-click or keyboard shortcut.
- Touch targets generally at least 44 CSS px; controls remain reachable on phone portrait and landscape.
- Viewport gestures do not conflict with camera navigation, object/component selection or tools; modes and gesture feedback are explicit.
- Frequent tools use compact contextual trays; advanced controls expand on demand without permanently consuming the viewport.
- Undo/redo remains available for destructive/high-impact edits; operations provide clear parameters and preview where feasible.
- Performance/memory are checked against mobile-class GPU budgets; large meshes or graphs degrade gracefully.
- Responsive layouts are verified at phone portrait, phone landscape and tablet widths. Desktop shortcuts are supplemental, never required.

## First implementation slice started

The mesh-topology foundation now includes editable local-space polygon data, welding render vertices into topology, validation, conversion back to render geometry, face extrusion/inset, vertex translation, and focused regression tests. StudioEngine can create and persist editable topology on a selected non-house object. **This is not yet a complete user-facing Edit Mode**: component picking/visual feedback and a touch-first tool tray are the next required deliverable before claiming mesh editing is available to users.
