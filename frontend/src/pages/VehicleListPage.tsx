import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { VEHICLE_DATABASE } from '../constants/vehicleDatabase';
import AppHeader from '../components/layout/AppHeader';
import AppFooter from '../components/layout/AppFooter';

const VehicleListPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return VEHICLE_DATABASE;
        return VEHICLE_DATABASE.filter(v =>
            v.manufacturer.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q) ||
            v.audatexNr.includes(q)
        );
    }, [search]);

    const grouped = useMemo(() => {
        const map = new Map<string, typeof filtered>();
        filtered.forEach(v => {
            if (!map.has(v.manufacturer)) map.set(v.manufacturer, []);
            map.get(v.manufacturer)!.push(v);
        });
        return map;
    }, [filtered]);

    const colors = ['bg-red-50', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-pink-50', 'bg-indigo-50', 'bg-orange-50'];

    return (
        <div className="min-h-screen flex flex-col bg-light-gray">
            <AppHeader />
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div>
                        <h1 className="text-lg font-bold text-primary">{t('vehicleList.title')}</h1>
                        <p className="text-sm text-gray-500">{t('vehicleList.subtitle')}</p>
                    </div>
                    <button onClick={onBack} className="btn-outline text-sm">{t('vehicleList.backToHome')}</button>
                </div>

                <input className="form-input mb-4 max-w-md" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('vehicleList.search')} />

                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="w-full min-w-[700px]">
                        <thead><tr>
                            <th className="table-header">{t('vehicleList.manufacturer')}</th>
                            <th className="table-header">{t('vehicleList.vehicleType')}</th>
                            <th className="table-header">{t('vehicleList.period')}</th>
                            <th className="table-header">{t('vehicleList.audatexNr')}</th>
                            <th className="table-header">{t('vehicleList.herstellerKat')}</th>
                            <th className="table-header">{t('vehicleList.aztKat')}</th>
                        </tr></thead>
                        <tbody>
                            {[...grouped.entries()].map(([mfr, vehicles], gi) => (
                                <React.Fragment key={mfr}>
                                    {vehicles.map((v, i) => (
                                        <tr key={v.audatexNr} className={`hover:bg-primary-light cursor-pointer ${colors[gi % colors.length]}`}>
                                            {i === 0 && <td className="table-cell font-bold text-primary" rowSpan={vehicles.length}>{mfr}</td>}
                                            <td className="table-cell">{v.model}</td>
                                            <td className="table-cell text-xs">{v.period}</td>
                                            <td className="table-cell font-mono">{v.audatexNr}</td>
                                            <td className="table-cell text-center font-bold">{v.herstellerKat}</td>
                                            <td className="table-cell text-center font-bold">{v.aztKat}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-400 mt-4">{filtered.length} {t('vehicleList.results')}</p>
            </main>
            <AppFooter />
        </div>
    );
};

export default VehicleListPage;
