import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    expectRuntimeTaskFeedback,
    expectRuntimeTaskVisibleLabel,
    getStatusText,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityRuntimeCreationScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const beforeCount = main.getRuntimeTaskCount()
            const recognitionId = "leaf-runtime-creation"

            const created = main.submitRecognizedCommandForTest(
                "Add Submit demo to now",
                recognitionId,
            )
            const duplicate = main.submitRecognizedCommandForTest(
                "Add Submit demo to now",
                recognitionId,
            )

            expect(created, "Valid final transcript should create a task").toBe(true)
            expect(duplicate, "A repeated recognition event must be ignored").toBe(false)
            expect(
                main.getRuntimeTaskCount() - beforeCount,
                "One recognition event should add exactly one task",
            ).toBe(1)

            const status = getStatusText().text
            expect(status.includes("Recognized:")).toBe(true)
            expect(status.includes("Created Submit demo in NOW")).toBe(true)

            // The generated ID is intentionally opaque; the single isolated
            // runtime task can be addressed by its visible task label here.
            expect(main.getTaskPriority("Submit demo")).toBe("NOW")
            expect(status.includes("Submit demo: NOW")).toBe(true)

            // Discover the generated task through its one persisted record.
            const raw = main.capturePersistentSnapshotForTest()
            if (!raw) {
                throw new Error("TaskGravity LEAF: runtime task was not persisted")
            }
            const id = (JSON.parse(raw) as Array<{id: string}>)[0].id
            expectRuntimeTaskFeedback(
                main,
                id,
                "Submit demo",
                "NOW",
                new vec4(1, 0.28, 0.18, 1),
            )
            expectRuntimeTaskVisibleLabel(main, id, "Submit demo")
        })
    }
}
