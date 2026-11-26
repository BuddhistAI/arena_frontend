import React from 'react'


// Only the Arena's ELO is described here; a Challenge's Headline Metric is
// labelled by its Scorer.
const metricDescriptions = {
  ELO: "Relative skill level",
}


function MattricHelper({ metric }: { metric: string }) {
    const description = metricDescriptions[metric as keyof typeof metricDescriptions]
  return (
    <>
      {(metricDescriptions[metric as keyof typeof metricDescriptions]) && (
                            <span className="relative group ml-1">
                              <span className="text-md rounded-full text-yellow-500 cursor-pointer">ⓘ</span>
                              <div className="absolute top-full mb-2 w-max px-2 py-1 rounded bg-neutral-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none z-[99999] whitespace-nowrap shadow-lg transform">
                              {description}
                              </div>
                            </span>
                          )}
    </>
  )
}

export default MattricHelper
