import React from 'react';

export const BrandBadge: React.FC = () => (
  <span className="brand-badge" aria-hidden="true">
    <img
      src="/favicon.png"
      srcSet="/favicon-192.png 2x"
      alt=""
      width={32}
      height={32}
      decoding="async"
    />
  </span>
);
