import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {TaskGravityBoundaryStabilityScenario} from "./TaskGravityBoundaryStabilityScenario"
import {TaskGravityCleanInboxToNextScenario} from "./TaskGravityCleanInboxToNextScenario"
import {TaskGravityCompletionPersistenceScenario} from "./TaskGravityCompletionPersistenceScenario"
import {TaskGravityDuplicateCompletionScenario} from "./TaskGravityDuplicateCompletionScenario"
import {TaskGravityFocusActivationScenario} from "./TaskGravityFocusActivationScenario"
import {TaskGravityInitialVisibilityScenario} from "./TaskGravityInitialVisibilityScenario"
import {TaskGravityInvalidCommandScenario} from "./TaskGravityInvalidCommandScenario"
import {TaskGravityPersistenceRoundTripScenario} from "./TaskGravityPersistenceRoundTripScenario"
import {TaskGravityReviewNotesToNowScenario} from "./TaskGravityReviewNotesToNowScenario"
import {TaskGravityRuntimeCreationScenario} from "./TaskGravityRuntimeCreationScenario"
import {TaskGravityRuntimeCompletionScenario} from "./TaskGravityRuntimeCompletionScenario"
import {TaskGravityRuntimeMovementScenario} from "./TaskGravityRuntimeMovementScenario"
import {TaskGravityZoneReflowScenario} from "./TaskGravityZoneReflowScenario"

@component
export class TaskGravityLeafIndex extends BaseScriptComponent {
    @scenariosIndex
    static readonly scenarios: ScenarioMetadata[] = [
        {
            id: "taskgravity_review_notes_next_to_now",
            typename: TaskGravityReviewNotesToNowScenario.getTypeName(),
        },
        {
            id: "taskgravity_clean_inbox_later_to_next",
            typename: TaskGravityCleanInboxToNextScenario.getTypeName(),
        },
        {
            id: "taskgravity_initial_visibility",
            typename: TaskGravityInitialVisibilityScenario.getTypeName(),
        },
        {
            id: "taskgravity_boundary_stability",
            typename: TaskGravityBoundaryStabilityScenario.getTypeName(),
        },
        {
            id: "taskgravity_runtime_creation",
            typename: TaskGravityRuntimeCreationScenario.getTypeName(),
        },
        {
            id: "taskgravity_runtime_movement",
            typename: TaskGravityRuntimeMovementScenario.getTypeName(),
        },
        {
            id: "taskgravity_persistence_roundtrip",
            typename: TaskGravityPersistenceRoundTripScenario.getTypeName(),
        },
        {
            id: "taskgravity_invalid_command",
            typename: TaskGravityInvalidCommandScenario.getTypeName(),
        },
        {
            id: "taskgravity_focus_activation",
            typename: TaskGravityFocusActivationScenario.getTypeName(),
        },
        {
            id: "taskgravity_runtime_completion",
            typename: TaskGravityRuntimeCompletionScenario.getTypeName(),
        },
        {
            id: "taskgravity_completion_persistence",
            typename: TaskGravityCompletionPersistenceScenario.getTypeName(),
        },
        {
            id: "taskgravity_zone_reflow",
            typename: TaskGravityZoneReflowScenario.getTypeName(),
        },
        {
            id: "taskgravity_duplicate_completion",
            typename: TaskGravityDuplicateCompletionScenario.getTypeName(),
        },
    ]
}
