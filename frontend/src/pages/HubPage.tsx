import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import fullLogo from '../assets/full_logo.png';
import reportLogo from '../assets/logo.png';
import videoLogo from '../features/video/assets/logo.png';
import { useAuthStore } from '../store/authStore';

/**
 * Post-login landing hub. Lets a user who can use both apps choose between the
 * Vehicle Report and Video Expert experiences. Deep-links (with a caseNumber)
 * bypass this and go straight to the relevant app via HomeRoute.
 */
const HubPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const expertName = useAuthStore((s) => s.expertName);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const cards = [
    {
      key: 'report',
      title: t('hub.reportTitle'),
      desc: t('hub.reportDesc'),
      logo: reportLogo,
      onClick: () => navigate('/report'),
      accent: 'hover:border-primary/40 hover:bg-orange-50/10',
    },
    {
      key: 'video',
      title: t('hub.videoTitle'),
      desc: t('hub.videoDesc'),
      logo: videoLogo,
      onClick: () => navigate('/video'),
      accent: 'hover:border-sky-400/40 hover:bg-sky-50/10',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <img src={fullLogo} alt="myGutachter" className="h-9" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('auth.logout')}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {t('hub.greeting', { name: expertName || '' })}
        </h1>
        <p className="text-gray-500 mb-10">{t('hub.subtitle')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-3xl">
          {cards.map((c) => {
            return (
              <button
                key={c.key}
                onClick={c.onClick}
                className={`group text-left rounded-3xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.99] flex flex-col justify-between min-h-[220px] ${c.accent}`}
              >
                <div>
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-3 mb-6 shadow border border-gray-100/80 group-hover:scale-105 transition-transform duration-300"
                  >
                    <img src={c.logo} alt={c.title} className="w-full h-full object-contain" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight group-hover:text-primary transition-colors duration-300">
                    {c.title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default HubPage;
