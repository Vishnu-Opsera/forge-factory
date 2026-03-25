import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import ja from './ja.json';
import zh from './zh.json';
import pt from './pt.json';
import hi from './hi.json';
import ko from './ko.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja },
      zh: { translation: zh },
      pt: { translation: pt },
      hi: { translation: hi },
      ko: { translation: ko },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'forge_lang',
    },
  });

export const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'ja', label: '日本語',      flag: '🇯🇵' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी',       flag: '🇮🇳' },
  { code: 'ko', label: '한국어',      flag: '🇰🇷' },
];

export default i18n;
