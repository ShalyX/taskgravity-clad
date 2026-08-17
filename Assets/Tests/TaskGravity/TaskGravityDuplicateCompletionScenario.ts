import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    completeRuntimeTaskThroughProduction,
    getStatusText,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityDuplicateCompletionScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const id = "leaf-duplicate-completion"
            expect(main.createRuntimeTaskForTest("Ship invoice", "NOW", id)).toBe(id)

            await completeRuntimeTaskThroughProduction(main, id)
            const snapshotAfterFirst = main.capturePersistentSnapshotForTest()
            expect(snapshotAfterFirst).not.toBeNull()

            let secondCompletionThrew = false
            try {
                expect(main.completeRuntimeTaskForTest(id)).toBe(false)
            } catch (error) {
                secondCompletionThrew = true
                throw error
            }

            expect(secondCompletionThrew).toBe(false)
            expect(main.getRuntimeTaskCount()).toBe(0)
            expect(main.capturePersistentSnapshotForTest()).toBe(snapshotAfterFirst)
            expect(getStatusText().text.includes("Completed Ship invoice")).toBe(true)
        })
    }
}
