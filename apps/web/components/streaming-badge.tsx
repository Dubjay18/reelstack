interface StreamingBadgeProps {
  name: string
  link?: string
  type?: string
}

export function StreamingBadge({ name, link, type }: StreamingBadgeProps) {
  const inner = (
    <span className="bg-surface border border-outline-variant rounded-md px-2.5 py-1.5 text-[12px] text-on-surface hover:border-primary/40 transition-colors inline-block">
      {name}
      {type && (
        <span className="ml-1.5 font-mono text-[10px] text-on-surface-variant uppercase opacity-70">{type}</span>
      )}
    </span>
  )

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    )
  }
  return inner
}
