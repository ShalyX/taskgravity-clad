import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    dragTaskToZone,
    ensureTaskStartsInZone,
    expectTaskFeedback,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityReviewNotesToNowScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await ensureTaskStartsInZone("Review notes", "Task_Notes", "NEXT")
        await dragTaskToZone("Task_Notes", "NOW")
        expectTaskFeedback(
            "Review notes",
            "Task_Notes",
            "NOW",
            new vec4(1, 0.28, 0.18, 1),
        )
    }
}
