import { createContext, useContext, useState, useEffect } from 'react'
import de from './locales/de.json'
import en from './locales/en.json'

const translations = { de, en }

const I18nContext = createContext()

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('crm_locale') || 'de'
  })

  useEffect(() => {
    localStorage.setItem('crm_locale', locale)
  }, [locale])

  const t = (key, params = {}) => {
    const keys = key.split('.')
    let value = translations[locale]
    
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }
    
    if (value === undefined) {
      console.warn(`Translation missing: ${key} (${locale})`)
      return key
    }
    
    // Simple variable replacement for {{variable}}
    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match
      })
    }
    
    return value
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider')
  }
  return context
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()
  
  return (
    <select 
      value={locale} 
      onChange={(e) => setLocale(e.target.value)}
      style={{ 
        padding: '0.4rem 0.6rem', 
        borderRadius: '4px',
        border: '1px solid rgba(0,0,0,0.1)',
        background: 'white',
        cursor: 'pointer'
      }}
    >
      <option value="de">🇩🇪 Deutsch</option>
      <option value="en">🇬🇧 English</option>
    </select>
  )
}
