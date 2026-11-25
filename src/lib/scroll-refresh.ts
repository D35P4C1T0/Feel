export function boostScrollRefreshRate() {
  if (!('GestureEvent' in window) || navigator.maxTouchPoints === 0) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const boost = document.createElement('div')
  boost.className = 'scroll-refresh-boost'
  boost.setAttribute('aria-hidden', 'true')
  boost.inert = true
  const pacer = document.createElement('div')
  boost.append(pacer)

  let frame = 0
  let lastScroll = 0
  let nextPace = 0
  let top = 0

  function stop() {
    cancelAnimationFrame(frame)
    frame = 0
    boost.remove()
  }

  function tick(now: number) {
    if (now - lastScroll > 500) {
      stop()
      return
    }

    // iOS WebKit can raise ProMotion's refresh rate when a compositor animation runs alongside a smooth scroll.
    if (now >= nextPace) {
      top = top === 0 ? 200 : 0
      pacer.scrollTo({ top, behavior: 'smooth' })
      nextPace = now + 250
    }
    frame = requestAnimationFrame(tick)
  }

  function onScroll(event: Event) {
    if (event.target === pacer || document.hidden || reducedMotion.matches) return
    lastScroll = performance.now()
    if (frame) return

    nextPace = 0
    top = 0
    document.body.append(boost)
    frame = requestAnimationFrame(tick)
  }

  window.addEventListener('scroll', onScroll, { capture: true, passive: true })
  document.addEventListener('visibilitychange', stop)
  reducedMotion.addEventListener('change', stop)
  return () => {
    window.removeEventListener('scroll', onScroll, true)
    document.removeEventListener('visibilitychange', stop)
    reducedMotion.removeEventListener('change', stop)
    stop()
  }
}
