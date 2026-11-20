import { useEffect, useEffectEvent, useState } from "react"

// Returns a ref for an element, usually an empty one at the end of a list, and
// calls onScrolledIntoView whenever that element becomes visible while
// enabled. If it is still visible when re-enabled, the call comes at once.
export const useScrolledIntoView = (onScrolledIntoView: () => void, enabled: boolean) => {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const scrolledIntoView = useEffectEvent(onScrolledIntoView)

  useEffect(() => {
    if (!enabled || target === null) {
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        scrolledIntoView()
      }
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [enabled, target])

  return setTarget
}
