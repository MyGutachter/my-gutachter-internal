import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageToggle: React.FC<{ language: 'de' | 'en'; onChange: (lang: 'de' | 'en') => void }> = ({ language, onChange }) => {
    const { t } = useTranslation();
    return (
    <button
        onClick={() => onChange(language === 'de' ? 'en' : 'de')}
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 hover:border-primary transition-colors text-xs font-semibold bg-white"
        title={language === 'de' ? t('nav.switchToEnglish') : t('nav.switchToGerman')}
    >
        <span className={language === 'de' ? 'font-bold text-primary' : 'text-gray-400'}>DE</span>
        <span className="text-gray-300">|</span>
        <span className={language === 'en' ? 'font-bold text-primary' : 'text-gray-400'}>EN</span>
    </button>
    );
};

export default LanguageToggle;
