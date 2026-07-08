import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (token && !searchParams.get('jwt')) {
      navigate('/');
    } else if (!token && !searchParams.get('jwt')) {
      // If no token and no JWT in URL, redirect to admin login
      navigate('/login');
    }
  }, [token, navigate, searchParams]);

  useEffect(() => {
    const jwtToken = searchParams.get('jwt');
    const id = searchParams.get('orderId');
    console.log('AuthPage: searchParams', { jwtToken, id });

    if (jwtToken && !verifyAttempted.current) {
      verifyAttempted.current = true;

      // Validation Logic: treat orderId as optional and validate format
      const isUuid = (val: string | null) => {
        if (!val || val === 'NA') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(val);
      };

      const validId = isUuid(id) ? id : null;
      const url = validId ? `/auth/verify?token=${jwtToken}&id=${validId}` : `/auth/verify?token=${jwtToken}`;

      api.get(url)
        .then((response) => {
          const { jwt, expertName, role, caseNumber, isVideoxpert } = response.data;
          setAuth(jwt, expertName, role, isVideoxpert);
          if (caseNumber) {
            navigate(`/?caseNumber=${caseNumber}`);
          } else {
            navigate('/');
          }
        })
        .catch((error) => {
          console.error('Authentication failed', error);
          toast.error(t('auth.fail') || 'Authentication failed');
          navigate('/login');
        });
    }
  }, [searchParams, setAuth, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">{t('auth.verifying')}</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthPage;
