# TaskGravity

TaskGravity is a spatial task organizer for the CLAD Summer Hackathon — Week 1: Organize.

## Concept

Organize by distance, not another list:

- **NOW · NEAR** — act on it now
- **NEXT · MIDDLE** — the next layer of work
- **LATER · FAR** — keep it visible without keeping it close

The product loop is:

**capture → see → move → complete → reflow → return**

## Interaction

Voice capture uses a fixed deterministic grammar:

```text
Add [task] to [NOW|NEXT|LATER]
```

Tasks can be grabbed and moved between priority zones with Spectacles Interaction Kit (SIK) spatial manipulation. Completing a task removes it from the active workspace, persists the removal for runtime tasks, and deterministically reflows the remaining tasks in that zone.

Runtime-created tasks are persisted between supported reloads. Authored sample tasks and runtime tasks share the same workspace interaction model.

## Validation

The final TaskGravity LEAF Preview suite passed **13/13 scenarios** in Lens Studio Preview, covering visibility, Focus activation, voice/runtime creation, movement and reprioritization, boundary stability, persistence, invalid commands, completion, deterministic reflow, and duplicate-completion safety.

Physical Spectacles hardware verification was not performed; validation is limited to Lens Studio Preview.

## Project

This is the actual Lens Studio source project and its LEAF tests. It targets:

- Lens Studio 5.23
- SPECS
- CLAD

Open `TaskGravity.esproj` in Lens Studio to inspect or run the experience.
