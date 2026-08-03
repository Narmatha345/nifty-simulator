import type { ReactNode } from 'react'

interface Props {
  id?: string
  title: string
  description?: string
  children: ReactNode
}

export default function Card({ id, title, description, children }: Props) {
  return (
    <section id={id} className="scroll-mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
