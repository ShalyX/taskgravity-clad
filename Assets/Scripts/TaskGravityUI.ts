/**
 * TaskGravityUI — minimal world-space readout, zone labels, and task labels.
 * Owns visible text only; it does not own task state, command parsing, storage,
 * or interaction decisions.
 */
@component
export class TaskGravityUI extends BaseScriptComponent {
    private statusText!: Text
    private stateLines = ""
    private message = "Drag a task into a zone"
    private taskLabels: Record<string, { object: SceneObject; text: Text }> = {}
    private zoneLabels: Record<string, { object: SceneObject; text: Text }> = {}

    onAwake(): void {
        const root = this.getSceneObject()
        root.createComponent("Component.Canvas")

        this.statusText = root.createComponent("Component.Text") as Text
        this.stateLines = ""
        this.render()
        this.statusText.size = 36
        this.statusText.weight = 600
        this.statusText.depthTest = true
        this.statusText.twoSided = true
        this.statusText.textFill.color = new vec4(1, 1, 1, 1)
        this.statusText.layoutRect = Rect.create(-12, 12, -4.5, 4.5)
    }

    setTaskStates(states: Array<{ label: string; zone: string }>): void {
        if (!this.statusText) {
            return
        }

        const lines = states.map((state) => state.label + ": " + state.zone)
        this.stateLines = lines.join("\n")
        this.render()
    }

    setMessage(message: string): void {
        if (!this.statusText) {
            return
        }
        this.message = message
        this.render()
    }

    createTaskLabel(taskObject: SceneObject, id: string, label: string): SceneObject {
        const existing = this.taskLabels[id]
        if (existing && !isNull(existing.object)) {
            existing.text.text = label
            return existing.object
        }

        const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_")
        const labelObject = global.scene.createSceneObject(
            "TaskGravityRuntimeLabel_" + safeId,
        )
        labelObject.setParent(taskObject)

        const taskScale = taskObject.getTransform().getLocalScale()
        const inverseScale = new vec3(
            taskScale.x !== 0 ? 1 / taskScale.x : 1,
            taskScale.y !== 0 ? 1 / taskScale.y : 1,
            taskScale.z !== 0 ? 1 / taskScale.z : 1,
        )
        labelObject.getTransform().setLocalScale(inverseScale)
        // Child +Z is toward the user for the authored task orientation.
        labelObject.getTransform().setLocalPosition(new vec3(0, 0, 0.54))
        labelObject.createComponent("Component.Canvas")

        const text = labelObject.createComponent("Component.Text") as Text
        text.text = label
        text.size = 44
        text.weight = 700
        text.depthTest = true
        text.twoSided = true
        text.textFill.color = new vec4(1, 1, 1, 1)
        text.layoutRect = Rect.create(-3.2, 3.2, -1.1, 1.1)

        this.taskLabels[id] = { object: labelObject, text }
        return labelObject
    }

    createZoneLabel(zoneObject: SceneObject, id: string, label: string): SceneObject {
        const existing = this.zoneLabels[id]
        if (existing && !isNull(existing.object)) {
            existing.text.text = label
            return existing.object
        }

        const labelObject = global.scene.createSceneObject("TaskGravityZoneLabel_" + id)
        labelObject.setParent(zoneObject)

        const zoneScale = zoneObject.getTransform().getLocalScale()
        labelObject.getTransform().setLocalScale(
            new vec3(
                zoneScale.x !== 0 ? 1 / zoneScale.x : 1,
                zoneScale.y !== 0 ? 1 / zoneScale.y : 1,
                zoneScale.z !== 0 ? 1 / zoneScale.z : 1,
            ),
        )
        labelObject.getTransform().setLocalPosition(new vec3(0, 1.5, 0.15))
        labelObject.createComponent("Component.Canvas")

        const text = labelObject.createComponent("Component.Text") as Text
        text.text = label
        text.size = 40
        text.weight = 700
        text.depthTest = true
        text.twoSided = true
        text.textFill.color = new vec4(1, 1, 1, 1)
        text.layoutRect = Rect.create(-3.8, 3.8, -1, 1)

        this.zoneLabels[id] = { object: labelObject, text }
        return labelObject
    }

    createCompletionMark(
        completionObject: SceneObject,
        id: string,
        taskScale: vec3,
        completionScale: vec3,
    ): SceneObject {
        const markObject = global.scene.createSceneObject("TaskGravityCompleteMark_" + id)
        markObject.setParent(completionObject)
        markObject.getTransform().setLocalScale(
            new vec3(
                taskScale.x * completionScale.x !== 0
                    ? 1 / (taskScale.x * completionScale.x)
                    : 1,
                taskScale.y * completionScale.y !== 0
                    ? 1 / (taskScale.y * completionScale.y)
                    : 1,
                taskScale.z * completionScale.z !== 0
                    ? 1 / (taskScale.z * completionScale.z)
                    : 1,
            ),
        )
        markObject.getTransform().setLocalPosition(new vec3(0, 0, 0.15))
        markObject.createComponent("Component.Canvas")

        const text = markObject.createComponent("Component.Text") as Text
        text.text = "✓"
        text.size = 44
        text.weight = 700
        text.depthTest = true
        text.twoSided = true
        text.textFill.color = new vec4(1, 1, 1, 1)
        text.layoutRect = Rect.create(-1, 1, -1, 1)
        return markObject
    }

    removeTaskLabel(id: string): void {
        const entry = this.taskLabels[id]
        if (!entry) {
            return
        }
        if (!isNull(entry.object)) {
            entry.object.destroy()
        }
        delete this.taskLabels[id]
    }

    getTaskLabelText(id: string): string | null {
        const entry = this.taskLabels[id]
        return entry && !isNull(entry.object) ? entry.text.text : null
    }

    private render(): void {
        if (!this.statusText) return
        const states = this.stateLines ? "\n\n" + this.stateLines : ""
        this.statusText.text =
            "TaskGravity\nFOCUS anchor · pinch to listen\nNOW  near     NEXT  middle     LATER  far" +
            states +
            "\n\n" + this.message
    }
}
