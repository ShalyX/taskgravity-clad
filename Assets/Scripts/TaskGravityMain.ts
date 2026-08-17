import { parseTaskGravityCommand } from "./TaskGravityCommandParser"
import {
    TaskGravityTaskSystem,
    TaskGravityAuthoredTask,
} from "./TaskGravityTaskSystem"
import { TaskGravityPriority } from "./TaskGravityTypes"
import { TaskGravityUI } from "./TaskGravityUI"
import {
    TaskGravityRecognizedTranscript,
    TaskGravityVoiceController,
} from "./TaskGravityVoiceController"

export type { TaskGravityPriority } from "./TaskGravityTypes"

/**
 * TaskGravityMain — orchestrates the existing spatial task system, one-shot
 * voice command capture, and passive UI feedback.
 *
 * Inputs: authored Focus/zones/sample tasks, TaskGravityUI, and voice controller.
 * Must not create user-facing text, parse beyond the fixed grammar, or own ASR.
 */
@component
export class TaskGravityMain extends BaseScriptComponent {
    @ui.label("<span style=\"color: #60A5FA;\">TaskGravity – capture and spatial priority</span>")
    @ui.separator
    @ui.label("<span style=\"color: #60A5FA;\">References</span>")
    @ui.group_start("References")
    @input
    @hint("Central world-space Focus anchor")
    focusAnchor!: SceneObject

    @input
    @hint("Closest priority zone")
    nowZone!: SceneObject

    @input
    @hint("Middle-distance priority zone")
    nextZone!: SceneObject

    @input
    @hint("Farthest priority zone")
    laterZone!: SceneObject

    @input
    @hint("Sample task: Prepare proposal")
    taskProposal!: SceneObject

    @input
    @hint("Sample task: Review notes")
    taskNotes!: SceneObject

    @input
    @hint("Sample task: Clean inbox")
    taskInbox!: SceneObject

    @input
    @hint("World-space status readout and runtime task labels")
    ui!: TaskGravityUI

    @input
    @hint("One-shot ASR controller activated from the Focus anchor")
    voiceController!: TaskGravityVoiceController
    @ui.group_end

    @ui.separator
    @ui.label("<span style=\"color: #60A5FA;\">Debug</span>")
    @ui.group_start("Debug")
    @input
    @hint("Show task collider wireframes while debugging hand targets")
    debugColliders: boolean = false
    @ui.group_end

    private taskSystem: TaskGravityTaskSystem | null = null
    private handledRecognitionIds: Record<string, boolean> = {}

    onAwake(): void {
        this.createEvent("OnStartEvent").bind(() => this.start())
    }

    private start(): void {
        if (
            !this.focusAnchor ||
            !this.nowZone ||
            !this.nextZone ||
            !this.laterZone ||
            !this.taskProposal ||
            !this.taskNotes ||
            !this.taskInbox ||
            !this.ui
        ) {
            console.error("TaskGravityMain: required Slice 1 @input is not wired")
            return
        }

        this.taskSystem = new TaskGravityTaskSystem(
            this.getSceneObject(),
            this,
            this.ui,
            this.debugColliders,
        )

        const authoredTasks: TaskGravityAuthoredTask[] = [
            {
                id: "sample-prepare-proposal",
                label: "Prepare proposal",
                object: this.taskProposal,
                priority: "NOW",
            },
            {
                id: "sample-review-notes",
                label: "Review notes",
                object: this.taskNotes,
                priority: "NEXT",
            },
            {
                id: "sample-clean-inbox",
                label: "Clean inbox",
                object: this.taskInbox,
                priority: "LATER",
            },
        ]

        const restoredCount = this.taskSystem.initialize(
            this.nowZone,
            this.nextZone,
            this.laterZone,
            authoredTasks,
        )

        if (!this.voiceController) {
            console.error("TaskGravityMain: voiceController @input is not wired")
            this.ui.setMessage("Voice capture unavailable — spatial tasks remain active.")
        } else {
            this.voiceController.onStatus.add((message) => this.ui.setMessage(message))
            this.voiceController.onFinalTranscript.add((event) =>
                this.handleRecognizedTranscript(event),
            )

            if (restoredCount > 0) {
                this.ui.setMessage(
                    "Restored " +
                        restoredCount +
                        " saved task" +
                        (restoredCount === 1 ? "" : "s") +
                        " — pinch Focus to add.",
                )
            } else {
                this.ui.setMessage("Ready — pinch Focus to add a task")
            }
        }

        console.log(
            "TaskGravityMain: ready with 3 authored task(s) and " +
                restoredCount +
                " restored runtime task(s)",
        )
    }

    private handleRecognizedTranscript(event: TaskGravityRecognizedTranscript): void {
        this.acceptRecognizedCommand(event.text, event.recognitionId)
    }

    private acceptRecognizedCommand(transcript: string, recognitionId: string): boolean {
        if (!this.taskSystem) {
            return false
        }

        const stableRecognitionId = recognitionId.trim()
        if (
            stableRecognitionId.length === 0 ||
            this.handledRecognitionIds[stableRecognitionId]
        ) {
            return false
        }
        this.handledRecognitionIds[stableRecognitionId] = true

        const parsed = parseTaskGravityCommand(transcript)
        if (parsed.ok === false) {
            this.ui.setMessage("Invalid command — " + parsed.feedback)
            console.log("TaskGravity command rejected: " + transcript)
            return false
        }

        const id = this.taskSystem.createRuntimeTask(parsed.name, parsed.priority)
        if (!id) {
            this.ui.setMessage("Task could not be created — try again.")
            return false
        }

        this.ui.setMessage(
            "Recognized: \"" +
                transcript.trim() +
                "\"\nCreated " +
                parsed.name +
                " in " +
                parsed.priority,
        )
        console.log(
            "TaskGravity task created: " + id + " | " + parsed.name + " | " + parsed.priority,
        )
        return true
    }

    /** Read-only Slice 1 state access retained for existing LEAF scenarios. */
    public getTaskPriority(label: string): TaskGravityPriority | null {
        return this.taskSystem ? this.taskSystem.getTaskPriority(label) : null
    }

    /** Deterministic final-transcript seam; this does not fake microphone input. */
    public submitRecognizedCommandForTest(
        transcript: string,
        recognitionId: string,
    ): boolean {
        return this.acceptRecognizedCommand(transcript, recognitionId)
    }

    public createRuntimeTaskForTest(
        name: string,
        priority: TaskGravityPriority,
        id: string,
    ): string | null {
        return this.taskSystem
            ? this.taskSystem.createRuntimeTask(name, priority, id)
            : null
    }

    public getRuntimeTaskCount(): number {
        return this.taskSystem ? this.taskSystem.getRuntimeTaskCount() : 0
    }

    public getRuntimeTaskPriority(id: string): TaskGravityPriority | null {
        return this.taskSystem ? this.taskSystem.getRuntimeTaskPriority(id) : null
    }

    public getRuntimeTaskObjectName(id: string): string | null {
        return this.taskSystem ? this.taskSystem.getRuntimeTaskObjectName(id) : null
    }

    public getRuntimeTaskLabelObjectName(id: string): string | null {
        return this.taskSystem
            ? this.taskSystem.getRuntimeTaskLabelObjectName(id)
            : null
    }

    public getRuntimeTaskLabelText(id: string): string | null {
        return this.taskSystem ? this.taskSystem.getRuntimeTaskLabelText(id) : null
    }

    public getRuntimeTaskCompletionObjectName(id: string): string | null {
        return this.taskSystem
            ? this.taskSystem.getRuntimeTaskCompletionObjectName(id)
            : null
    }

    /** Test seam that calls the same atomic completion path as the production tap. */
    public completeRuntimeTaskForTest(id: string): boolean {
        return this.taskSystem ? this.taskSystem.completeRuntimeTaskForTest(id) : false
    }

    public capturePersistentSnapshotForTest(): string | null {
        return this.taskSystem
            ? this.taskSystem.capturePersistentSnapshotForTest()
            : null
    }

    public clearRuntimeTasksForTest(): void {
        if (this.taskSystem) {
            this.taskSystem.clearRuntimeTasksForTest()
        }
    }

    public reloadPersistedRuntimeTasksForTest(): number {
        return this.taskSystem
            ? this.taskSystem.reloadPersistedRuntimeTasksForTest()
            : 0
    }

    public restorePersistentSnapshotForTest(snapshot: string | null): number {
        return this.taskSystem
            ? this.taskSystem.restorePersistentSnapshotForTest(snapshot)
            : 0
    }
}
