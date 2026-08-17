# TaskGravity — CLAD Prompt Log

**Hackathon:** CLAD Summer Hackathon — Week 1: Organize  
**Project:** TaskGravity  
**Platform:** Lens Studio SPECS  
**AI workflow:** Codex + CLAD  
**Repository:** https://github.com/ShalyX/taskgravity-clad  
**Demo:** https://youtu.be/8X2JdTtoLUM

## Product loop

**capture → see → move → complete → reflow → return**

TaskGravity organizes tasks spatially by distance: **NOW · NEAR**, **NEXT · MIDDLE**, **LATER · FAR**.

This log preserves the major build prompts used during development and the verified result of each iteration. It is a selected workflow transcript, not a claim that every conversational message is reproduced.

---

## 1. Initial spatial vertical slice

### Prompt

Using SPECS experience builder, build the first functional vertical slice of TaskGravity in the currently open Lens Studio SPECS project.

Product concept:
TaskGravity is a spatial task organizer where priority is represented by physical distance from the user.

For this first slice, keep the scope extremely small.

Build only:
1. A central world-space “Focus” anchor.
2. Three task zones around it: NOW — closest, NEXT — middle distance, LATER — farthest.
3. Create three sample task objects so the spatial priority model is immediately visible.
4. Make each task grabbable with hand interaction.
5. When a task is moved between zones, update its priority/state to match the destination zone.
6. Give clear visual feedback when a task enters a different zone.
7. Keep the layout readable and usable on SPECS.
8. Use simple native geometry and UI for now. Do not spend time on branding, decorative effects, generated art, or polish.

Important:
- Work directly in the existing Lens Studio project.
- Use CLAD/Lens Studio tools rather than only describing code.
- Inspect the scene before editing.
- Verify the result in Preview after building.
- Check Lens Studio logs for errors.
- Fix any errors you encounter.
- Use LEAF or available interaction testing where appropriate.
- Do not invent features beyond this scope.
- Do not add voice input, persistence, deadlines, completion flows, menus, onboarding, or extra features yet.

Acceptance criteria:
- I can see Focus, NOW, NEXT, and LATER in Preview.
- Three sample tasks are visible.
- A task can be grabbed and repositioned.
- Moving a task into another zone changes its stored priority.
- The priority change is visibly communicated.
- Preview runs without blocking script errors.

Start building now.

### Verified result

CLAD created the Focus anchor, NOW/NEXT/LATER zones, three sample tasks, SIK grab interaction, zone-based priority updates, and visible state feedback. Preview verified authored task movement with no blocking TaskGravity errors.

---

## 2. Harden interaction + add LEAF regression coverage

### Prompt

Using SPECS experience builder, harden the existing TaskGravity vertical slice before adding any new product features.

Do not redesign the experience and do not add voice input, persistence, task creation, deadlines, menus, onboarding, branding, generated assets, or decorative effects.

Work only on verification, interaction robustness, and automated regression coverage.

Make zone detection robust so priority changes only on clear entry, avoids boundary flicker, resolves to one stable priority on release, and recovers invalid priority values deterministically.

Add LEAF regression coverage for:
- Review notes: NEXT → NOW
- Clean inbox: LATER → NEXT
- Initial visibility of Focus, all three zones, and all three sample tasks

Run the scenarios, fix failures, then manually verify grabbing, transitions, readability, and logs in Preview.

### Verified result

CLAD added strict entry radii plus wider retention radii, X/Z-plane zone detection, atomic release resolution, deterministic invalid-state recovery, and read-only priority access for tests. Boundary stability was added as an additional LEAF scenario. All tests passed.

---

## 3. Voice creation + runtime tasks + persistence

### Prompt

Using SPECS experience builder, extend the existing tested TaskGravity project with the second functional vertical slice.

Goal:
A user should be able to create a real TaskGravity task using their voice, place it into NOW / NEXT / LATER, and have that task survive an experience restart.

Preserve all existing behavior and all existing LEAF tests.

Build:
- one-shot voice input using the supported SPECS/Lens Studio speech capability
- deterministic grammar: `Add [task name] to [NOW|NEXT|LATER]`
- runtime-created tasks using the existing TaskGravity interaction model
- deterministic per-zone placement
- persistence storing only task `id`, `name`, and `priority`
- safe restoration on startup
- minimal feedback for Listening, recognized command, task created, invalid command, and restored tasks
- duplicate-final protection and malformed-storage recovery

Add regression coverage for runtime creation, runtime movement, persistence round trip, and invalid-command rejection.

Do not add open-ended AI parsing, deadlines, editing, collaboration, cloud sync, onboarding, generated art, or other feature scope.

### Verified result

CLAD added Focus-triggered one-shot ASR, the fixed command parser, runtime task creation, deterministic layout, persistence, malformed-storage recovery, duplicate-final protection, and new LEAF scenarios. Live microphone task creation was later manually confirmed in Lens Studio Preview.

---

## 4. Slice 3 — completion + deterministic reflow

### Initial request

Using SPECS experience builder, extend the existing tested TaskGravity project with the third and final functional product slice.

Goal:
Add task completion as a spatial interaction and make the remaining tasks reflow cleanly afterward.

Requirements included:
- intentional completion separate from ordinary grabbing
- task-named completion feedback
- removal from active workspace and persisted active runtime state
- deterministic, non-overlapping reflow in the affected zone
- atomic/idempotent completion safety
- preservation of the fixed voice grammar
- new LEAF scenarios for runtime completion, completion persistence, zone reflow, and duplicate completion safety
- rerun all existing regressions

### First result

The first response did **not** implement the requested functionality. It only reran an existing Focus activation test and reported no file changes.

---

## 5. Closed-loop correction after failed implementation

### Prompt

The previous response did not implement Slice 3.

You only re-ran the existing Focus activation test and reported no file changes.

Slice 3 requires NEW functionality: task completion plus spatial reflow.

Please implement the requested Slice 3 now.

Required behavior:
1. Add an intentional completion interaction for authored and runtime tasks that does not trigger during normal grab/reprioritization.
2. On completion, show confirmation, remove the task from active workspace, remove runtime state from memory and persistence, and ensure it does not return after reload.
3. Reflow remaining tasks deterministically with no overlaps or unnecessary movement in unrelated zones.
4. Make completion atomic and idempotent.
5. Preserve Focus, zones, grabbing, reprioritization, voice creation, persistence, and all existing LEAF tests.
6. Add and run:
   - Scenario H — Runtime task completion
   - Scenario I — Completion persistence
   - Scenario J — Zone reflow
   - Scenario K — Duplicate completion safety
7. Rerun every previous TaskGravity LEAF test.
8. Manually verify reprioritization, completion, feedback, disappearance, reflow, and logs in Preview.

Do not claim Slice 3 is complete unless the new completion/reflow functionality was actually implemented and the new tests were run.

### Verified result

CLAD then implemented a separate green SIK completion child per task, distinct from the draggable collider. H–K passed, prior tests passed, completed runtime tasks did not restore after persistence reload, and deterministic reflow was verified.

---

## 6. Final polish pass

### Prompt

Using SPECS experience builder, begin the TaskGravity polish phase.

The product functionality is now frozen.

Do NOT add new features.

Existing product loop:
**capture → see → move → complete → reflow → return**

Improve spatial composition, readability, visual hierarchy, interaction clarity, and motion quality without changing the product model.

Refine:
- Focus position and zone spacing
- task spacing and readable sightlines
- hierarchy between tasks, zones, and feedback
- task identity and interaction affordance
- NOW/NEXT/LATER distinction using more than color alone
- controlled easing for snap, completion, and reflow
- concise, spatially stable feedback
- performance and Preview readability

Avoid excessive glow, generic neon-tech styling, decorative gradients, unnecessary cards, particles, random flying lines, and feature creep.

Rerun the entire TaskGravity LEAF suite after visual/motion changes and restore Preview to a clean initial state.

### Verified result

CLAD added authored task labels, `NOW · NEAR / NEXT · MIDDLE / LATER · FAR`, visible completion check marks, a smaller/repositioned status readout, eased snap/reflow motion, reduced grab highlight scale, and safer delayed completion cleanup.

The polish pass exposed two regressions:
- initial visibility failed because required Focus wording had been removed; CLAD restored it
- direct completion cleanup produced transient SIK null-object errors; CLAD delayed destruction and removed the runtime error

Final result: **13/13 LEAF Preview scenarios passed**.

---

## Final LEAF suite

1. `taskgravity_review_notes_next_to_now`
2. `taskgravity_clean_inbox_later_to_next`
3. `taskgravity_initial_visibility`
4. `taskgravity_boundary_stability`
5. `taskgravity_runtime_creation`
6. `taskgravity_runtime_movement`
7. `taskgravity_persistence_roundtrip`
8. `taskgravity_invalid_command`
9. `taskgravity_focus_activation`
10. `taskgravity_runtime_completion`
11. `taskgravity_completion_persistence`
12. `taskgravity_zone_reflow`
13. `taskgravity_duplicate_completion`

**Final validation: 13/13 passed in Lens Studio Preview.**

## Verification boundary

Physical Spectacles hardware testing was not performed. Live ASR was successfully exercised in Lens Studio Preview. LEAF/Preview verification covered the deterministic interaction and state pathways used by the project.
