import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    dragTaskToZone,
    ensureTaskStartsInZone,
    expectTaskFeedback,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityCleanInboxToNextScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await ensureTaskStartsInZone("Clean inbox", "Task_Inbox", "LATER")
        await dragTaskToZone("Task_Inbox", "NEXT")
        expectTaskFeedback(
            "Clean inbox",
            "Task_Inbox",
            "NEXT",
            new vec4(1, 0.72, 0.12, 1),
        )
    }
}
