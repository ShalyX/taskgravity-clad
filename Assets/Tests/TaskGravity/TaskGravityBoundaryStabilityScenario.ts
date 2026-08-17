import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    dragTaskToWorldPosition,
    ensureTaskStartsInZone,
    expectTaskFeedback,
    getStatusText,
    getTaskGravityMain,
    requireSceneObject,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityBoundaryStabilityScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await ensureTaskStartsInZone("Review notes", "Task_Notes", "NEXT")

        const nowPosition = requireSceneObject("NOW").getTransform().getWorldPosition()
        const nextPosition = requireSceneObject("NEXT").getTransform().getWorldPosition()
        const boundaryPosition = nowPosition
            .add(nextPosition)
            .uniformScale(0.5)
            .add(new vec3(0, 4, 0))

        // Releasing twice in the dead band must resolve to the same priority
        // each time; the task snaps back to NEXT instead of boundary-flipping.
        for (let attempt = 0; attempt < 2; attempt++) {
            await dragTaskToWorldPosition("Task_Notes", boundaryPosition)
            expect(getTaskGravityMain().getTaskPriority("Review notes")).toBe("NEXT")
            expect(getStatusText().text.includes("Review notes remains in NEXT")).toBe(true)
        }

        expectTaskFeedback(
            "Review notes",
            "Task_Notes",
            "NEXT",
            new vec4(1, 0.72, 0.12, 1),
        )
    }
}
