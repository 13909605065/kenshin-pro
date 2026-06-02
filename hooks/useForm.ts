import { useState } from 'react'

export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [form, setForm] = useState<T>(initialValues)

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const reset = () => setForm(initialValues)

  return { form, onChange, setForm, reset }
}