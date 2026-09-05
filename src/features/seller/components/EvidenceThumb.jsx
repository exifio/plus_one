import { useEffect, useState } from 'react';

export default function EvidenceThumb({ image, alt }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!image) {
      setSrc(null);
      return undefined;
    }

    if (typeof image === 'string') {
      setSrc(image);
      return undefined;
    }

    if (typeof URL.createObjectURL !== 'function') {
      setSrc(null);
      return undefined;
    }

    const nextSrc = URL.createObjectURL(image);
    setSrc(nextSrc);
    return () => URL.revokeObjectURL?.(nextSrc);
  }, [image]);

  if (!src) return null;
  return <img src={src} alt={alt ?? '보관상품 확인 이미지'} className="evidence-thumb" />;
}
