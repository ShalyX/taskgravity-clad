import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {TaskGravityVoiceController} from "../../Scripts/TaskGravityVoiceController"
import {requireSceneObject} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityFocusActivationScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)

        const voiceObject = requireSceneObject("TaskGravityVoice")
        const voice = voiceObject.getComponent(
            TaskGravityVoiceController.getTypeName(),
        ) as TaskGravityVoiceController
        if (!voice) {
            throw new Error("TaskGravity LEAF: voice controller was not found")
        }

        const focus = findInteractableByName("Focus", undefined, true)
        if (!focus) {
            throw new Error("TaskGravity LEAF: Focus Interactable was not found or enabled")
        }

        let sawListening = false
        const unsubscribe = voice.onStatus.add((status) => {
            if (status.startsWith("Listening")) {
                sawListening = true
            }
        })

        try {
            const interactor = new DefaultLeafInteractor("TaskGravity_Focus_Interactor")
            await interactor.trigger(focus)
            await sleep(200)
        } finally {
            unsubscribe()
            await voice.stopListeningForTest()
            await sleep(200)
        }

        expect(sawListening, "Pinching Focus should start one voice capture").toBe(true)
    }
}
