import { useEffect, useState } from 'react'
import { TossAds } from '@apps-in-toss/web-framework'

let initStarted = false
let initOk: boolean | null = null
const waiters: Array<(ok: boolean) => void> = []

/**
 * TossAds SDK를 앱에서 한 번만 초기화합니다.
 * StrictMode 중복 마운트에도 initialize를 두 번 부르지 않습니다.
 */
export const ensureTossAdsInitialized = (): Promise<boolean> => {
  if (!TossAds.initialize.isSupported()) {
    return Promise.resolve(false)
  }
  if (initOk !== null) {
    return Promise.resolve(initOk)
  }

  return new Promise(resolve => {
    waiters.push(resolve)
    if (initStarted) return
    initStarted = true

    try {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            initOk = true
            while (waiters.length) waiters.shift()?.(true)
          },
          onInitializationFailed: () => {
            initOk = false
            initStarted = false
            while (waiters.length) waiters.shift()?.(false)
          },
        },
      })
    } catch {
      initOk = false
      initStarted = false
      while (waiters.length) waiters.shift()?.(false)
    }
  })
}

/** 배너 부착 전에 SDK 준비 여부를 구독합니다. */
export const useTossAdsReady = (): boolean => {
  const [ready, setReady] = useState(initOk === true)

  useEffect(() => {
    let alive = true
    void ensureTossAdsInitialized().then(ok => {
      if (alive) setReady(ok)
    })
    return () => {
      alive = false
    }
  }, [])

  return ready
}
