import type { HomeContent } from '@/content/home/types'

export function InfrastructureDiagram({
  nodes,
}: {
  nodes: HomeContent['infrastructure']['nodes']
}) {
  return (
    <ol className="mt-12 grid gap-4 md:grid-cols-4">
      {nodes.map((node, index) => (
        <li
          key={node}
          className="relative rounded-lg border border-line bg-midnight p-5 font-mono text-sm text-secondary not-last:after:absolute not-last:after:-bottom-4 not-last:after:left-1/2 not-last:after:h-4 not-last:after:w-px not-last:after:bg-mint md:not-last:after:-right-4 md:not-last:after:bottom-auto md:not-last:after:left-auto md:not-last:after:top-1/2 md:not-last:after:h-px md:not-last:after:w-4"
        >
          <span className="mb-3 block text-xs text-mint">0{index + 1}</span>
          {node}
        </li>
      ))}
    </ol>
  )
}
