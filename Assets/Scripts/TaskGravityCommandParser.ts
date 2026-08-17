import { TaskGravityPriority } from "./TaskGravityTypes"

/**
 * Deterministic command parser for the Week 1 capture loop.
 * It intentionally understands only: Add [task name] to [priority].
 */
export type TaskGravityCommandParseResult =
    | { ok: true; name: string; priority: TaskGravityPriority }
    | { ok: false; feedback: string }

export function parseTaskGravityCommand(transcript: string): TaskGravityCommandParseResult {
    const normalized = transcript
        .trim()
        .replace(/[.!?]+$/, "")
        .replace(/\s+/g, " ")

    if (!/^add\b/i.test(normalized)) {
        return {
            ok: false,
            feedback: "Say: Add [task] to NOW, NEXT, or LATER.",
        }
    }

    const priorityMatch = /\s+to\s+(now|next|later)$/i.exec(normalized)
    if (!priorityMatch) {
        return {
            ok: false,
            feedback: "NOW, NEXT, or LATER is required.",
        }
    }

    const name = normalized.slice(3, priorityMatch.index).trim()
    if (name.length === 0) {
        return {
            ok: false,
            feedback: "Task name is required.",
        }
    }

    return {
        ok: true,
        name,
        priority: priorityMatch[1].toUpperCase() as TaskGravityPriority,
    }
}
