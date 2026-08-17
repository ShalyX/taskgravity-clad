import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
    completeRuntimeTaskThroughProduction,
    getStatusText,
    getTaskGravityMain,
    withIsolatedRuntimeTasks,
} from "./TaskGravityLeafHelpers"

@component
export class TaskGravityRuntimeCompletionScenario extends Scenario {
    async run(): Promise<void> {
        await sleep(500)
        await withIsolatedRuntimeTasks(async (main) => {
            const id = "leaf-complete-submit-demo"
            expect(main.createRuntimeTaskForTest("Submit demo", "NOW", id)).toBe(id)

            const completionName = main.getRuntimeTaskCompletionObjectName(id)
            if (!completionName) {
                throw new Error("TaskGravity LEAF: completion affordance was not created")
            }
            await completeRuntimeTaskThroughProduction(main, id)

            expect(main.getRuntimeTaskPriority(id)).toBe(null)
            expect(main.getRuntimeTaskObjectName(id)).toBe(null)
            expect(main.getRuntimeTaskCompletionObjectName(id)).toBe(null)
            const completionObject = findSceneObjectByName(completionName)
            if (completionObject) {
                const completionVisual = completionObject.getComponent(
                    "Component.RenderMeshVisual",
                ) as RenderMeshVisual
                expect(
                    completionVisual ? completionVisual.enabled : false,
                    "Completion affordance should be hidden if cleanup is deferred",
                ).toBe(false)
            }
            expect(getStatusText().text.includes("Completed Submit demo")).toBe(true)
            expect(getTaskGravityMain().getRuntimeTaskCount()).toBe(0)
        })
    }
}
