import { useState, useEffect } from 'react';
import { ioAdapter } from '../lib/io.js';

export function useDevice() {
  const [deviceInfo, setDeviceInfo] = useState(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const isTouch = typeof window !== 'undefined'
      ? (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window
      : false;

    return {
      width,
      height: typeof window !== 'undefined' ? window.innerHeight : 800,
      isMobile: width < 800,
      isTablet: width >= 800 && width <= 1024,
      isDesktop: width > 1024,
      isTouch,
      isNative: ioAdapter.isCapacitor,
      platform: ioAdapter.getPlatform()
    };
  });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

      setDeviceInfo({
        width,
        height,
        isMobile: width < 800,
        isTablet: width >= 800 && width <= 1024,
        isDesktop: width > 1024,
        isTouch,
        isNative: ioAdapter.isCapacitor,
        platform: ioAdapter.getPlatform()
      });
    };

    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  return deviceInfo;
}

export default useDevice;
