import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {TaskGravityMain, TaskGravityPriority} from "../../Scripts/TaskGravityMain"

const DRAG_DURATION_MS = 1000

export function requireSceneObject(name: string): SceneObject {
    const object = findSceneObjectByName(name)
    if (!object) {
        throw new Error(`TaskGravity LEAF: SceneObject "${name}" was not found`)
    }
    return object
}

export function getTaskGravityMain(): TaskGravityMain {
    const root = requireSceneObject("TaskGravity")
    const main = root.getComponent(TaskGravityMain.getTypeName()) as TaskGravityMain
    if (!main) {
        throw new Error("TaskGravity LEAF: TaskGravityMain component was not found")
    }
    return main
}

export function getStatusText(): Text {
    const ui = requireSceneObject("TaskGravityUI")
    const text = ui.getComponent("Component.Text") as Text
    if (!text) {
        throw new Error("TaskGravity LEAF: status Text component was not found")
    }
    return text
}

export async function dragTaskToWorldPosition(
    taskObjectName: string,
    destination: vec3,
): Promise<void> {
    const task = requireSceneObject(taskObjectName)
    const interactable = findInteractableByName(taskObjectName, undefined, true)
    if (!interactable) {
        throw new Error(`TaskGravity LEAF: Interactable "${taskObjectName}" was not found or enabled`)
    }

    const interactor = LeafHandInteractor.get("right")

    // The LEAF hand interactor applies its vector once per Preview drag update,
    // whose cadence varies with editor performance. Calibrate that cadence
    // using a zero-displacement grab/release, then divide the requested world
    // displacement by the observed update count. The hand interactor uses SIK's
    // direct pinch path, avoiding far-field plane projection for depth movement.
    let calibrationUpdates = 0
    const unsubscribeCalibration = interactable.onDragUpdate.add(() => calibrationUpdates++)
    await interactor.drag(interactable, new vec3(0, 0, 0), DRAG_DURATION_MS)
    unsubscribeCalibration()
    if (calibrationUpdates < 1) {
        throw new Error(`TaskGravity LEAF: drag calibration produced no updates for ${taskObjectName}`)
    }

    const totalDelta = destination.sub(task.getTransform().getWorldPosition())
    const perTickDelta = totalDelta.uniformScale(1 / calibrationUpdates)
    await interactor.drag(interactable, perTickDelta, DRAG_DURATION_MS)
    await sleep(500)
}

export async function dragTaskToZone(
    taskObjectName: string,
    zoneName: TaskGravityPriority,
): Promise<void> {
    const zonePosition = requireSceneObject(zoneName)
        .getTransform()
        .getWorldPosition()
        .add(new vec3(0, 4, 0))
    await dragTaskToWorldPosition(taskObjectName, zonePosition)
}

export async function ensureTaskStartsInZone(
    taskLabel: string,
    taskObjectName: string,
    zoneName: TaskGravityPriority,
): Promise<void> {
    const main = getTaskGravityMain()
    if (main.getTaskPriority(taskLabel) !== zoneName) {
        await dragTaskToZone(taskObjectName, zoneName)
    }
    expect(main.getTaskPriority(taskLabel), `${taskLabel} should start in ${zoneName}`).toBe(zoneName)
}

export function expectTaskFeedback(
    taskLabel: string,
    taskObjectName: string,
    priority: TaskGravityPriority,
    expectedColor: vec4,
): void {
    const main = getTaskGravityMain()
    expect(main.getTaskPriority(taskLabel), `${taskLabel} stored priority`).toBe(priority)

    const statusText = getStatusText().text
    expect(
        statusText.includes(`${taskLabel}: ${priority}`),
        `${taskLabel} state line should show ${priority}`,
    ).toBe(true)

    const task = requireSceneObject(taskObjectName)
    const visual = task.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (!visual) {
        throw new Error(`TaskGravity LEAF: RenderMeshVisual "${taskObjectName}" was not found`)
    }
    const color = visual.mainMaterial.mainPass.baseColor
    expect(color.r, `${taskLabel} red feedback`).toBeCloseTo(expectedColor.r)
    expect(color.g, `${taskLabel} green feedback`).toBeCloseTo(expectedColor.g)
    expect(color.b, `${taskLabel} blue feedback`).toBeCloseTo(expectedColor.b)
    expect(color.a, `${taskLabel} alpha feedback`).toBeCloseTo(expectedColor.a)

    const expectedPosition = requireSceneObject(priority)
        .getTransform()
        .getWorldPosition()
        .add(new vec3(0, 4, 0))
    expect(
        task.getTransform().getWorldPosition().distance(expectedPosition),
        `${taskLabel} should settle at ${priority}`,
    ).toBeLessThan(0.25)
}

export function expectVisible(name: string): void {
    const object = requireSceneObject(name)
    expect(object.isEnabledInHierarchy, `${name} should be visible/enabled`).toBe(true)
}

export async function withIsolatedRuntimeTasks(
    run: (main: TaskGravityMain) => Promise<void>,
): Promise<void> {
    const main = getTaskGravityMain()
    const snapshot = main.capturePersistentSnapshotForTest()
    main.clearRuntimeTasksForTest()
    await sleep(100)
    try {
        await run(main)
    } finally {
        main.restorePersistentSnapshotForTest(snapshot)
        await sleep(100)
    }
}

export function requireRuntimeTaskObject(
    main: TaskGravityMain,
    id: string,
): SceneObject {
    const objectName = main.getRuntimeTaskObjectName(id)
    if (!objectName) {
        throw new Error(`TaskGravity LEAF: runtime task "${id}" has no SceneObject`)
    }
    return requireSceneObject(objectName)
}

export async function completeRuntimeTaskThroughProduction(
    main: TaskGravityMain,
    id: string,
): Promise<void> {
    const completionName = main.getRuntimeTaskCompletionObjectName(id)
    if (!completionName) {
        throw new Error(`TaskGravity LEAF: runtime task "${id}" has no completion affordance`)
    }
    const interactable = findInteractableByName(completionName, undefined, true)
    if (!interactable) {
        throw new Error(
            `TaskGravity LEAF: completion Interactable "${completionName}" was not found or enabled`,
        )
    }
    const interactor = new DefaultLeafInteractor("TaskGravity_Completion_Interactor")
    // SIK's trigger helper waits for trigger-end. A completion callback may
    // remove/disable its target before that cleanup event in Preview, so the
    // test waits for the production callback to take effect without turning a
    // harness lifecycle detail into a 600s scenario hang.
    await Promise.race([interactor.trigger(interactable), sleep(300)])
    await sleep(150)
}

export function expectRuntimeTaskFeedback(
    main: TaskGravityMain,
    id: string,
    label: string,
    priority: TaskGravityPriority,
    expectedColor: vec4,
): void {
    expect(main.getRuntimeTaskPriority(id), `${label} stored priority`).toBe(priority)
    expect(
        getStatusText().text.includes(`${label}: ${priority}`),
        `${label} state line should show ${priority}`,
    ).toBe(true)

    const task = requireRuntimeTaskObject(main, id)
    const visual = task.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (!visual) {
        throw new Error(`TaskGravity LEAF: runtime task "${id}" has no visual`)
    }
    const color = visual.mainMaterial.mainPass.baseColor
    expect(color.r, `${label} red feedback`).toBeCloseTo(expectedColor.r)
    expect(color.g, `${label} green feedback`).toBeCloseTo(expectedColor.g)
    expect(color.b, `${label} blue feedback`).toBeCloseTo(expectedColor.b)
    expect(color.a, `${label} alpha feedback`).toBeCloseTo(expectedColor.a)
}

export function expectRuntimeTaskVisibleLabel(
    main: TaskGravityMain,
    id: string,
    expectedLabel: string,
): void {
    const labelObjectName = main.getRuntimeTaskLabelObjectName(id)
    if (!labelObjectName) {
        throw new Error(`TaskGravity LEAF: runtime task "${id}" has no label object`)
    }
    const labelObject = requireSceneObject(labelObjectName)
    expect(labelObject.isEnabledInHierarchy, `${expectedLabel} label should be visible`).toBe(true)
    const labelText = labelObject.getComponent("Component.Text") as Text
    if (!labelText) {
        throw new Error(`TaskGravity LEAF: runtime task "${id}" label has no Text component`)
    }
    expect(
        labelText.text.includes(expectedLabel),
        `Runtime label should contain "${expectedLabel}"`,
    ).toBe(true)
    expect(main.getRuntimeTaskLabelText(id)).toBe(expectedLabel)
}
