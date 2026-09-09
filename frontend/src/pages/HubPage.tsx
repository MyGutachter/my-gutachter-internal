import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowRight, FileText, Video, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import fullLogo from '../assets/full_logo.png';
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
      badge: t('hub.reportBadge'),
      badgeIcon: FileText,
      badgeStyle: 'bg-orange-500/10 text-orange-700 border-orange-200/60',
      glowGradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
      hoverBorder: 'hover:border-orange-400/50 hover:shadow-orange-500/10',
      btnGradient: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-600/20',
      title: t('hub.reportTitle'),
      desc: t('hub.reportDesc'),
      logo: fullLogo,
      tags: [t('hub.tags.vehicleDamage'), t('hub.tags.appraisal'), t('hub.tags.pdfExport')],
      onClick: () => navigate('/report'),
    },
    {
      key: 'video',
      badge: t('hub.videoBadge'),
      badgeIcon: Video,
      badgeStyle: 'bg-orange-500/10 text-orange-700 border-orange-200/60',
      glowGradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
      hoverBorder: 'hover:border-orange-400/50 hover:shadow-orange-500/10',
      btnGradient: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-600/20',
      title: t('hub.videoTitle'),
      desc: t('hub.videoDesc'),
      logo: videoLogo,
      tags: [t('hub.tags.liveVideo'), t('hub.tags.scansUvv'), t('hub.tags.realTimeHd')],
      onClick: () => navigate('/video'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col relative overflow-hidden font-sans">

      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-12 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={fullLogo} alt="myGutachter" className="h-8 md:h-9 object-contain" />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 border border-transparent hover:border-slate-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>{t('auth.logout')}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-16 max-w-5xl mx-auto w-full z-10">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center max-w-xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('hub.selectWorkspace')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            {t('hub.greeting', { name: expertName || '' })}
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            {t('hub.subtitle')}
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {cards.map((c, idx) => {
            const BadgeIcon = c.badgeIcon;
            return (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.15, ease: 'easeOut' }}
                className="h-full"
              >
                <button
                  onClick={c.onClick}
                  className={`group relative w-full h-full text-left rounded-3xl bg-white border border-slate-200/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 active:scale-[0.99] flex flex-col justify-between overflow-hidden cursor-pointer ${c.hoverBorder}`}
                >
                  {/* Subtle Gradient Glow background inside card */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.glowGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      {/* Top Bar inside Card: Logo & Category Badge */}
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="inline-flex items-center justify-center h-14 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-inner group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                          <img src={c.logo} alt={c.title} className="h-full w-auto max-w-[130px] object-contain" />
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.badgeStyle}`}>
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{c.badge}</span>
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight group-hover:text-slate-950">
                        {c.title}
                      </h2>
                      <p className="text-sm text-slate-500 leading-relaxed mb-6">
                        {c.desc}
                      </p>

                      {/* Feature Tags */}
                      <div className="flex flex-wrap gap-2 mb-8">
                        {c.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-600 text-xs font-medium group-hover:bg-white group-hover:border group-hover:border-slate-200 transition-all duration-200"
                          >
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                        {t('hub.openNow')}
                      </span>
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${c.btnGradient} shadow-md group-hover:scale-110 transition-all duration-300`}>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default HubPage;
