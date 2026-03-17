import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage – Renders an image that only loads when it enters the viewport.
 * Uses IntersectionObserver for efficient lazy loading with a smooth fade-in.
 *
 * Props:
 * - src: image source URL
 * - alt: alt text
 * - className: CSS class
 * - style: inline styles
 * - onClick: click handler
 * - placeholder: custom placeholder (default: grey shimmer)
 * - rootMargin: IntersectionObserver margin (default: '200px')
 * - ...rest: any other props passed to <img>
 */
const LazyImage = ({
  src,
  alt = '',
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

  const placeholderStyle = {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(110deg, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 70%)',
    backgroundSize: '200% 100%',
    animation: isInView ? 'none' : 'lazyShimmer 1.5s ease infinite',
    ...style,
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-wrapper ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...(!isLoaded ? placeholderStyle : {}),
      }}
      onClick={onClick}
    >
      {isInView && (
        <img
          src={src}
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
