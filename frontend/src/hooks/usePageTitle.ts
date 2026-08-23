import { useEffect } from 'react';

const DEFAULT_TITLE = 'NaijaPins — Where Nigeria Remembers';

export function usePageTitle(title?: string) {
  useEffect(() => {
    if (title && title.trim()) {
      document.title = `${title.trim()} | NaijaPins`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}

export default usePageTitle;
