import { useState, useCallback, useEffect } from 'react'

let toastFn = null

export function useToast() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    toastFn = (msg, type = 'default') => {
      setToast({ msg, type, id: Date.now() })
    }
    return () => { toastFn = null }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return toast
}

export function showToast(msg, type = 'default') {
  if (toastFn) toastFn(msg, type)
}

export function Toast({ toast }) {
  if (!toast) return null
  const colors = {
    default: { bg: 'var(--purple-800)', text: '#fff' },
    success: { bg: '#085041', text: '#fff' },
    error:   { bg: '#A32D2D', text: '#fff' },
  }
  const c = colors[toast.type] || colors.default
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, color: c.text,
      padding: '10px 18px', borderRadius: 'var(--radius-md)',
      fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      {toast.msg}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>
    </div>
  )
}
