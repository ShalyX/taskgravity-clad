import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    expectVisible,
    getStatusText,
    getTaskGravityMain,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityInitialVisibilityScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)

        for (const name of [
            "Focus",
            "NOW",
            "NEXT",
            "LATER",
            "Task_Proposal",
            "Task_Notes",
            "Task_Inbox",
        ]) {
            expectVisible(name)
        }

        const status = getStatusText().text
        for (const label of [
            "FOCUS anchor",
            "NOW",
            "NEXT",
            "LATER",
            "Prepare proposal",
            "Review notes",
            "Clean inbox",
        ]) {
            expect(status.includes(label), `Initial UI should include "${label}"`).toBe(true)
        }

        const main = getTaskGravityMain()
        expect(main.getTaskPriority("Prepare proposal")).toBe("NOW")
        expect(main.getTaskPriority("Review notes")).toBe("NEXT")
        expect(main.getTaskPriority("Clean inbox")).toBe("LATER")
    }
}
