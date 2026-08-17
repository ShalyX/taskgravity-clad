import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    expectRuntimeTaskFeedback,
    expectRuntimeTaskVisibleLabel,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityPersistenceRoundTripScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const id = "leaf-persistence-roundtrip"
            expect(main.createRuntimeTaskForTest("Remember budget", "LATER", id)).toBe(id)
            expect(main.capturePersistentSnapshotForTest()).not.toBeNull()

            // Closest deterministic Preview lifecycle seam: destroy every
            // runtime object, then rebuild exclusively from PersistentStorage.
            const restoredCount = main.reloadPersistedRuntimeTasksForTest()
            expect(restoredCount).toBe(1)
            expect(main.getRuntimeTaskCount()).toBe(1)
            expectRuntimeTaskFeedback(
                main,
                id,
                "Remember budget",
                "LATER",
                new vec4(0.28, 0.58, 1, 1),
            )
            expectRuntimeTaskVisibleLabel(main, id, "Remember budget")
        })
    }
}
