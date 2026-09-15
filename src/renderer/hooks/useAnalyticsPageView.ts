import { useEffect } from 'react';
import { useLocation } from 'react-router';

type PageView = {
  page_location: string;
  page_title: string;
};

const getPageView = (pathname: string): PageView | undefined => {
  if (pathname === '/') {
    return {
      page_location: 'https://devkitty.app/app',
      page_title: 'Projects'
    };
  }

  if (/^\/settings(?:\/[^/]+)?$/.test(pathname)) {
    return {
      page_location: 'https://devkitty.app/app/settings',
      page_title: 'Settings'
    };
  }
};

export const useAnalyticsPageView = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageView = getPageView(pathname);
    if (!pageView) return;

    void window.bridge.analytics?.trackEvent('page_view', pageView);
  }, [pathname]);
};
