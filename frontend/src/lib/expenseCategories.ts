// Expense categories used by representants. Each category maps to a GL
// imputation code that the accounting team uses in the Compte de dépenses
// workbook (see RepresentantExcelExportService on the backend).
//
// Keep this list in sync with the Java summary section in
// `RepresentantExcelExportService.SUMMARY_CODES`.

export interface ExpenseCategory {
  /** Canonical id stored in the `description` field. */
  id: string;
  /** GL imputation code automatically applied when this category is picked. */
  code: string;
  fr: string;
  en: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'REPAS',                code: '7158',   fr: 'Repas',                                       en: 'Meals' },
  { id: 'ESSENCE',              code: '5210',   fr: 'Essence',                                     en: 'Fuel' },
  { id: 'FRAIS_DEPLACEMENT',    code: '6152',   fr: 'Frais déplacement (stationnement, taxis…)',   en: 'Travel (parking, taxi…)' },
  { id: 'HEBERGEMENT',          code: '7156',   fr: 'Hébergement',                                 en: 'Lodging' },
  { id: 'FRAIS_BUREAU',         code: '7200',   fr: 'Frais de bureau',                             en: 'Office expenses' },
  { id: 'FOURNITURE_BUREAU',    code: '7205',   fr: 'Fourniture de bureau',                        en: 'Office supplies' },
  { id: 'FRAIS_INFORMATIQUE',   code: '7380',   fr: 'Frais informatique',                          en: 'IT expenses' },
  { id: 'DEPENSES_ENTREPOT',    code: '5400',   fr: 'Dépenses d\u2019entrepôt',                    en: 'Warehouse expenses' },
  { id: 'AUTRES',               code: '555555', fr: 'Autres',                                      en: 'Other' },
];

export const expenseCategoryById = (id?: string | null): ExpenseCategory | undefined =>
  id ? EXPENSE_CATEGORIES.find(c => c.id === id) : undefined;

export const expenseCategoryLabel = (id: string | undefined | null, lang: 'fr' | 'en'): string => {
  const c = expenseCategoryById(id);
  if (!c) return id ?? '';
  return lang === 'fr' ? c.fr : c.en;
};
