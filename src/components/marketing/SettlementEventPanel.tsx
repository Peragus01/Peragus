import type { HomeContent } from '@/content/home/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Surface } from '@/components/ui/surface'

export function SettlementEventPanel({
  content,
}: {
  content: HomeContent['eventPanel']
}) {
  const events = [
    { index: '01', event: 'payment.created', value: 'BRL 1.250,00' },
    { index: '02', event: 'pix.confirmed', value: content.simulated },
    { index: '03', event: 'settlement.sent', value: '0x71...9c' },
  ]

  return (
    <Surface elevation="raised" className="overflow-hidden shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 font-mono text-xs text-tertiary">
        <span className="text-secondary">{content.operation}</span>
        <StatusBadge tone="sandbox">{content.environment}</StatusBadge>
      </div>
      <ol>
        {events.map((item) => (
          <li
            key={item.index}
            className="grid grid-cols-[2rem_1fr_auto] gap-3 border-b border-line px-4 py-4 font-mono text-xs last:border-0"
          >
            <span className="text-mint">{item.index}</span>
            <span className="min-w-0 break-all text-secondary">{item.event}</span>
            <span className="break-all text-primary">{item.value}</span>
          </li>
        ))}
      </ol>
    </Surface>
  )
}
