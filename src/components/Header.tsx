import { Waypoints } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

interface Props {
  isDark: boolean
  onToggleTheme: () => void
}

export default function Header({ isDark, onToggleTheme }: Props) {
  return (
    <header className="rounded-3xl bg-gradient-to-br from-fuchsia-400 via-violet-500 to-purple-600 p-6 shadow-lg shadow-fuchsia-500/20 dark:from-fuchsia-500 dark:via-violet-600 dark:to-purple-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/25 text-white backdrop-blur-sm">
            <Waypoints className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
            NIFTY Historical Distribution Simulator
          </h1>
        </div>
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base">
        Generates alternative NIFTY price paths by resampling daily returns from
        their actual historical distribution — no normal-distribution or
        constant-volatility assumptions.
      </p>
    </header>
  )
}
