import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../context/LangContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { SecureImage } from '../components/SecureImage';
import { getStoredAccessToken } from '../lib/authStorage';
import {
  getMyExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceipt,
  deleteExpenseReceipt,
  expenseReceiptUrl,
} from '../lib/api';
import type { Expense, ExpenseRequest, ExpenseStatus } from '../types/api';
import { parseReceipt, PROVINCE_TAXES, type ParsedReceipt } from '../lib/receiptParsers';
import { EXPENSE_CATEGORIES, expenseCategoryById, expenseCategoryLabel } from '../lib/expenseCategories';

// ── Helpers ───────────────────────────────────────────────────────────────
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Preprocess receipt image on a canvas:
 *  - Upscale 3× (small text on receipts needs ≥300 dpi equivalent)
 *  - Convert to greyscale then apply Otsu automatic binarization
 *    (adapts to photo exposure — far more consistent than fixed contrast boost)
 */
const preprocessReceiptImage = (source: File | Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Adaptive scale + size cap. The previous fixed 3× upscale turned a
      // typical phone photo (~3000×4000) into a 9000×12000 canvas, making
      // Tesseract take 30 s+ per receipt with no extra accuracy. Target a
      // long-edge of ~2200 px — empirically the sweet spot for receipt text.
      const TARGET_LONG_EDGE = 2200;
      const MAX_SCALE = 3.0;   // tiny scans (low-res) get the original boost
      const MIN_SCALE = 1.0;   // never downscale below 1× (loses fine print)
      const longEdge = Math.max(img.naturalWidth, img.naturalHeight) || 1;
      let scale = TARGET_LONG_EDGE / longEdge;
      if (scale > MAX_SCALE) scale = MAX_SCALE;
      if (scale < MIN_SCALE) scale = MIN_SCALE;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.naturalWidth  * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const n = d.length / 4;
      const W = canvas.width;
      const H = canvas.height;

      // Step 1: greyscale (luminosity)
      const greys = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const p = i * 4;
        greys[i] = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
      }

      // Step 2: tile-local Otsu — global Otsu picks ONE threshold for the whole
      // image, which collapses when lighting is uneven (shadows from crumpled
      // paper, busy backgrounds like the user's starry placemat, off-angle
      // flash). Per-tile thresholds adapt to each region independently.
      const TILES_X = 4;
      const TILES_Y = 8;
      const tileW = Math.ceil(W / TILES_X);
      const tileH = Math.ceil(H / TILES_Y);
      const thresholds = new Uint8Array(TILES_X * TILES_Y);

      const otsuOfTile = (x0: number, y0: number, x1: number, y1: number): number => {
        const hist = new Float32Array(256);
        let count = 0;
        for (let y = y0; y < y1; y++) {
          const row = y * W;
          for (let x = x0; x < x1; x++) {
            hist[greys[row + x]]++;
            count++;
          }
        }
        if (count === 0) return 128;
        let sumT = 0;
        for (let i = 0; i < 256; i++) sumT += i * hist[i];
        let sumB = 0, wB = 0, maxVar = 0, thr = 128;
        for (let i = 0; i < 256; i++) {
          wB += hist[i];
          if (!wB) continue;
          const wF = count - wB;
          if (!wF) break;
          sumB += i * hist[i];
          const mB = sumB / wB;
          const mF = (sumT - sumB) / wF;
          const bv = wB * wF * (mB - mF) ** 2;
          if (bv > maxVar) { maxVar = bv; thr = i; }
        }
        return thr;
      };

      for (let ty = 0; ty < TILES_Y; ty++) {
        const y0 = ty * tileH;
        const y1 = Math.min(y0 + tileH, H);
        for (let tx = 0; tx < TILES_X; tx++) {
          const x0 = tx * tileW;
          const x1 = Math.min(x0 + tileW, W);
          thresholds[ty * TILES_X + tx] = otsuOfTile(x0, y0, x1, y1);
        }
      }

      // Step 3: binarize using each pixel's tile-local threshold.
      for (let y = 0; y < H; y++) {
        const ty = Math.min(TILES_Y - 1, (y / tileH) | 0);
        const tyRow = ty * TILES_X;
        const row = y * W;
        for (let x = 0; x < W; x++) {
          const tx = Math.min(TILES_X - 1, (x / tileW) | 0);
          const t = thresholds[tyRow + tx];
          const i = row + x;
          const bw = greys[i] > t ? 255 : 0;
          const p = i * 4;
          d[p] = d[p + 1] = d[p + 2] = bw;
          d[p + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
    };
    img.src = url;
  });

/** Run Tesseract OCR on a file or blob — lazy-loads the library */
const runClientOcr = async (source: File | Blob): Promise<string> => {
  const processed = await preprocessReceiptImage(source);
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    // PSM 6 = single uniform block — best after manual upscale+contrast
    await worker.setParameters({ tessedit_pageseg_mode: '6' as any });
    const { data: { text } } = await worker.recognize(processed);
    return text;
  } finally {
    await worker.terminate();
  }
};

/** Apply parsed OCR fields to the form setters */
const applyParsed = (
  parsed: ParsedReceipt,
  setters: { setSubtotal: (v:string)=>void; setTps: (v:string)=>void; setTvq: (v:string)=>void;
             setTvh: (v:string)=>void; setTip: (v:string)=>void; setTotal: (v:string)=>void;
             setSupplier: (v:string)=>void },
  currentSupplier: string,
) => {
  if (parsed.subtotal) setters.setSubtotal(parsed.subtotal);
  if (parsed.tps)      setters.setTps(parsed.tps);
  if (parsed.tvq)      setters.setTvq(parsed.tvq);
  if (parsed.tvh)      setters.setTvh(parsed.tvh);
  if (parsed.tip)      setters.setTip(parsed.tip);
  if (parsed.total)    setters.setTotal(parsed.total);
  // Only auto-fill supplier when the user hasn't already typed one — never overwrite manual input.
  if (parsed.supplier && !currentSupplier.trim()) setters.setSupplier(parsed.supplier);
};

const dollarsToCents = (s: string): number | undefined => {
  const v = s.trim();
  if (!v) return undefined;
  const n = Number(v.replace(',', '.'));
  if (!isFinite(n)) return undefined;
  return Math.round(n * 100);
};

const centsToDollars = (c?: number): string => {
  if (c == null) return '';
  return (c / 100).toFixed(2);
};

const fmtMoney = (c?: number): string => {
  if (c == null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'CAD' }).format(c / 100);
};

const statusBadge = (status: ExpenseStatus) => {
  const cls =
    status === 'APPROVED'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
      : status === 'REJECTED'
      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>;
};

// ── Edit Modal ────────────────────────────────────────────────────────────
type ModalProps = {
  expense: Expense | null;
  onClose: () => void;
  onSaved: (e: Expense) => void;
};

const ExpenseModal: React.FC<ModalProps> = ({ expense, onClose, onSaved }) => {
  const { t, lang } = useLang();
  const { addToast } = useToast();
  const confirm      = useConfirm();
  const isNew = !expense;

  const [date, setDate]                 = useState(expense?.date ?? todayIso());
  const [supplier, setSupplier]         = useState(expense?.supplier ?? '');
  const [description, setDescription]   = useState(expense?.description ?? '');
  const [province, setProvince]         = useState(expense?.province ?? 'QC');
  const [imputation, setImputation]     = useState(expense?.imputationCode ?? '');
  const [subtotal, setSubtotal]         = useState(centsToDollars(expense?.subtotalCents));
  const [tps, setTps]                   = useState(centsToDollars(expense?.tpsCents));
  const [tvq, setTvq]                   = useState(centsToDollars(expense?.tvqCents));
  const [tvh, setTvh]                   = useState(centsToDollars(expense?.tvhCents));
  const [tip, setTip]                   = useState(centsToDollars(expense?.tipCents));
  const [total, setTotal]               = useState(centsToDollars(expense?.totalCents));
  const [notes, setNotes]               = useState(expense?.notes ?? '');
  const [linked, setLinked]             = useState(true);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [ocrRunning, setOcrRunning]     = useState(false);
  const [ocrRawText, setOcrRawText]     = useState<string>('');
  const [ocrProfile, setOcrProfile]     = useState<{ id: string; label: string } | null>(null);
  const [showOcrDebug, setShowOcrDebug] = useState(false);
  const [current, setCurrent]           = useState<Expense | null>(expense);
  const [autoCreated, setAutoCreated]   = useState(false);

  // Reimbursement policy: total cannot exceed 201.21 $
  const MAX_TOTAL = 201.21;
  const setTotalCapped = (v: string) => {
    const n = parseFloat(v);
    setTotal(isFinite(n) && n > MAX_TOTAL ? MAX_TOTAL.toFixed(2) : v);
  };

  const setters = { setSubtotal, setTps, setTvq, setTvh, setTip, setTotal: setTotalCapped, setSupplier };

  // Skip auto-calc effects on initial mount (avoid overwriting loaded values)
  const taxCalcMounted   = useRef(false);
  const totalCalcMounted = useRef(false);
  // Skip effect cycles after OCR applies values. Counters (not booleans) because
  // a single OCR apply can trigger MULTIPLE effect runs: subtotal-change fires
  // taxCalc, which sets tps/tvq, which triggers totalCalc a second time. A
  // one-shot boolean would be consumed by the first run and let the cascade
  // overwrite the OCR-provided total with a recomputed sum.
  const skipNextTaxCalc   = useRef(0);
  const skipNextTotalCalc = useRef(0);

  // Auto-calculate taxes from province + subtotal (only when linked)
  useEffect(() => {
    if (!taxCalcMounted.current) { taxCalcMounted.current = true; return; }
    if (!linked) return;
    if (skipNextTaxCalc.current > 0) { skipNextTaxCalc.current--; return; }
    const sub = parseFloat(subtotal);
    if (!isFinite(sub) || sub <= 0 || !province) return;
    const rates = PROVINCE_TAXES[province.toUpperCase().trim()];
    if (!rates) return;
    if (rates.tps !== undefined) setTps((sub * rates.tps).toFixed(2)); else setTps('');
    if (rates.tvq !== undefined) setTvq((sub * rates.tvq).toFixed(2)); else setTvq('');
    if (rates.tvh !== undefined) setTvh((sub * rates.tvh).toFixed(2)); else setTvh('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, province, linked]);

  // Auto-compute total = sum of all components (only when linked)
  useEffect(() => {
    if (!totalCalcMounted.current) { totalCalcMounted.current = true; return; }
    if (!linked) return;
    if (skipNextTotalCalc.current > 0) { skipNextTotalCalc.current--; return; }
    const sum = [subtotal, tps, tvq, tvh, tip]
      .reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    setTotalCapped(sum > 0 ? sum.toFixed(2) : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, tps, tvq, tvh, tip, linked]);

  const buildRequest = (): ExpenseRequest => ({
    date,
    supplier: supplier || undefined,
    description: description || undefined,
    province: province || undefined,
    imputationCode: imputation || undefined,
    subtotalCents: dollarsToCents(subtotal),
    tpsCents: dollarsToCents(tps),
    tvqCents: dollarsToCents(tvq),
    tvhCents: dollarsToCents(tvh),
    tipCents: dollarsToCents(tip),
    totalCents: dollarsToCents(total),
    notes: notes || undefined,
  });

  const handleSave = async () => {
    if (!date) {
      addToast(lang === 'fr' ? 'Date requise' : 'Date required', 'error');
      return;
    }
    const totalNum = parseFloat(total);
    if (!total || !isFinite(totalNum) || totalNum <= 0) {
      addToast(lang === 'fr' ? 'Le montant total est requis' : 'Total amount is required', 'error');
      return;
    }
    if (!current || current.receipts.length === 0) {
      addToast(lang === 'fr' ? 'Au moins une photo (reçu) est requise' : 'At least one receipt photo is required', 'error');
      return;
    }
    try {
      setSaving(true);
      const saved = current
        ? await updateExpense(current.id, buildRequest())
        : await createExpense(buildRequest());
      setCurrent(saved);
      onSaved(saved);
      setAutoCreated(false);
      addToast(
        isNew && !current
          ? (lang === 'fr' ? 'Dépense créée' : 'Expense created')
          : (lang === 'fr' ? 'Dépense enregistrée' : 'Expense saved'),
        'success'
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data?.error || (lang === 'fr' ? 'Erreur' : 'Error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    let saved = current;
    let isAutoCreated = autoCreated;

    // Silently create the expense (to get an ID for the photo).
    // Does NOT notify the parent list — only happens on explicit save.
    if (!saved) {
      setSaving(true);
      try {
        saved = await createExpense(buildRequest());
        setCurrent(saved);
        setAutoCreated(true);
        isAutoCreated = true;
      } catch (err: any) {
        console.error(err);
        addToast(err?.response?.data?.error || (lang === 'fr' ? 'Erreur lors de la création' : 'Create error'), 'error');
        return;
      } finally {
        setSaving(false);
      }
    }

    // Upload the file only — OCR runs when user clicks "Exécuter OCR"
    setUploading(true);
    try {
      const updated = await uploadExpenseReceipt(saved.id, file);
      setCurrent(updated);
      if (!isAutoCreated) onSaved(updated); // update parent list only if already saved
      addToast(lang === 'fr' ? 'Photo ajoutée' : 'Photo added', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data?.error || (lang === 'fr' ? 'Échec du téléversement' : 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReceipt = async (rid: number) => {
    if (!current) return;
    try {
      await deleteExpenseReceipt(current.id, rid);
      const updated = { ...current, receipts: current.receipts.filter(r => r.id !== rid) };
      setCurrent(updated);
      if (!autoCreated) onSaved(updated);
      // Clear stale OCR text so a new photo starts fresh
      if (updated.receipts.length === 0) { setOcrRawText(''); setOcrProfile(null); }
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data?.error || (lang === 'fr' ? 'Erreur' : 'Error'), 'error');
    }
  };

  const handleOcr = async () => {
    if (!current?.receipts.length) return;
    const imgReceipt = current.receipts.find(r => (r.contentType || '').startsWith('image/'));
    if (!imgReceipt) {
      addToast(lang === 'fr' ? 'Aucune image disponible' : 'No image receipt found', 'error');
      return;
    }
    setOcrRunning(true);
    try {
      const token = getStoredAccessToken();
      const res = await fetch(expenseReceiptUrl(imgReceipt.filename), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const ocrText = await runClientOcr(blob);
      setOcrRawText(ocrText);
      const parsed = parseReceipt(ocrText, { province });
      setOcrProfile({ id: parsed.profileId, label: parsed.profileLabel });
      // Only block tax recalc if OCR actually found tax values (protects exact receipt
      // amounts from being overwritten by province-rate calculation).
      // If OCR missed all taxes, let auto-calc fill them from the province rate.
      // Exception: non-taxable invoices (noTax) must also skip auto-calc — no taxes apply.
      if (parsed.tps || parsed.tvq || parsed.tvh || parsed.noTax) {
        skipNextTaxCalc.current = 1;
      }
      // 2 cycles: (a) the initial subtotal-change run, (b) the cascade fired when
      // tax auto-calc sets tps/tvq. Without (b), the recomputed sum overwrites the
      // OCR-parsed total (e.g. Dollarama: 14.12 + auto 0.71 + auto 1.41 = 16.24,
      // but the receipt actually says 16.22).
      skipNextTotalCalc.current = parsed.total ? 2 : 1;
      applyParsed(parsed, setters, supplier);
      if (Object.values(parsed).some(v => v)) {
        addToast(lang === 'fr' ? 'Champs remplis depuis la facture' : 'Fields filled from receipt', 'success');
        confirm({
          title: lang === 'fr' ? '⚠️ Vérifiez les montants' : '⚠️ Review before saving',
          message: lang === 'fr'
            ? 'Le scan automatique a rempli les champs, mais il peut faire des erreurs. Vérifiez chaque montant (sous-total, taxes, total) avant d\'enregistrer la dépense.'
            : 'Auto scan has filled in the fields, but it can make mistakes. Please review every amount (subtotal, taxes, total) carefully before saving.',
          confirmLabel: lang === 'fr' ? 'Compris' : 'Got it',
          hideCancel: true,
        });
      } else {
        addToast(
          lang === 'fr'
            ? 'OCR illisible. Reprenez la photo : facture à plat, bien éclairée, droite, sur fond uni.'
            : 'OCR unreadable. Retake the photo: flatten the receipt, good light, straight angle, plain background.',
          'error',
        );
      }
    } catch (err: any) {
      console.error(err);
      addToast('OCR error', 'error');
    } finally {
      setOcrRunning(false);
    }
  };

  // Close — if expense was silently auto-created but never explicitly saved, delete it
  const handleClose = async () => {
    if (autoCreated && current) {
      try { await deleteExpense(current.id); } catch { /* ignore */ }
    }
    onClose();
  };

  // ESC key closes the modal; clicking the backdrop does NOT
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreated, current]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-surface-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {isNew && !current
                ? lang === 'fr' ? 'Nouvelle dépense' : 'New Expense'
                : lang === 'fr' ? 'Modifier la dépense' : 'Edit Expense'}
            </h2>
            <button
              onClick={handleClose}
              className="text-surface-500 hover:text-surface-800 dark:hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Reçus / Photos — shown first so the camera is immediately accessible on mobile */}
          <div className="space-y-3 pb-4 border-b border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {lang === 'fr' ? 'Reçus / Photos' : 'Receipts / Photos'}
              </h3>
              {current && current.receipts.length > 0 && (
                <button
                  onClick={handleOcr}
                  disabled={ocrRunning}
                  className="px-3 py-1.5 text-sm rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                  {ocrRunning ? '\u2026' : 'Auto scan'}
                </button>
              )}
            </div>

            {ocrRawText && (
              <div className="text-xs">
                {ocrProfile && (
                  <div className="mb-1 text-surface-600 dark:text-surface-300">
                    {lang === 'fr' ? 'Profil détecté' : 'Detected profile'}:{' '}
                    <span className="font-semibold text-brand-600 dark:text-brand-300">
                      {ocrProfile.label}
                    </span>
                    <span className="text-surface-400"> ({ocrProfile.id})</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowOcrDebug(v => !v)}
                  className="text-surface-400 hover:text-surface-600 underline"
                >
                  {showOcrDebug
                    ? (lang === 'fr' ? 'Masquer le texte OCR brut' : 'Hide raw OCR text')
                    : (lang === 'fr' ? 'Afficher le texte OCR brut' : 'Show raw OCR text')}
                </button>
                {showOcrDebug && (
                  <pre className="mt-1 p-2 bg-surface-100 dark:bg-surface-800 rounded text-[10px] max-h-40 overflow-auto whitespace-pre-wrap break-all border border-surface-200 dark:border-surface-700">
                    {ocrRawText}
                  </pre>
                )}
              </div>
            )}

            {current && current.receipts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {current.receipts.map((r) => {
                  const isImg = (r.contentType || '').startsWith('image/');
                  const url = expenseReceiptUrl(r.filename);
                  return (
                    <div key={r.id} className="relative border border-surface-200 dark:border-surface-700 rounded overflow-hidden bg-surface-50 dark:bg-surface-800">
                      {isImg ? (
                        <SecureImage src={url} alt={r.originalName || r.filename} className="w-full h-24 object-cover" />
                      ) : (
                        <span className="block p-3 text-xs text-brand-600 dark:text-brand-300 truncate">
                          📄 {r.originalName || r.filename}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteReceipt(r.id)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center"
                        aria-label="Delete receipt"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <label className="inline-block">
              <span className="px-4 py-2 text-sm rounded bg-surface-700 hover:bg-surface-800 text-white cursor-pointer font-medium">
                {saving || uploading ? '\u2026' : (lang === 'fr' ? '\u{1F4F7} Ajouter une photo' : '\u{1F4F7} Add photo')}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={uploading || saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleUpload(f);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-surface-600 dark:text-surface-300 mb-1">{lang === 'fr' ? 'Date' : 'Date'}*</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
              />
            </label>
            <label className="text-sm">
              <div className="text-surface-600 dark:text-surface-300 mb-1">{lang === 'fr' ? 'Fournisseur' : 'Supplier'}</div>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <div className="text-surface-600 dark:text-surface-300 mb-1">{lang === 'fr' ? 'Catégorie' : 'Category'}</div>
              <select
                value={EXPENSE_CATEGORIES.some(c => c.id === description) ? description : ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setDescription(id);
                  const cat = expenseCategoryById(id);
                  if (cat) setImputation(cat.code);
                }}
                className="w-full px-3 py-2 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
              >
                <option value="">{lang === 'fr' ? '— Choisir une catégorie —' : '— Select a category —'}</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{lang === 'fr' ? c.fr : c.en}</option>
                ))}
              </select>
              {description && !EXPENSE_CATEGORIES.some(c => c.id === description) && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {lang === 'fr'
                    ? `Ancienne description : « ${description} » — choisissez une catégorie pour la remplacer.`
                    : `Legacy description: "${description}" — pick a category to replace it.`}
                </div>
              )}
            </label>
            <label className="text-sm">
              <div className="text-surface-600 dark:text-surface-300 mb-1">Province</div>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
              >
                <optgroup label={lang === 'fr' ? 'TPS + TVQ' : 'GST + QST'}>
                  <option value="QC">QC — Québec</option>
                </optgroup>
                <optgroup label={lang === 'fr' ? 'Non taxable' : 'Non-taxable'}>
                  <option value="Non tax-QC">QC — Non taxable</option>
                </optgroup>
                <optgroup label={lang === 'fr' ? 'TVH 13%' : 'HST 13%'}>
                  <option value="ON">ON — Ontario</option>
                </optgroup>
                <optgroup label={lang === 'fr' ? 'TVH 15%' : 'HST 15%'}>
                  <option value="NB">NB — Nouveau-Brunswick</option>
                  <option value="NS">NS — Nouvelle-Écosse</option>
                  <option value="NL">NL — Terre-Neuve</option>
                  <option value="PE">PE — Î.-P.-É.</option>
                </optgroup>
                <optgroup label={lang === 'fr' ? 'TPS seulement' : 'GST only'}>
                  <option value="AB">AB — Alberta</option>
                  <option value="BC">BC — Colombie-Britannique</option>
                  <option value="MB">MB — Manitoba</option>
                  <option value="SK">SK — Saskatchewan</option>
                  <option value="NT">NT — Territoires du Nord-Ouest</option>
                  <option value="NU">NU — Nunavut</option>
                  <option value="YT">YT — Yukon</option>
                </optgroup>
              </select>
            </label>
            <label className="text-sm">
              <div className="text-surface-600 dark:text-surface-300 mb-1">{lang === 'fr' ? "Code d'imputation (GL)" : 'GL Imputation Code'}</div>
              <input
                type="text"
                value={imputation}
                onChange={(e) => setImputation(e.target.value)}
                className="w-full px-3 py-2 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              { label: lang === 'fr' ? 'Sous-total' : 'Subtotal', value: subtotal, set: setSubtotal },
              { label: 'TPS', value: tps, set: setTps },
              { label: 'TVQ', value: tvq, set: setTvq },
              { label: 'TVH', value: tvh, set: setTvh },
              { label: lang === 'fr' ? 'Pourboire' : 'Tip', value: tip, set: setTip },
            ].map((f) => (
              <label className="text-xs" key={f.label}>
                <div className="text-surface-600 dark:text-surface-300 mb-1 truncate">{f.label}</div>
                <input
                  type="number"
                  step="0.01"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm"
                />
              </label>
            ))}
            {/* Total with link/unlink toggle */}
            <div className="text-xs">
              <div className="flex items-center gap-1 text-surface-600 dark:text-surface-300 mb-1">
                <span>Total</span>
                <button
                  type="button"
                  onClick={() => setLinked(v => !v)}
                  title={linked
                    ? (lang === 'fr' ? 'Délier — saisir le total manuellement' : 'Unlink — enter total manually')
                    : (lang === 'fr' ? 'Lier — calcul automatique' : 'Link — auto-calculate')}
                  className={`ml-auto rounded p-0.5 transition-colors ${
                    linked
                      ? 'text-brand-600 dark:text-brand-400 hover:text-brand-800'
                      : 'text-surface-400 dark:text-surface-500 hover:text-surface-600'
                  }`}
                >
                  {linked ? (
                    /* chain-link icon */
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  ) : (
                    /* broken-link icon */
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244M6 18L18 6" />
                    </svg>
                  )}
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={total}
                readOnly={linked}
                onChange={(e) => { if (!linked) setTotalCapped(e.target.value); }}
                className={`w-full px-2 py-1.5 rounded border text-sm transition-colors ${
                  linked
                    ? 'border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-surface-900 dark:text-white cursor-default select-none'
                    : 'border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white'
                }`}
              />
            </div>
          </div>

          <label className="text-sm block">
            <div className="text-surface-600 dark:text-surface-300 mb-1">{lang === 'fr' ? 'Notes' : 'Notes'}</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded font-medium"
            >
              {saving ? '…' : (lang === 'fr' ? 'Enregistrer' : 'Save')}
            </button>
            <button onClick={handleClose} className="px-4 py-2 border border-surface-300 dark:border-surface-700 rounded text-surface-700 dark:text-surface-200">
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
          </div>


        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────
const RepExpensesPage: React.FC = () => {
  const { t, lang } = useLang();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
      addToast(lang === 'fr' ? 'Échec du chargement' : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openNew = () => {
    setEditing(null);
    setModalKey(k => k + 1);
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setModalKey(k => k + 1);
    setModalOpen(true);
  };

  const handleSaved = (saved: Expense) => {
    setExpenses(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  const handleDelete = async (e: Expense) => {
    const ok = await confirm({
      title: lang === 'fr' ? 'Supprimer cette dépense ?' : 'Delete this expense?',
      message: e.supplier || expenseCategoryLabel(e.description, lang as 'fr' | 'en') || (lang === 'fr' ? 'Dépense' : 'Expense'),
      confirmLabel: lang === 'fr' ? 'Supprimer' : 'Delete',
    });
    if (!ok) return;
    try {
      await deleteExpense(e.id);
      setExpenses(prev => prev.filter(x => x.id !== e.id));
      addToast(lang === 'fr' ? 'Supprimée' : 'Deleted', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data?.error || (lang === 'fr' ? 'Erreur' : 'Error'), 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {t.expensesTitle || (lang === 'fr' ? 'Mes dépenses' : 'My Expenses')}
        </h1>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded font-medium"
        >
          {t.expenseNew || (lang === 'fr' ? '+ Nouvelle dépense' : '+ New Expense')}
        </button>
      </div>

      {loading ? (
        <div className="text-surface-500">…</div>
      ) : expenses.length === 0 ? (
        <div className="text-surface-500 py-8 text-center">
          {lang === 'fr' ? 'Aucune dépense.' : 'No expenses yet.'}
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="bg-white dark:bg-surface-900 rounded-lg shadow p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-surface-900 dark:text-white truncate">
                      {e.supplier || (lang === 'fr' ? 'Sans fournisseur' : 'No supplier')}
                    </div>
                    <div className="text-xs text-surface-500">{e.date}</div>
                    {e.description && (
                      <div className="text-sm text-surface-600 dark:text-surface-300 truncate">{expenseCategoryLabel(e.description, lang as 'fr' | 'en')}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-surface-900 dark:text-white">{fmtMoney(e.totalCents)}</div>
                    <div className="mt-0.5">{statusBadge(e.status)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-100 dark:border-surface-700">
                  <span className="text-xs text-surface-500">
                    {e.receipts.length} {lang === 'fr' ? 'photo(s)' : 'photo(s)'}
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEdit(e)}
                      className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                    >
                      {lang === 'fr' ? 'Modifier' : 'Edit'}
                    </button>
                    {e.status === 'PENDING' && (
                      <button onClick={() => handleDelete(e)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                        {lang === 'fr' ? 'Supprimer' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white dark:bg-surface-900 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                <tr>
                  <th className="px-3 py-2 text-left">{lang === 'fr' ? 'Date' : 'Date'}</th>
                  <th className="px-3 py-2 text-left">{lang === 'fr' ? 'Fournisseur' : 'Supplier'}</th>
                  <th className="px-3 py-2 text-left">{lang === 'fr' ? 'Catégorie' : 'Category'}</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">{lang === 'fr' ? 'Photos' : 'Photos'}</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="text-surface-800 dark:text-surface-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/40">
                    <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                    <td className="px-3 py-2">{e.supplier || '—'}</td>
                    <td className="px-3 py-2">{e.description ? expenseCategoryLabel(e.description, lang as 'fr' | 'en') : '—'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{fmtMoney(e.totalCents)}</td>
                    <td className="px-3 py-2 text-center">{e.receipts.length}</td>
                    <td className="px-3 py-2 text-center">{statusBadge(e.status)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-brand-600 hover:text-brand-800 mr-3"
                      >
                        {lang === 'fr' ? 'Modifier' : 'Edit'}
                      </button>
                      {e.status === 'PENDING' && (
                        <button onClick={() => handleDelete(e)} className="text-red-600 hover:text-red-800">
                          {lang === 'fr' ? 'Supprimer' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modalOpen && (
        <ExpenseModal
          key={modalKey}
          expense={editing}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default RepExpensesPage;
