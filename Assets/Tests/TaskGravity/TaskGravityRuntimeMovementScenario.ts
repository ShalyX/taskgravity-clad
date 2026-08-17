import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    dragTaskToZone,
    expectRuntimeTaskFeedback,
    expectRuntimeTaskVisibleLabel,
    requireRuntimeTaskObject,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityRuntimeMovementScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const id = "leaf-reply-sponsor"
            expect(main.createRuntimeTaskForTest("Reply sponsor", "LATER", id)).toBe(id)
            expect(main.getRuntimeTaskPriority(id)).toBe("LATER")

            const objectName = main.getRuntimeTaskObjectName(id)
            if (!objectName) {
                throw new Error("TaskGravity LEAF: Reply sponsor object was not created")
            }
            await dragTaskToZone(objectName, "NEXT")

            expectRuntimeTaskFeedback(
                main,
                id,
                "Reply sponsor",
                "NEXT",
                new vec4(1, 0.72, 0.12, 1),
            )
            expectRuntimeTaskVisibleLabel(main, id, "Reply sponsor")

            const task = requireRuntimeTaskObject(main, id)
            const settledPosition = task.getTransform().getWorldPosition()
            await sleep(400)
            expect(
                task.getTransform().getWorldPosition().distance(settledPosition),
                "Runtime task should remain stable after release",
            ).toBeLessThan(0.05)
        })
    }
}
