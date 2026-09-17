import { useEffect, useRef, useState } from 'react'
import { TossAds } from '@apps-in-toss/web-framework'
import { BANNER_AD_GROUP_ID } from '../lib/ads.ts'
import { useTossAdsReady } from '../lib/useTossAds.ts'

type Props = {
  /** 화면마다 슬롯을 구분 (홈/꾸미기) — 언마운트 시 destroy */
  slotId: string
}

/**
 * 스크롤 화면용 리스트형 배너.
 * - width 100% / height 96px (고정형 권장)
 * - 미지원·no-fill 시 슬롯을 숨겨 빈 여백을 남기지 않습니다.
 */
export function BannerAdSlot({ slotId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const adsReady = useTossAdsReady()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!adsReady) return
    if (!TossAds.attachBanner.isSupported()) {
      setVisible(false)
      return
    }
    const el = containerRef.current
    if (!el) return

    setVisible(true)
    let destroyed = false
    const attached = TossAds.attachBanner(BANNER_AD_GROUP_ID, el, {
      theme: 'light',
      tone: 'grey',
      variant: 'card',
      callbacks: {
        onNoFill: () => {
          if (!destroyed) setVisible(false)
        },
        onAdFailedToRender: () => {
          if (!destroyed) setVisible(false)
        },
      },
    })

    return () => {
      destroyed = true
      attached?.destroy()
    }
  }, [adsReady, slotId])

  if (!visible && adsReady) {
    return null
  }

  return (
    <div className="banner-ad-wrap" aria-label="광고">
      <div ref={containerRef} className="banner-ad-slot" />
    </div>
  )
}
