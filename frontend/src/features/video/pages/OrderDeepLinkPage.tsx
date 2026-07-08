import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import type { UserRole } from '../../../store/authStore';
import api from '../../../utils/api';

/**
 * Order deep-link entry (T7.6c, extended T7.9) — ported from VideoExpert's /order/:orderId.
 * Two ways in:
 *  - `?token=&expertName=&role=&isVideoxpert=` — the OMT deep-link flow: the merged backend's
 *    GET /api/auth/deeplink already decoded + validated a signed token and 302-redirected here
 *    with a ready-to-use session (no further network round trip needed). Routes to the video
 *    call or the report form depending on `isVideoxpert`.
 *  - `?apikey=` (legacy) — exchanges the key for a session via POST /auth/api-key-login, then
 *    always opens the report (from where "Open Video Call" is available).
 */
const OrderDeepLinkPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { orderId } = useParams<{ orderId: string }>();
    const [searchParams] = useSearchParams();
    const apiKey = searchParams.get('apikey') || searchParams.get('apiKey');
    const deepLinkToken = searchParams.get('token');
    const expertName = searchParams.get('expertName');
    const role = searchParams.get('role') as UserRole | null;
    const isVideoxpertParam = searchParams.get('isVideoxpert') === 'true';
    const sessionToken = useAuthStore((s) => s.token);
    const setAuth = useAuthStore((s) => s.setAuth);
    const [error, setError] = useState<string | null>(null);
    const ranRef = useRef(false);

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        const goToVideo = () => {
            if (orderId) {
                navigate(`/video/order/${encodeURIComponent(orderId)}`, { replace: true });
            } else {
                navigate('/video', { replace: true });
            }
        };
        const goToReport = () => {
            if (orderId) {
                navigate(`/report/form?caseNumber=${encodeURIComponent(orderId)}`, { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        };

        (async () => {
            // OMT deep-link: the backend already minted + validated the session.
            if (deepLinkToken && expertName && role) {
                setAuth(deepLinkToken, expertName, role, isVideoxpertParam);
                if (isVideoxpertParam) {
                    goToVideo();
                } else {
                    goToReport();
                }
                return;
            }

            if (sessionToken) {
                goToReport();
                return;
            }
            if (apiKey) {
                try {
                    const res = await api.post('/auth/api-key-login', { apiKey });
                    const { jwt, expertName: name, role: resRole, isVideoxpert } = res.data;
                    setAuth(jwt, name, resRole, isVideoxpert);
                    goToReport();
                } catch (err) {
                    console.error('API-key login failed', err);
                    setError(t('orderDeepLink.authFailed', { defaultValue: 'Could not authenticate this link.' }));
                }
            } else {
                navigate(`/login?redirect=${encodeURIComponent(`/order/${orderId || ''}`)}`, { replace: true });
            }
        })();
    }, [orderId, apiKey, deepLinkToken, expertName, role, isVideoxpertParam, sessionToken, setAuth, navigate, t]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            {error ? (
                <div className="text-center max-w-sm">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <p className="text-gray-700 font-semibold mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-5 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-orange-700"
                    >
                        {t('auth.backToLogin')}
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">{t('orderDeepLink.opening', { defaultValue: 'Opening order…' })}</p>
                </div>
            )}
        </div>
    );
};

export default OrderDeepLinkPage;
