import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { startYouTubeTracking, endYouTubeTracking } from '@/lib/snowplow-config'

export const Route = createFileRoute('/video/')({ component: VideoPage })

const YOUTUBE_VIDEO_ID = '4ClPw87tiV0'
const IFRAME_ELEMENT_ID = 'banco-f-demo-video'

function VideoPage() {
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    const id = crypto.randomUUID()
    sessionIdRef.current = id
    startYouTubeTracking({
      id,
      video: IFRAME_ELEMENT_ID,
      boundaries: [25, 50, 75, 100],
      captureEvents: ['DefaultEvents'],
    })

    return () => {
      if (sessionIdRef.current) endYouTubeTracking(sessionIdRef.current)
    }
  }, [])

  return (
    <div className="mx-auto max-w-page px-6 py-12 lg:px-24">
      <h1 className="font-heading text-h2 text-text">Video</h1>
      <p className="mt-1 text-body text-text-secondary">Video de ejemplo con tracking de media de Snowplow.</p>

      <div className="relative mt-6 h-0 overflow-hidden rounded-[24px] shadow-sm" style={{ paddingBottom: '56.25%' }}>
        <iframe
          id={IFRAME_ELEMENT_ID}
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?enablejsapi=1&mute=1`}
          title="Banco F demo video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
