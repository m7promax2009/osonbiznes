import React from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, CheckCircle } from 'lucide-react'

const languages = [
  { code: 'uz', name: "O'zbek", flag: "🇺🇿" },
  { code: 'ru', name: 'Русский', flag: "🇷🇺" },
  { code: 'en', name: 'English', flag: "🇬🇧" },
]

export default function LanguageSwitcher({ dropdown = false, className = '' }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  const switchLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('osonbiznes_lang', code)
    setOpen(false)
  }

  if (dropdown) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          aria-label={t('app.language')}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 transition text-xs ${className}`}
          title={t('app.language')}
        >
          <Languages className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span className="text-slate-600 font-medium" aria-hidden="true">{currentLang.flag}</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div role="listbox" aria-label={t('app.language')} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 animate-fade-in">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => switchLanguage(lang.code)}
                  role="option"
                  aria-selected={i18n.language === lang.code}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition ${
                    i18n.language === lang.code
                      ? 'text-emerald-700 bg-emerald-50 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.name}</span>
                  {i18n.language === lang.code && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Compact inline version for headers
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => switchLanguage(lang.code)}
          aria-label={lang.name}
          title={lang.name}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
            i18n.language === lang.code
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span aria-hidden="true">{lang.flag}</span>
        </button>
      ))}
    </div>
  )
}
