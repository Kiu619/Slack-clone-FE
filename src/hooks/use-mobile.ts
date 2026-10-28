import * as React from "react"

const MOBILE_BREAKPOINT = 768
export const PANEL_FULLWIDTH_BREAKPOINT = 1150

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsPanelFullwidth() {
  const [isNarrow, setIsNarrow] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${PANEL_FULLWIDTH_BREAKPOINT - 1}px)`,
    )
    const onChange = () => {
      const next = window.innerWidth < PANEL_FULLWIDTH_BREAKPOINT
      // DEBUG_TEMP_START
      // eslint-disable-next-line no-console
      console.log('[panel-fullwidth:change]', {
        innerWidth: window.innerWidth,
        breakpoint: PANEL_FULLWIDTH_BREAKPOINT,
        next,
        prev: isNarrow,
      })
      // DEBUG_TEMP_END
      setIsNarrow(next)
    }
    mql.addEventListener("change", onChange)
    const init = window.innerWidth < PANEL_FULLWIDTH_BREAKPOINT
    // DEBUG_TEMP_START
    // eslint-disable-next-line no-console
    console.log('[panel-fullwidth:init]', {
      innerWidth: window.innerWidth,
      next: init,
    })
    // DEBUG_TEMP_END
    setIsNarrow(init)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isNarrow
}
