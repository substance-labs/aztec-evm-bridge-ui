import { useEffect, useRef } from "react"

type UseComponentVisibleProps = {
  trigger: () => void
}

export default function useOutsideAlerter({ trigger }: UseComponentVisibleProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  const handleClickOutside = (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      trigger()
    }
  }

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, true)
    return () => {
      document.removeEventListener("click", handleClickOutside, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref }
}
