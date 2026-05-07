import React from 'react';
import { getStoredAccessToken } from '../lib/authStorage';

interface SecureImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
}

export function SecureImage({ src, alt, className }: SecureImageProps) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!src) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    const token = getStoredAccessToken();
    if (!token) return;

    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => (res.ok ? res.blob() : null))
      .then(blob => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!blobUrl) return null;
  return <img src={blobUrl} alt={alt} className={className} />;
}
