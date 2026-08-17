import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

export interface TaskGravityRecognizedTranscript {
    recognitionId: string
    text: string
}

/**
 * TaskGravityVoiceController — owns one-shot ASR capture from the Focus anchor.
 * It emits transcripts/status only; it must not parse commands or create tasks.
 */
@component
export class TaskGravityVoiceController extends BaseScriptComponent {
    @ui.label("<span style=\"color: #60A5FA;\">TaskGravity – voice capture</span>")
    @ui.separator
    @ui.label("<span style=\"color: #60A5FA;\">References</span>")
    @ui.group_start("References")
    @input
    @hint("Existing Focus anchor used to activate one speech capture")
    focusAnchor!: SceneObject
    @ui.group_end

    public readonly onStatus = new Event<string>()
    public readonly onFinalTranscript = new Event<TaskGravityRecognizedTranscript>()

    private readonly asrModule = require("LensStudio:AsrModule") as AsrModule
    private listening = false
    private captureSequence = 0
    private activeRecognitionId = ""

    public async stopListeningForTest(): Promise<void> {
        if (!this.listening) {
            return
        }
        this.listening = false
        this.activeRecognitionId = ""
        await this.stopTranscribingQuietly()
    }

    onAwake(): void {
        this.createEvent("OnStartEvent").bind(() => this.start())
        this.createEvent("OnDestroyEvent").bind(() => this.stopForShutdown())
    }

    private start(): void {
        if (!this.focusAnchor) {
            console.error("TaskGravityVoiceController: focusAnchor @input is not wired")
            return
        }

        let collider = this.focusAnchor.getComponent(
            "Physics.ColliderComponent",
        ) as ColliderComponent
        if (!collider) {
            collider = this.focusAnchor.createComponent(
                "Physics.ColliderComponent",
            ) as ColliderComponent
        }
        const shape = Shape.createBoxShape()
        // Focus is viewed at roughly arm-plus distance in the authored scene.
        // Keep its visual compact while giving the pinch ray a forgiving target.
        shape.size = new vec3(4, 4, 1.4)
        collider.shape = shape

        const interactable =
            (this.focusAnchor.getComponent(
                Interactable.getTypeName(),
            ) as Interactable | null) ??
            (this.focusAnchor.createComponent(Interactable.getTypeName()) as Interactable)
        interactable.targetingMode = 3
        interactable.keepHoverOnTrigger = true
        if (interactable.colliders.indexOf(collider) < 0) {
            interactable.colliders.push(collider)
        }

        interactable.onTriggerStart.add(() => this.beginListening())
        console.log("TaskGravityVoiceController: pinch Focus to capture one command")
    }

    private beginListening(): void {
        if (this.listening) {
            return
        }

        this.listening = true
        this.captureSequence++
        this.activeRecognitionId =
            "voice-" + Date.now().toString(36) + "-" + this.captureSequence

        const recognitionId = this.activeRecognitionId
        const options = AsrModule.AsrTranscriptionOptions.create()
        options.mode = AsrModule.AsrMode.HighAccuracy
        options.silenceUntilTerminationMs = 1100

        options.onTranscriptionUpdateEvent.add(
            (event: AsrModule.TranscriptionUpdateEvent) => {
                if (
                    !this.listening ||
                    recognitionId !== this.activeRecognitionId ||
                    !event.isFinal
                ) {
                    return
                }

                // Close the recognition gate before publishing. If ASR repeats
                // the final update for this capture, only the first can escape.
                this.listening = false
                this.onFinalTranscript.invoke({ recognitionId, text: event.text })
                this.stopTranscribingQuietly()
            },
        )

        options.onTranscriptionErrorEvent.add((code: AsrModule.AsrStatusCode) => {
            if (recognitionId !== this.activeRecognitionId) {
                return
            }
            this.listening = false
            this.onStatus.invoke(this.messageForError(code))
            console.log("TaskGravityVoiceController: ASR status " + code)
        })

        this.onStatus.invoke("Listening… Say: Add [task] to NOW, NEXT, or LATER")
        try {
            this.asrModule.startTranscribing(options)
        } catch (error) {
            this.listening = false
            this.onStatus.invoke("Voice input unavailable — try again.")
            console.log("TaskGravityVoiceController: could not start ASR: " + error)
        }
    }

    private messageForError(code: AsrModule.AsrStatusCode): string {
        if (code === AsrModule.AsrStatusCode.NoInternet) {
            return "Voice input needs an internet connection."
        }
        if (code === AsrModule.AsrStatusCode.Unauthenticated) {
            return "Voice input needs Lens Studio sign-in."
        }
        return "Voice input error — pinch Focus to try again."
    }

    private stopForShutdown(): void {
        if (!this.listening) {
            return
        }
        this.listening = false
        this.stopTranscribingQuietly()
    }

    private stopTranscribingQuietly(): Promise<void> {
        return this.asrModule.stopTranscribing().catch((error: unknown) => {
            console.log("TaskGravityVoiceController: ASR stop completed with " + error)
        })
    }
}
