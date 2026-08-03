# NIFTY Historical Distribution Scenario Simulator

Generates alternative NIFTY 50 price paths by resampling daily returns from
their **actual historical distribution** — no normal/Gaussian assumption, no
constant volatility, no fixed trend, and (in this version) no option-chain,
implied volatility, GARCH, or Black-Scholes modelling.

## How it works

1. **Load historical data** — a bundled 10-year NIFTY daily OHLC dataset, or
   your own uploaded CSV (Date, Open, High, Low, Close).
2. **Compute daily % returns** from the Close price.
3. **Build a histogram** of those returns.
4. **Convert it into a probability table** (bin count ÷ total trading days).
5. **Simulate paths**: each simulated trading day independently draws a
   return from that empirical probability distribution (common historical
   moves come up more often than rare ones, by construction) and compounds
   it onto the running NIFTY level.
6. **Review results**: simulated-paths chart, distribution of final values,
   a full per-path data table, and summary statistics.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Recharts (histogram, simulated paths, final-value distribution)
- PapaParse (CSV upload)

## Getting started

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173` URL.

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run typecheck  # type-check only
npm run preview    # preview the production build locally
npm run lint       # oxlint
```

## Project structure

```
src/
  types/            # shared TypeScript types
  utils/
    dataLoader.ts   # bundled dataset fetch + CSV parsing/normalizing
    dateRange.ts    # date-range presets
    returns.ts      # daily % return calculation
    histogram.ts    # generic fixed-width histogram bucketing
    probability.ts  # bin counts -> probability distribution
    sampler.ts       # draws a return from the historical probability distribution
    simulator.ts     # builds simulated price paths (sync + chunked async)
    statistics.ts    # summary statistics over simulated paths
    format.ts
  charts/
    ReturnHistogramChart.tsx
    SimulatedPathsChart.tsx
    FinalDistributionChart.tsx
  components/
    DataSourcePanel.tsx      # source + date range selection
    ProbabilityTable.tsx
    SimulationControls.tsx   # current level / forecast days / path count + run
    SimulationDataTable.tsx  # paginated per-path table
    StatisticsSummary.tsx
    Header.tsx, Card.tsx, BottomNavigation.tsx, InputControl.tsx, ThemeToggle.tsx
  pages/
    SimulatorPage.tsx  # top-level state + layout
public/
  data/nifty-historical.json  # bundled 10-year NIFTY OHLC sample dataset
```

## Data

The bundled dataset (`public/data/nifty-historical.json`) is real daily
NIFTY 50 OHLC data spanning roughly 10 years, sourced from public market
data. You can instead upload your own historical CSV at any time.

## Disclaimer

This is an illustrative simulation tool for testing trading strategies
against many historically-grounded scenarios, not investment advice. Past
return distributions are not a guarantee of future behaviour.

## Roadmap (not in this version)

The architecture (data → returns → histogram → probability → sampling →
simulation → statistics) is modular so later versions can add option-chain
integration, implied volatility, volatility skew, GARCH, or Monte Carlo
enhancements without restructuring the pipeline.
