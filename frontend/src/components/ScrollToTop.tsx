import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    // Reset scroll to top on path or search param change.
    const timer = setTimeout(scrollToTop, 150);
    return () => clearTimeout(timer);
  }, [pathname, search]);

  return null;
}
