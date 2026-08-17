import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    completeRuntimeTaskThroughProduction,
    getTaskGravityMain,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityCompletionPersistenceScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const id = "leaf-complete-persistence"
            expect(main.createRuntimeTaskForTest("Remember budget", "LATER", id)).toBe(id)
            expect(main.capturePersistentSnapshotForTest()).not.toBeNull()

            await completeRuntimeTaskThroughProduction(main, id)

            const snapshot = main.capturePersistentSnapshotForTest()
            expect(snapshot).not.toBeNull()
            expect(snapshot!.includes(id)).toBe(false)

            const restoredCount = main.reloadPersistedRuntimeTasksForTest()
            expect(restoredCount).toBe(0)
            expect(getTaskGravityMain().getRuntimeTaskCount()).toBe(0)
            expect(main.getRuntimeTaskPriority(id)).toBe(null)
        })
    }
}
