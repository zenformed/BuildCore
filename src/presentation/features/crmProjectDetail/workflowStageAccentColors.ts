/**
 * Workflow stage accent ramp:
 * blue at the start stage -> green at the final stage.
 */
const WORKFLOW_STAGE_HUE_START = 210;
const WORKFLOW_STAGE_HUE_END = 142;
const WORKFLOW_STAGE_SATURATION = 68;
const WORKFLOW_STAGE_LIGHTNESS_START = 58;
const WORKFLOW_STAGE_LIGHTNESS_END = 42;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function workflowStageAccentColor(index: number, stageCount: number): string {
  const safeCount = Math.max(1, stageCount);
  const safeIndex = clamp(index, 0, safeCount - 1);
  const progress = safeCount <= 1 ? 0 : safeIndex / (safeCount - 1);
  const hue = WORKFLOW_STAGE_HUE_START + (WORKFLOW_STAGE_HUE_END - WORKFLOW_STAGE_HUE_START) * progress;
  const lightness =
    WORKFLOW_STAGE_LIGHTNESS_START -
    (WORKFLOW_STAGE_LIGHTNESS_START - WORKFLOW_STAGE_LIGHTNESS_END) * progress;
  return `hsl(${hue.toFixed(1)} ${WORKFLOW_STAGE_SATURATION}% ${lightness.toFixed(1)}%)`;
}
