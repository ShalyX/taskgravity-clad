import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import { InteractableManipulation } from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import { TaskGravityPersistence } from "./TaskGravityPersistence"
import {
    isTaskGravityPriority,
    TaskGravityPersistedTask,
    TaskGravityPriority,
} from "./TaskGravityTypes"
import { TaskGravityUI } from "./TaskGravityUI"

interface ZoneRef {
    key: TaskGravityPriority
    object: SceneObject
    enterRadius: number
    retainRadius: number
}

interface TaskMotion {
    start: vec3
    target: vec3
    elapsed: number
    duration: number
}

interface TaskRef {
    id: string
    label: string
    object: SceneObject
    currentZone: TaskGravityPriority
    baseScale: vec3
    material: Material | null
    manipulation: InteractableManipulation | null
    isManipulating: boolean
    isRuntime: boolean
    labelObject: SceneObject | null
    completionObject: SceneObject | null
    isCompleted: boolean
    destructionScheduled: boolean
    motion: TaskMotion | null
}

export interface TaskGravityAuthoredTask {
    id: string
    label: string
    object: SceneObject
    priority: TaskGravityPriority
}

/**
 * TaskGravityTaskSystem — single owner of authored/runtime task state,
 * manipulation, zone resolution, visual feedback, deterministic placement,
 * and the persisted runtime-task projection. It does not capture speech.
 */
export class TaskGravityTaskSystem {
    private static readonly TASK_LAYER_BASE_Y = 10.5
    private static readonly TASK_LAYER_STEP_Y = 6.5
    private static readonly TASK_SLOT_X = 4

    private readonly taskColors: Record<TaskGravityPriority, vec4> = {
        NOW: new vec4(1, 0.28, 0.18, 1),
        NEXT: new vec4(1, 0.72, 0.12, 1),
        LATER: new vec4(0.28, 0.58, 1, 1),
    }

    private readonly persistence = new TaskGravityPersistence()
    private zones: ZoneRef[] = []
    private tasks: TaskRef[] = []
    private templateTask: TaskRef | null = null
    private idSequence = 0

    constructor(
        private readonly root: SceneObject,
        private readonly eventOwner: BaseScriptComponent,
        private readonly ui: TaskGravityUI,
        private readonly debugColliders: boolean,
    ) {
        const update = this.eventOwner.createEvent("UpdateEvent") as UpdateEvent
        update.bind(() => this.updateTaskMotion())
    }

    initialize(
        nowZone: SceneObject,
        nextZone: SceneObject,
        laterZone: SceneObject,
        authoredTasks: TaskGravityAuthoredTask[],
    ): number {
        // Entry thresholds are strict; wider retain thresholds create a stable
        // release-time dead band. X/Z-only distance ignores normal hand lift.
        this.zones = [
            { key: "NOW", object: nowZone, enterRadius: 6, retainRadius: 8 },
            { key: "NEXT", object: nextZone, enterRadius: 7, retainRadius: 9 },
            { key: "LATER", object: laterZone, enterRadius: 8, retainRadius: 10 },
        ]

        this.tasks = authoredTasks.map((definition) => ({
            id: definition.id,
            label: definition.label,
            object: definition.object,
            currentZone: definition.priority,
            baseScale: definition.object.getTransform().getLocalScale().clone(),
            material: null,
            manipulation: null,
            isManipulating: false,
            isRuntime: false,
            labelObject: null,
            completionObject: null,
            isCompleted: false,
            destructionScheduled: false,
            motion: null,
        }))
        this.templateTask = this.tasks.length > 0 ? this.tasks[0] : null

        this.ui.createZoneLabel(nowZone, "NOW", "NOW · NEAR")
        this.ui.createZoneLabel(nextZone, "NEXT", "NEXT · MIDDLE")
        this.ui.createZoneLabel(laterZone, "LATER", "LATER · FAR")

        for (const task of this.tasks) {
            this.enableTaskInteraction(task)
            this.setTaskVisual(task, task.currentZone)
            task.labelObject = this.ui.createTaskLabel(task.object, task.id, task.label)
        }

        let restoredCount = 0
        for (const saved of this.persistence.load()) {
            if (this.createRuntimeTaskRecord(saved)) {
                restoredCount++
            }
        }

        this.relayoutRuntimeTasks(undefined, false)
        this.publishState()
        if (this.debugColliders) {
            this.setColliderDebugAll(this.root, true)
        }
        return restoredCount
    }

    createRuntimeTask(
        name: string,
        priority: TaskGravityPriority,
        requestedId?: string,
    ): string | null {
        const safeName = name.trim()
        if (safeName.length === 0 || !isTaskGravityPriority(priority)) {
            return null
        }

        const id = requestedId ? requestedId.trim() : this.createUniqueId()
        if (id.length === 0 || this.hasTaskId(id)) {
            return null
        }

        const task = this.createRuntimeTaskRecord({ id, name: safeName, priority })
        if (!task) {
            return null
        }

        this.relayoutRuntimeTasks(priority, false)
        this.persistRuntimeTasks()
        this.publishState()
        return id
    }

    getTaskPriority(label: string): TaskGravityPriority | null {
        for (const task of this.tasks) {
            if (task.label === label) {
                return this.ensureValidPriority(task)
            }
        }
        return null
    }

    getRuntimeTaskPriority(id: string): TaskGravityPriority | null {
        const task = this.findRuntimeTask(id)
        return task ? this.ensureValidPriority(task) : null
    }

    getRuntimeTaskCount(): number {
        return this.tasks.filter((task) => task.isRuntime).length
    }

    getRuntimeTaskObjectName(id: string): string | null {
        const task = this.findRuntimeTask(id)
        return task ? task.object.name : null
    }

    getRuntimeTaskLabelObjectName(id: string): string | null {
        const task = this.findRuntimeTask(id)
        return task && task.labelObject ? task.labelObject.name : null
    }

    getRuntimeTaskLabelText(id: string): string | null {
        return this.ui.getTaskLabelText(id)
    }

    getRuntimeTaskCompletionObjectName(id: string): string | null {
        const task = this.findRuntimeTask(id)
        return task && task.completionObject && !isNull(task.completionObject)
            ? task.completionObject.name
            : null
    }

    completeRuntimeTaskForTest(id: string): boolean {
        const task = this.findRuntimeTask(id)
        return task ? this.completeTask(task) : false
    }

    capturePersistentSnapshotForTest(): string | null {
        return this.persistence.captureRawForTest()
    }

    clearRuntimeTasksForTest(): void {
        this.persistence.clear()
        this.destroyRuntimeTasks()
        this.publishState()
    }

    reloadPersistedRuntimeTasksForTest(): number {
        this.destroyRuntimeTasks()
        let restoredCount = 0
        for (const saved of this.persistence.load()) {
            if (this.createRuntimeTaskRecord(saved)) {
                restoredCount++
            }
        }
        this.relayoutRuntimeTasks(undefined, false)
        this.publishState()
        return restoredCount
    }

    restorePersistentSnapshotForTest(snapshot: string | null): number {
        this.persistence.replaceRawForTest(snapshot)
        return this.reloadPersistedRuntimeTasksForTest()
    }

    private createRuntimeTaskRecord(data: TaskGravityPersistedTask): TaskRef | null {
        if (
            !this.templateTask ||
            this.hasTaskId(data.id) ||
            data.id.trim().length === 0 ||
            data.name.trim().length === 0 ||
            !isTaskGravityPriority(data.priority)
        ) {
            return null
        }

        const templateVisual = this.templateTask.object.getComponent(
            "Component.RenderMeshVisual",
        ) as RenderMeshVisual
        if (!templateVisual || !templateVisual.mesh || !templateVisual.mainMaterial) {
            console.error("TaskGravityTaskSystem: authored task template is incomplete")
            return null
        }

        const safeObjectId = data.id.replace(/[^a-zA-Z0-9_-]/g, "_")
        const object = global.scene.createSceneObject("TaskGravityRuntimeTask_" + safeObjectId)
        const parent = this.templateTask.object.getParent()
        if (parent) {
            object.setParent(parent)
        } else {
            object.setParent(this.root)
        }
        object.layer = this.templateTask.object.layer
        object.getTransform().setLocalScale(this.templateTask.baseScale.clone())

        const visual = object.createComponent(
            "Component.RenderMeshVisual",
        ) as RenderMeshVisual
        visual.mesh = templateVisual.mesh
        visual.addMaterial(templateVisual.mainMaterial)

        const task: TaskRef = {
            id: data.id,
            label: data.name.trim(),
            object,
            currentZone: data.priority,
            baseScale: this.templateTask.baseScale.clone(),
            material: null,
            manipulation: null,
            isManipulating: false,
            isRuntime: true,
            labelObject: null,
            completionObject: null,
            isCompleted: false,
            destructionScheduled: false,
            motion: null,
        }

        this.tasks.push(task)
        this.enableTaskInteraction(task)
        this.setTaskVisual(task, task.currentZone)
        task.labelObject = this.ui.createTaskLabel(object, task.id, task.label)
        return task
    }

    private enableTaskInteraction(task: TaskRef): void {
        let collider = task.object.getComponent(
            "Physics.ColliderComponent",
        ) as ColliderComponent
        if (!collider) {
            collider = task.object.createComponent(
                "Physics.ColliderComponent",
            ) as ColliderComponent
        }
        const colliderShape = Shape.createBoxShape()
        colliderShape.size = new vec3(1, 0.7, 1)
        collider.shape = colliderShape

        const interactable =
            (task.object.getComponent(Interactable.getTypeName()) as Interactable | null) ??
            (task.object.createComponent(Interactable.getTypeName()) as Interactable)
        interactable.targetingMode = 3
        interactable.keepHoverOnTrigger = true
        interactable.enableInstantDrag = true
        if (interactable.colliders.indexOf(collider) < 0) {
            interactable.colliders.push(collider)
        }

        const manipulation =
            (task.object.getComponent(
                InteractableManipulation.getTypeName(),
            ) as InteractableManipulation | null) ??
            (task.object.createComponent(
                InteractableManipulation.getTypeName(),
            ) as InteractableManipulation)
        task.manipulation = manipulation

        manipulation.onManipulationStart.add(() => {
            task.isManipulating = true
            task.motion = null
            this.setTaskVisual(task, task.currentZone, true)
            this.ui.setMessage("Dragging " + task.label)
        })

        const finishManipulation = () => {
        if (!task.isManipulating) {
            return
        }
            if (task.isCompleted) {
                task.isManipulating = false
                return
            }
            task.isManipulating = false
            this.dropTask(task)
        }

        manipulation.onManipulationEnd.add(finishManipulation)
        interactable.onTriggerCanceled.add(finishManipulation)
        this.enableCompletionInteraction(task)
    }

    private dropTask(task: TaskRef): void {
        const currentPosition = task.object.getTransform().getWorldPosition()
        const previousPriority = this.ensureValidPriority(task)
        const targetZone = this.resolveDestination(previousPriority, currentPosition)
        const changed = previousPriority !== targetZone.key
        task.currentZone = targetZone.key

        if (task.isRuntime) {
            this.relayoutRuntimeTasks(task.currentZone, true)
            if (changed) {
                this.relayoutRuntimeTasks(previousPriority, true)
            }
            this.persistRuntimeTasks()
        } else {
            this.animateTaskTo(
                task,
                targetZone.object
                    .getTransform()
                    .getWorldPosition()
                    .add(new vec3(0, 4, 0)),
            )
        }

        this.setTaskVisual(task, task.currentZone)
        this.publishState()

        if (changed) {
            this.ui.setMessage(task.label + " moved to " + task.currentZone)
            console.log(
                "TaskGravity priority changed: " + task.label + " -> " + task.currentZone,
            )
        } else {
            this.ui.setMessage(task.label + " remains in " + task.currentZone)
        }
    }

    private enableCompletionInteraction(task: TaskRef): void {
        const safeId = task.id.replace(/[^a-zA-Z0-9_-]/g, "_")
        const completionObject = global.scene.createSceneObject(
            "TaskGravityComplete_" + safeId,
        )
        completionObject.setParent(task.object)
        completionObject.layer = task.object.layer
        // Keep the completion target visually distinct without putting it in
        // front of the draggable task's main interaction surface.
        completionObject.getTransform().setLocalPosition(new vec3(1.2, 0.5, 0))
        const completionScale = new vec3(0.34, 0.34, 0.34)
        completionObject.getTransform().setLocalScale(completionScale)
        this.ui.createCompletionMark(completionObject, safeId, task.baseScale, completionScale)

        const taskVisual = task.object.getComponent(
            "Component.RenderMeshVisual",
        ) as RenderMeshVisual
        if (taskVisual && taskVisual.mesh && taskVisual.mainMaterial) {
            const visual = completionObject.createComponent(
                "Component.RenderMeshVisual",
            ) as RenderMeshVisual
            visual.mesh = taskVisual.mesh
            const material = taskVisual.mainMaterial.clone()
            material.mainPass.baseColor = new vec4(0.18, 1, 0.38, 1)
            visual.addMaterial(material)
        }

        const collider = completionObject.createComponent(
            "Physics.ColliderComponent",
        ) as ColliderComponent
        const shape = Shape.createBoxShape()
        shape.size = new vec3(1.6, 1.6, 1.6)
        collider.shape = shape
        collider.enabled = true

        const interactable = completionObject.createComponent(
            Interactable.getTypeName(),
        ) as Interactable
        interactable.targetingMode = 3
        interactable.keepHoverOnTrigger = true
        interactable.colliders.push(collider)
        task.completionObject = completionObject

        // This is a separate tap target from the draggable task collider, so a
        // normal grab/reprioritization never completes the task accidentally.
        interactable.onTriggerStart.add(() => this.completeTask(task))
        interactable.onTriggerEnd.add(() => this.deferCompletedTaskDestruction(task))
        interactable.onTriggerCanceled.add(() => this.deferCompletedTaskDestruction(task))
    }

    private completeTask(task: TaskRef): boolean {
        if (task.isCompleted || this.tasks.indexOf(task) < 0) {
            return false
        }

        const completedPriority = this.ensureValidPriority(task)
        task.isCompleted = true
        task.isManipulating = false
        this.tasks = this.tasks.filter((candidate) => candidate !== task)

        this.ui.removeTaskLabel(task.id)
        const visual = task.object.getComponent(
            "Component.RenderMeshVisual",
        ) as RenderMeshVisual
        if (visual) {
            visual.enabled = false
        }
        const completionVisual = task.completionObject
            ? (task.completionObject.getComponent(
                  "Component.RenderMeshVisual",
              ) as RenderMeshVisual)
            : null
        if (completionVisual) {
            completionVisual.enabled = false
        }

        if (task.isRuntime) {
            this.persistRuntimeTasks()
        }
        task.motion = null
        this.relayoutRuntimeTasks(completedPriority, true)
        this.publishState()
        this.ui.setMessage("Completed " + task.label)
        console.log("TaskGravity task completed: " + task.id + " | " + task.label)
        return true
    }

    private deferCompletedTaskDestruction(task: TaskRef): void {
        if (!task.isCompleted) {
            return
        }
        if (task.destructionScheduled) {
            return
        }
        task.destructionScheduled = true
        const delayed = this.eventOwner.createEvent(
            "DelayedCallbackEvent",
        ) as DelayedCallbackEvent
        delayed.bind(() => {
            if (task.completionObject && !isNull(task.completionObject)) {
                task.completionObject.destroy()
                task.completionObject = null
            }
            if (!isNull(task.object)) {
                task.object.destroy()
            }
        })
        // Let SIK finish its trigger-end cleanup before destroying the target.
        // Keep the disabled target alive briefly so SIK can finish its
        // recently-ended interactor cleanup before the object is destroyed.
        delayed.reset(0.25)
    }

    private resolveDestination(
        currentPriority: TaskGravityPriority,
        position: vec3,
    ): ZoneRef {
        const currentZone = this.getZone(currentPriority)
        const currentDistance = this.getHorizontalZoneDistance(position, currentZone)
        if (currentDistance <= currentZone.retainRadius) {
            return currentZone
        }

        let candidate: ZoneRef | null = null
        let candidateDistance = Number.POSITIVE_INFINITY
        for (const zone of this.zones) {
            if (zone.key === currentPriority) {
                continue
            }
            const distance = this.getHorizontalZoneDistance(position, zone)
            if (distance <= zone.enterRadius && distance < candidateDistance) {
                candidate = zone
                candidateDistance = distance
            }
        }
        return candidate ?? currentZone
    }

    private ensureValidPriority(task: TaskRef): TaskGravityPriority {
        if (isTaskGravityPriority(task.currentZone)) {
            return task.currentZone
        }

        const recovered = this.getNearestZone(task.object.getTransform().getWorldPosition())
        console.log(
            "TaskGravityTaskSystem: recovered invalid priority on " +
                task.label +
                " to " +
                recovered.key,
        )
        task.currentZone = recovered.key
        if (task.isRuntime) {
            this.persistRuntimeTasks()
        }
        return recovered.key
    }

    private getNearestZone(position: vec3): ZoneRef {
        let nearest = this.zones[0]
        let nearestDistance = Number.POSITIVE_INFINITY
        for (const zone of this.zones) {
            const distance = this.getHorizontalZoneDistance(position, zone)
            if (distance < nearestDistance) {
                nearest = zone
                nearestDistance = distance
            }
        }
        return nearest
    }

    private getHorizontalZoneDistance(position: vec3, zone: ZoneRef): number {
        const zonePosition = zone.object.getTransform().getWorldPosition()
        const deltaX = position.x - zonePosition.x
        const deltaZ = position.z - zonePosition.z
        return Math.sqrt(deltaX * deltaX + deltaZ * deltaZ)
    }

    private getZone(key: TaskGravityPriority): ZoneRef {
        for (const zone of this.zones) {
            if (zone.key === key) {
                return zone
            }
        }
        return this.zones[0]
    }

    private setTaskVisual(
        task: TaskRef,
        zone: TaskGravityPriority,
        highlighted: boolean = false,
    ): void {
        const visual = task.object.getComponent(
            "Component.RenderMeshVisual",
        ) as RenderMeshVisual
        if (!visual) {
            console.error("TaskGravityTaskSystem: missing RenderMeshVisual on " + task.label)
            return
        }

        if (!task.material) {
            task.material = visual.mainMaterial.clone()
            visual.clearMaterials()
            visual.addMaterial(task.material)
        }

        task.material.mainPass.baseColor = highlighted
            ? new vec4(1, 1, 1, 1)
            : this.taskColors[zone]
        task.object
            .getTransform()
            .setLocalScale(task.baseScale.uniformScale(highlighted ? 1.1 : 1))
    }

    private relayoutRuntimeTasks(
        onlyPriority?: TaskGravityPriority,
        animate: boolean = true,
    ): void {
        const zones = onlyPriority ? [this.getZone(onlyPriority)] : this.zones
        for (const zone of zones) {
            const zoneTasks = this.tasks
                .filter((task) => task.isRuntime && task.currentZone === zone.key)
                .sort((a, b) => a.id.localeCompare(b.id))

            for (let index = 0; index < zoneTasks.length; index++) {
                const task = zoneTasks[index]
                const target = this.getRuntimeSlotPosition(zone, index)
                if (animate) {
                    this.animateTaskTo(task, target)
                } else {
                    task.motion = null
                    task.object.getTransform().setWorldPosition(target)
                }
            }
        }
    }

    private animateTaskTo(task: TaskRef, target: vec3, duration: number = 0.24): void {
        if (task.isCompleted || isNull(task.object)) {
            return
        }

        const current = task.object.getTransform().getWorldPosition()
        const deltaX = target.x - current.x
        const deltaY = target.y - current.y
        const deltaZ = target.z - current.z
        if (deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ < 0.0001) {
            task.motion = null
            task.object.getTransform().setWorldPosition(target)
            return
        }

        task.motion = {
            start: current.clone(),
            target: target.clone(),
            elapsed: 0,
            duration,
        }
    }

    private updateTaskMotion(): void {
        const deltaTime = getDeltaTime()
        for (const task of this.tasks) {
            const motion = task.motion
            if (!motion || task.isCompleted || isNull(task.object)) {
                continue
            }

            motion.elapsed += deltaTime
            const linear = Math.min(1, motion.elapsed / motion.duration)
            const eased = 1 - Math.pow(1 - linear, 3)
            task.object.getTransform().setWorldPosition(
                new vec3(
                    motion.start.x + (motion.target.x - motion.start.x) * eased,
                    motion.start.y + (motion.target.y - motion.start.y) * eased,
                    motion.start.z + (motion.target.z - motion.start.z) * eased,
                ),
            )

            if (linear >= 1) {
                task.motion = null
            }
        }
    }

    private getRuntimeSlotPosition(zone: ZoneRef, index: number): vec3 {
        const layer = Math.floor(index / 2)
        const x = index % 2 === 0
            ? -TaskGravityTaskSystem.TASK_SLOT_X
            : TaskGravityTaskSystem.TASK_SLOT_X
        const y =
            TaskGravityTaskSystem.TASK_LAYER_BASE_Y +
            layer * TaskGravityTaskSystem.TASK_LAYER_STEP_Y
        return zone.object.getTransform().getWorldPosition().add(new vec3(x, y, 0))
    }

    private persistRuntimeTasks(): void {
        this.persistence.save(
            this.tasks
                .filter((task) => task.isRuntime)
                .map((task) => ({
                    id: task.id,
                    name: task.label,
                    priority: this.ensureValidPriority(task),
                })),
        )
    }

    private publishState(): void {
        this.ui.setTaskStates(
            this.tasks.map((task) => ({
                label: task.label,
                zone: this.ensureValidPriority(task),
            })),
        )
    }

    private destroyRuntimeTasks(): void {
        const survivors: TaskRef[] = []
        for (const task of this.tasks) {
            if (!task.isRuntime) {
                survivors.push(task)
                continue
            }
            task.isCompleted = true
            task.isManipulating = false
            task.motion = null
            this.ui.removeTaskLabel(task.id)
            if (task.completionObject && !isNull(task.completionObject)) {
                task.completionObject.destroy()
            }
            task.object.destroy()
        }
        this.tasks = survivors
    }

    private findRuntimeTask(id: string): TaskRef | null {
        for (const task of this.tasks) {
            if (task.isRuntime && task.id === id) {
                return task
            }
        }
        return null
    }

    private hasTaskId(id: string): boolean {
        return this.tasks.some((task) => task.id === id)
    }

    private createUniqueId(): string {
        let id = ""
        do {
            this.idSequence++
            id = "task-" + Date.now().toString(36) + "-" + this.idSequence
        } while (this.hasTaskId(id))
        return id
    }

    private setColliderDebugAll(obj: SceneObject, enabled: boolean): void {
        const collider = obj.getComponent(
            "Physics.ColliderComponent",
        ) as ColliderComponent | null
        if (collider) {
            collider.debugDrawEnabled = enabled
        }
        const body = obj.getComponent("Physics.BodyComponent") as ColliderComponent | null
        if (body) {
            body.debugDrawEnabled = enabled
        }
        for (let i = 0; i < obj.getChildrenCount(); i++) {
            this.setColliderDebugAll(obj.getChild(i), enabled)
        }
    }
}
