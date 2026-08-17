import {
    isTaskGravityPriority,
    TaskGravityPersistedTask,
} from "./TaskGravityTypes"

/**
 * Owns TaskGravity's local persistence boundary.
 * Stores only runtime task ID, name, and priority as a versioned JSON array.
 */
export class TaskGravityPersistence {
    private static readonly STORAGE_KEY = "taskgravity.runtimeTasks.v1"

    load(): TaskGravityPersistedTask[] {
        const store = global.persistentStorageSystem.store
        if (!store || !store.has(TaskGravityPersistence.STORAGE_KEY)) {
            return []
        }

        try {
            const raw = store.getString(TaskGravityPersistence.STORAGE_KEY)
            const parsed = JSON.parse(raw) as unknown
            if (!Array.isArray(parsed)) {
                console.log("TaskGravityPersistence: ignored non-array saved data")
                return []
            }

            const restored: TaskGravityPersistedTask[] = []
            const seenIds: Record<string, boolean> = {}
            let ignored = 0

            for (const row of parsed) {
                if (!row || typeof row !== "object") {
                    ignored++
                    continue
                }

                const candidate = row as Record<string, unknown>
                const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
                const name = typeof candidate.name === "string" ? candidate.name.trim() : ""
                const priority = candidate.priority

                if (
                    id.length === 0 ||
                    name.length === 0 ||
                    !isTaskGravityPriority(priority) ||
                    seenIds[id]
                ) {
                    ignored++
                    continue
                }

                seenIds[id] = true
                restored.push({ id, name, priority })
            }

            if (ignored > 0) {
                console.log(
                    "TaskGravityPersistence: ignored " + ignored + " malformed saved row(s)",
                )
            }
            return restored
        } catch (error) {
            console.log("TaskGravityPersistence: ignored malformed saved JSON: " + error)
            return []
        }
    }

    save(tasks: TaskGravityPersistedTask[]): void {
        const store = global.persistentStorageSystem.store
        if (!store) {
            console.log("TaskGravityPersistence: persistent store unavailable")
            return
        }

        const safeTasks = tasks.filter(
            (task) =>
                task.id.trim().length > 0 &&
                task.name.trim().length > 0 &&
                isTaskGravityPriority(task.priority),
        )
        store.putString(TaskGravityPersistence.STORAGE_KEY, JSON.stringify(safeTasks))
    }

    clear(): void {
        const store = global.persistentStorageSystem.store
        if (store && store.has(TaskGravityPersistence.STORAGE_KEY)) {
            store.remove(TaskGravityPersistence.STORAGE_KEY)
        }
    }

    captureRawForTest(): string | null {
        const store = global.persistentStorageSystem.store
        if (!store || !store.has(TaskGravityPersistence.STORAGE_KEY)) {
            return null
        }
        return store.getString(TaskGravityPersistence.STORAGE_KEY)
    }

    replaceRawForTest(snapshot: string | null): void {
        const store = global.persistentStorageSystem.store
        if (!store) {
            return
        }
        if (snapshot === null) {
            store.remove(TaskGravityPersistence.STORAGE_KEY)
        } else {
            store.putString(TaskGravityPersistence.STORAGE_KEY, snapshot)
        }
    }
}
