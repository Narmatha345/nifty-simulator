export function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function formatPercent(value: number, fractionDigits = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(fractionDigits)}%`
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const SIMULATION_SOURCE_LABELS: Record<'historical' | 'random' | 'synthetic', string> = {
  historical: 'Historical',
  random: 'Random NIFTY',
  synthetic: 'Synthetic',
}

/** Shared label for a Short Strangle SimulationSource, used by the Dashboard and Trade History Simulation Type column. */
export function formatSimulationSource(source: 'historical' | 'random' | 'synthetic'): string {
  return SIMULATION_SOURCE_LABELS[source]
}
