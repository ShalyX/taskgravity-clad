import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    completeRuntimeTaskThroughProduction,
    requireRuntimeTaskObject,
    requireSceneObject,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityZoneReflowScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const ids = ["leaf-reflow-a", "leaf-reflow-b", "leaf-reflow-c"]
            expect(main.createRuntimeTaskForTest("Alpha", "NOW", ids[0])).toBe(ids[0])
            expect(main.createRuntimeTaskForTest("Beta", "NOW", ids[1])).toBe(ids[1])
            expect(main.createRuntimeTaskForTest("Gamma", "NOW", ids[2])).toBe(ids[2])
            expect(main.createRuntimeTaskForTest("Unrelated", "NEXT", "leaf-reflow-other")).toBe(
                "leaf-reflow-other",
            )

            const unrelatedBefore = requireRuntimeTaskObject(main, "leaf-reflow-other")
                .getTransform()
                .getWorldPosition()
            await completeRuntimeTaskThroughProduction(main, ids[1])

            expect(main.getRuntimeTaskPriority(ids[0])).toBe("NOW")
            expect(main.getRuntimeTaskPriority(ids[2])).toBe("NOW")
            expect(main.getRuntimeTaskPriority("leaf-reflow-other")).toBe("NEXT")

            const nowPosition = requireSceneObject("NOW")
                .getTransform()
                .getWorldPosition()
            const alphaPosition = requireRuntimeTaskObject(main, ids[0])
                .getTransform()
                .getWorldPosition()
            const gammaPosition = requireRuntimeTaskObject(main, ids[2])
                .getTransform()
                .getWorldPosition()
            expect(alphaPosition.distance(nowPosition.add(new vec3(-4, 10.5, 0)))).toBeLessThan(
                0.05,
            )
            expect(gammaPosition.distance(nowPosition.add(new vec3(4, 10.5, 0)))).toBeLessThan(
                0.05,
            )
            expect(alphaPosition.distance(gammaPosition)).toBeGreaterThan(7.5)

            const unrelatedAfter = requireRuntimeTaskObject(main, "leaf-reflow-other")
                .getTransform()
                .getWorldPosition()
            expect(unrelatedBefore.distance(unrelatedAfter)).toBeLessThan(0.01)
        })
    }
}
