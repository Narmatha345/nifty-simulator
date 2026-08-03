import type { ProbabilityBin, SimulatedPath, SimulationParams, SimulationResult } from '../types'
import { createHistoricalSampler, type ReturnSampler } from './sampler'

function buildPath(pathId: number, sampler: ReturnSampler, params: SimulationParams): SimulatedPath {
  const levels: number[] = [params.currentLevel]
  const dailyReturns: number[] = []
  let level = params.currentLevel

  for (let day = 0; day < params.forecastDays; day++) {
    const returnPct = sampler.sample()
    level = level * (1 + returnPct / 100)
    dailyReturns.push(returnPct)
    levels.push(level)
  }

  const maxLevel = Math.max(...levels)
  const minLevel = Math.min(...levels)

  return {
    pathId,
    levels,
    dailyReturns,
    finalLevel: level,
    maxRise: ((maxLevel - params.currentLevel) / params.currentLevel) * 100,
    maxFall: ((minLevel - params.currentLevel) / params.currentLevel) * 100,
  }
}

/** Runs the full simulation synchronously. Fine for small/medium path counts. */
export function runSimulation(probabilityBins: ProbabilityBin[], params: SimulationParams): SimulationResult {
  const sampler = createHistoricalSampler(probabilityBins)
  const paths: SimulatedPath[] = []
  for (let i = 0; i < params.numPaths; i++) {
    paths.push(buildPath(i + 1, sampler, params))
  }
  return { params, paths, generatedAt: Date.now() }
}

const YIELD_EVERY_PATHS = 200

/**
 * Runs the simulation in chunks, yielding to the browser between them so
 * the UI stays responsive for large path counts (thousands of paths).
 */
export async function runSimulationAsync(
  probabilityBins: ProbabilityBin[],
  params: SimulationParams,
  onProgress?: (completed: number, total: number) => void,
): Promise<SimulationResult> {
  const sampler = createHistoricalSampler(probabilityBins)
  const paths: SimulatedPath[] = []

  for (let i = 0; i < params.numPaths; i++) {
    paths.push(buildPath(i + 1, sampler, params))
    if ((i + 1) % YIELD_EVERY_PATHS === 0) {
      onProgress?.(i + 1, params.numPaths)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  onProgress?.(params.numPaths, params.numPaths)
  return { params, paths, generatedAt: Date.now() }
}
