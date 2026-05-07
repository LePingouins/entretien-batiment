import { getStoredAccessToken } from './authStorage';

async function fetchBlobWithAuth(apiPath: string): Promise<Blob | null> {
  const token = getStoredAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(apiPath, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

export async function downloadSecureFile(apiPath: string, filename: string): Promise<void> {
  const blob = await fetchBlobWithAuth(apiPath);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function openSecureFile(apiPath: string): Promise<void> {
  const blob = await fetchBlobWithAuth(apiPath);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoke after a minute — long enough for the tab to load
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
