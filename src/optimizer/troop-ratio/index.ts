export { allocateTroopsByRatio } from "./allocateTroopsByRatio";
export {
  createTroopRatioOptimizer,
  optimizeTroopRatio,
} from "./optimizeTroopRatio";
export type { TroopRatioOptimizerDependencies } from "./optimizeTroopRatio";
export { generateTroopRatioGrid } from "./generateTroopRatioGrid";
export type { TroopRatioGridOptions } from "./generateTroopRatioGrid";
export { optimizeSeparableRatioGrid } from "./optimizeSeparableRatioGrid";
export type {
  SeparableRatioCandidate,
  SeparableRatioGridInput,
  SeparableRatioGridResult,
} from "./optimizeSeparableRatioGrid";
export * from "./errors";
