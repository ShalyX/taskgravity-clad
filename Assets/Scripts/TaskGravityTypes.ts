/** Shared TaskGravity domain types. No scene access or UI behavior lives here. */
export type TaskGravityPriority = "NOW" | "NEXT" | "LATER"

export interface TaskGravityPersistedTask {
    id: string
    name: string
    priority: TaskGravityPriority
}

export function isTaskGravityPriority(value: unknown): value is TaskGravityPriority {
    return value === "NOW" || value === "NEXT" || value === "LATER"
}
