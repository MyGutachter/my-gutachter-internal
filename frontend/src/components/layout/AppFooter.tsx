import React from 'react';
import { useTranslation } from 'react-i18next';
import { COMPANY_INFO } from '../../constants/companyInfo';

const AppFooter: React.FC = () => {
    const { t } = useTranslation();

    return (
        <footer className="bg-dark-gray text-gray-400 py-4 text-xs no-print">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <p className="font-semibold text-white mb-1">{COMPANY_INFO.name}</p>
                        <p>{COMPANY_INFO.fullAddress}</p>
                        <p>{t('footer.phone')}: {COMPANY_INFO.phone}</p>
                        <p>{COMPANY_INFO.website}</p>
                    </div>
                    <div>
                        <p>{t('footer.court')}: {COMPANY_INFO.amtsgericht}</p>
                        <p>{t('footer.vatId')}: {COMPANY_INFO.ustIdNr}</p>
                        <p>{t('footer.taxNumber')}: {COMPANY_INFO.steuernummer}</p>
                        <p>{COMPANY_INFO.bank} | {COMPANY_INFO.iban}</p>
                    </div>
                    <div>
                        <p>{t('footer.managingDirectors')}:</p>
                        {COMPANY_INFO.geschaeftsfuehrer.map(n => <p key={n}>{n}</p>)}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;
