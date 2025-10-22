import { useState, useEffect } from 'react'

export const usePageLoading = (duration: number = 800) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  return loading
}