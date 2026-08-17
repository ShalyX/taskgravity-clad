import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    getStatusText,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityInvalidCommandScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const beforeCount = main.getRuntimeTaskCount()
            const created = main.submitRecognizedCommandForTest(
                "Add write release notes",
                "leaf-invalid-command",
            )

            expect(created).toBe(false)
            expect(main.getRuntimeTaskCount() - beforeCount).toBe(0)
            const feedback = getStatusText().text
            expect(feedback.includes("Invalid command")).toBe(true)
            expect(feedback.includes("NOW, NEXT, or LATER is required")).toBe(true)
        })
    }
}
