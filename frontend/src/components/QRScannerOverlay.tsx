import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Called every time a QR or barcode is successfully decoded */
  onScan: (value: string) => void;
  onClose: () => void;
  isDark: boolean;
  /** When true, shows a brief "last scanned" value on screen */
  lastScanned?: string | null;
}

/**
 * Full-screen camera overlay that decodes QR codes and barcodes using
 * html5-qrcode (dynamically imported so it doesn't bloat the main bundle).
 *
 * The camera always uses the rear-facing lens (facingMode: environment).
 * Each unique decoded value fires onScan() — rapid duplicate scans of the
 * same code are debounced for 1.5 s to avoid double-increments.
 */
export default function QRScannerOverlay({ onScan, onClose, isDark, lastScanned }: Props) {
  const elementId = 'qr-scanner-viewport';
  const scannerRef = useRef<any>(null);
  const lastValueRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            const value = decoded.trim();
            // Debounce: ignore same code within 1.5 s
            if (value === lastValueRef.current) return;
            lastValueRef.current = value;
            onScan(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              lastValueRef.current = null;
            }, 1500);
          },
          () => { /* ignore frame-level errors */ }
        );
      } catch (err: any) {
        if (mounted) {
          setCamError(
            err?.message?.includes('permission')
              ? 'Camera permission denied. Please allow camera access and try again.'
              : 'Could not start camera. Make sure no other app is using it.'
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      scannerRef.current?.stop().then(() => {
        scannerRef.current?.clear();
      }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <div>
          <p className="text-white font-semibold text-base">Scan QR / Barcode</p>
          <p className="text-gray-400 text-xs mt-0.5">Point camera at a product label</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Close scanner"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {camError ? (
          <div className="text-center px-8">
            <p className="text-red-400 text-sm mb-4">{camError}</p>
            <button onClick={onClose} className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* html5-qrcode mounts the video stream into this div */}
            <div id={elementId} className="w-full max-w-sm" />
            {/* Corner guides overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-60 h-60">
                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-sm" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-sm" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-sm" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-sm" />
                {/* Scanning line animation */}
                <span className="absolute left-2 right-2 h-0.5 bg-brand-400/70 animate-scan-line" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Last scanned feedback */}
      <div className="px-4 py-4 bg-black/80 min-h-[64px] flex items-center justify-center">
        {lastScanned ? (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-4 py-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-400 flex-shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-emerald-300 text-sm font-medium truncate max-w-[200px]">{lastScanned}</span>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No scan yet</p>
        )}
      </div>
    </div>
  );
}
