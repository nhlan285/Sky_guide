import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export type StatusTone = 'neutral' | 'info' | 'warning' | 'danger'

export function Button({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={type} className={`button ${className}`} />
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }

export function TextInput({ id, label, className = '', ...props }: TextInputProps) {
  return (
    <div className="input-field">
      <label htmlFor={id}>{label}</label>
      <input {...props} id={id} className={`text-input ${className}`} />
    </div>
  )
}

export function SectionCard({ id, title, badge, children, className = '' }: {
  id: string
  title: string
  badge?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`section-card ${className}`} aria-labelledby={`${id}-title`} tabIndex={-1}>
      <div className="section-card__header">
        <h2 id={`${id}-title`}>{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  )
}
