import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage – Renders an image that only loads when it enters the viewport.
 * Uses IntersectionObserver for efficient lazy loading with a smooth fade-in.
 *
 * Props:
 * - src: image source URL
 * - mobileSrc: alternative image source for mobile (screen width < 768px)
 * - alt: alt text
 * - width: width for the wrapper div (prevents CLS)
 * - height: height for the wrapper div (prevents CLS)
 * - className: CSS class
 * - style: inline styles
 * - onClick: click handler
 * - placeholder: custom placeholder (default: grey shimmer)
 * - rootMargin: IntersectionObserver margin (default: '200px')
 * - ...rest: any other props passed to <img>
 */

// Inject shimmer keyframes once
const injectShimmerStyle = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lazy-image-shimmer-style')) return;
  const style = document.createElement('style');
  style.id = 'lazy-image-shimmer-style';
  style.textContent = `
    @keyframes lazyShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
};

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
};

const LazyImage = ({
  src,
  mobileSrc,
  alt = '',
  width,
  height,
  className = '',
  style = {},
  onClick,
  placeholder,
  rootMargin = '200px',
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  // Inject shimmer animation on first render
  useEffect(() => {
    injectShimmerStyle();
  }, []);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    // If IntersectionObserver is not supported, load immediately
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Determine which src to use (mobile vs desktop)
  const resolvedSrc = mobileSrc && isMobile() ? mobileSrc : src;

  const placeholderStyle = {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(110deg, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 70%)',
    backgroundSize: '200% 100%',
    animation: isInView ? 'none' : 'lazyShimmer 1.5s ease infinite',
    ...style,
  };

  const wrapperStyle = {
    position: 'relative',
    overflow: 'hidden',
    ...(width != null ? { width } : {}),
    ...(height != null ? { height } : {}),
    ...(!isLoaded ? placeholderStyle : {}),
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-wrapper ${className}`}
      style={wrapperStyle}
      onClick={onClick}
    >
      {isInView && (
        <img
          src={resolvedSrc}
          alt={alt}
          className={className}
          style={{
            ...style,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
          decoding="async"
          {...rest}
        />
      )}
      {placeholder && !isLoaded && placeholder}
    </div>
  );
};

export default LazyImage;
