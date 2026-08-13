import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

interface Props {
  items: NavItem[]
}

export default function BottomNavigation({ items }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id)

  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null)
    if (!sections.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.1, 0.25, 0.5, 0.75] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [items])

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      aria-label="Section navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90"
    >
      <div className="mx-auto flex max-w-[640px] items-stretch justify-between px-2">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = activeId === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleNavigate(id)}
              aria-current={isActive ? 'true' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none ${
                isActive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
