let pipelineEnabled = true;

export function isPipelineEnabled() {
  return pipelineEnabled;
}

export function togglePipeline() {
  pipelineEnabled = !pipelineEnabled;
  return pipelineEnabled;
}