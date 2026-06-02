import { useState, useCallback } from 'react'

export function useAsync<T>(asyncFunction: (...args: any[]) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true)
    setError(null)
    try {
      const res = await asyncFunction(...args)
      setData(res)
      return res
    } catch (err) {
      const error = err instanceof Error ? err : new Error('请求失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [asyncFunction])

  return { data, loading, error, execute }
}