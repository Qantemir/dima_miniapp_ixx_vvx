import { useCallback, useEffect, useState } from 'react';

/**
 * Returns a ref callback for a header element and its measured height.
 * The height is tracked via ResizeObserver so we can offset the page content
 * when the header is fixed to the top of the viewport.
 */
export const useFixedHeaderOffset = (fallbackHeight = 72) => {
  const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(fallbackHeight);

  const headerRef = useCallback((node: HTMLDivElement | null) => {
    setHeaderElement(node);
    if (node) {
      setHeaderHeight(node.getBoundingClientRect().height || fallbackHeight);
    }
  }, [fallbackHeight]);

  useEffect(() => {
    if (!headerElement) {
      return;
    }

    const handleResize = () => {
      setHeaderHeight(headerElement.getBoundingClientRect().height || fallbackHeight);
    };

    handleResize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      observer.observe(headerElement);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [headerElement, fallbackHeight]);

  return { headerRef, headerHeight };
};

