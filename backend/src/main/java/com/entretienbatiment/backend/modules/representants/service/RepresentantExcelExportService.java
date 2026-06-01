package com.entretienbatiment.backend.modules.representants.service;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.expenses.model.Expense;
import com.entretienbatiment.backend.modules.reptrips.model.RepTrip;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds a "Compte de dépenses" Excel workbook for a representant over a
 * date range, mirroring the layout in the provided template:
 * - Header rows: NOM, DATE
 * - KILOMÉTRAGE section: one row per trip
 * - DÉPENSES section: one row per expense
 * - Totals row
 *
 * Money fields are written in dollars (cents / 100.0) so Excel formulas work
 * natively. The header logo and colour styling from the source template are
 * intentionally NOT replicated (no asset bundled) — clients can drop the logo
 * into the produced file once.
 */
@Service
public class RepresentantExcelExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /** GL imputation code attached to all kilométrage reimbursements. */
    private static final String KILOMETRAGE_GL_CODE = "6152";

    /**
     * Maps the canonical category id (stored in `Expense.description` by the
     * frontend dropdown) to the human-readable French label that the Excel
     * "LISTE DE CHOIX / NATURE" column expects, and to the GL imputation code
     * the accounting team uses when categorising costs.
     *
     * Keep this in sync with `frontend/src/lib/expenseCategories.ts`.
     */
    private static final java.util.Map<String, String[]> CATEGORY_BY_ID = java.util.Map.ofEntries(
        java.util.Map.entry("REPAS",              new String[] {"Repas",                                       "7158"}),
        java.util.Map.entry("ESSENCE",            new String[] {"Essence",                                     "5210"}),
        java.util.Map.entry("FRAIS_DEPLACEMENT",  new String[] {"Frais déplacement (stationnement, taxis…)",   "6152"}),
        java.util.Map.entry("HEBERGEMENT",        new String[] {"Hébergement",                                 "7156"}),
        java.util.Map.entry("FRAIS_BUREAU",       new String[] {"Frais de bureau",                             "7200"}),
        java.util.Map.entry("FOURNITURE_BUREAU",  new String[] {"Fourniture de bureau",                        "7205"}),
        java.util.Map.entry("FRAIS_INFORMATIQUE", new String[] {"Frais informatique",                          "7380"}),
        java.util.Map.entry("DEPENSES_ENTREPOT",  new String[] {"Dépenses d’entrepôt",                         "5400"}),
        java.util.Map.entry("CELLULAIRE",         new String[] {"Cellulaire",                                  "7330"}),
        java.util.Map.entry("AUTRES",             new String[] {"Autres",                                      "555555"})
    );

    /** Order of rows in the "Sommaire des coûts (hors taxes)" block. */
    private static final String[] SUMMARY_CODES = {
        "5210", "7150", "7156", "7158", "7200", "7205", "7380",
        "6152", "5400", "555555", "7330"
    };

    private static String categoryLabel(String description) {
        if (description == null) return "";
        String[] cat = CATEGORY_BY_ID.get(description);
        return cat == null ? description : cat[0];
    }

    private static String resolveImputation(String description, String fallback) {
        if (description != null) {
            String[] cat = CATEGORY_BY_ID.get(description);
            if (cat != null) return cat[1];
        }
        return fallback == null ? "" : fallback;
    }

    public byte[] build(AppUser user, List<RepTrip> trips, List<Expense> expenses,
                        LocalDate startDate, LocalDate endDate) {
        return build(user, trips, expenses, startDate, endDate, false);
    }

    public byte[] build(AppUser user, List<RepTrip> trips, List<Expense> expenses,
                        LocalDate startDate, LocalDate endDate, boolean includePhoneAllowance) {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet("Compte de dépenses");

            CellStyle title  = boldStyle(wb, 14);
            CellStyle header = headerStyle(wb);
            CellStyle money  = moneyStyle(wb);

            int row = 0;

            // ── Title block ─────────────────────────────────────────────────
            Row r = sheet.createRow(row++);
            r.createCell(0).setCellValue("COMPTE DE DÉPENSES");
            r.getCell(0).setCellStyle(title);
            sheet.addMergedRegion(new CellRangeAddress(r.getRowNum(), r.getRowNum(), 0, 5));

            r = sheet.createRow(row++);
            r.createCell(0).setCellValue("NOM:");
            r.createCell(1).setCellValue(user.getEmail());

            r = sheet.createRow(row++);
            r.createCell(0).setCellValue("DATE:");
            r.createCell(1).setCellValue(startDate + " au " + endDate);

            row++; // blank

            // ── KILOMÉTRAGE section ─────────────────────────────────────────
            r = sheet.createRow(row++);
            r.createCell(0).setCellValue("KILOMÉTRAGE");
            r.getCell(0).setCellStyle(boldStyle(wb, 12));

            String[] kmHeaders = {"NO", "DATE", "#CLIENT", "NOTE / NATURE",
                    "Odomètre DÉBUT", "Odomètre FIN", "KM PARCOURU",
                    "PROVINCE", "CODE D'IMPUTATION (GL)",
                    "SOUS-TOTAL", "TPS", "TVQ", "TVH", "POURBOIRE", "TOTAL TAXES INCLUSES"};
            Row hr = sheet.createRow(row++);
            for (int i = 0; i < kmHeaders.length; i++) {
                Cell c = hr.createCell(i);
                c.setCellValue(kmHeaders[i]);
                c.setCellStyle(header);
            }

            double totalKm = 0;
            long totalReimb = 0;
            int idx = 1;
            for (RepTrip t : trips) {
                Row tr = sheet.createRow(row++);
                tr.createCell(0).setCellValue(idx++);
                tr.createCell(1).setCellValue(t.getDate() == null ? "" : t.getDate().format(DATE_FMT));
                tr.createCell(2).setCellValue(orEmpty(t.getPurpose()));
                tr.createCell(3).setCellValue(orEmpty(t.getNotes()));
                // odometers not tracked in RepTrip model — left blank
                tr.createCell(4).setCellValue("");
                tr.createCell(5).setCellValue("");
                tr.createCell(6).setCellValue(t.getTotalKm() == null ? 0 : t.getTotalKm());
                tr.createCell(7).setCellValue("QC"); // default
                tr.createCell(8).setCellValue(KILOMETRAGE_GL_CODE);
                Cell sub = tr.createCell(9);
                sub.setCellValue(t.getReimbursementCents() == null ? 0 : t.getReimbursementCents() / 100.0);
                sub.setCellStyle(money);
                tr.createCell(10).setCellStyle(money); // TPS
                tr.createCell(11).setCellStyle(money); // TVQ
                tr.createCell(12).setCellStyle(money); // TVH
                tr.createCell(13).setCellStyle(money); // POURBOIRE
                Cell tot = tr.createCell(14);
                tot.setCellValue(t.getReimbursementCents() == null ? 0 : t.getReimbursementCents() / 100.0);
                tot.setCellStyle(money);

                if (t.getTotalKm() != null) totalKm += t.getTotalKm();
                if (t.getReimbursementCents() != null) totalReimb += t.getReimbursementCents();
            }

            // KM totals row
            Row kmTotal = sheet.createRow(row++);
            kmTotal.createCell(5).setCellValue("Total KM:");
            kmTotal.createCell(6).setCellValue(totalKm);
            kmTotal.createCell(13).setCellValue("Total:");
            Cell kmTotCell = kmTotal.createCell(14);
            kmTotCell.setCellValue(totalReimb / 100.0);
            kmTotCell.setCellStyle(money);

            row += 2;

            // ── DÉPENSES section ────────────────────────────────────────────
            r = sheet.createRow(row++);
            r.createCell(0).setCellValue("DÉPENSES");
            r.getCell(0).setCellStyle(boldStyle(wb, 12));

            String[] expHeaders = {"NO", "DATE", "NOM DU FOURNISSEUR", "LISTE DE CHOIX / NATURE",
                    "", "", "", "PROVINCE", "CODE D'IMPUTATION (GL)",
                    "SOUS-TOTAL", "TPS", "TVQ", "TVH", "POURBOIRE", "TOTAL TAXES INCLUSES"};
            Row ehr = sheet.createRow(row++);
            for (int i = 0; i < expHeaders.length; i++) {
                Cell c = ehr.createCell(i);
                c.setCellValue(expHeaders[i]);
                c.setCellStyle(header);
            }

            long totSub = 0, totTps = 0, totTvq = 0, totTvh = 0, totTip = 0, totAll = 0;
            // Subtotal-only ("hors taxes") accumulator per GL code, used for
            // the Sommaire block on the right-hand side of the sheet.
            java.util.Map<String, Long> summaryByCode = new java.util.HashMap<>();
            // Kilométrage subtotals always count toward GL 6152.
            summaryByCode.merge(KILOMETRAGE_GL_CODE, totalReimb, Long::sum);
            int eidx = 1;
            for (Expense e : expenses) {
                Row er = sheet.createRow(row++);
                String code = resolveImputation(e.getDescription(), e.getImputationCode());
                er.createCell(0).setCellValue(eidx++);
                er.createCell(1).setCellValue(e.getDate() == null ? "" : e.getDate().format(DATE_FMT));
                er.createCell(2).setCellValue(orEmpty(e.getSupplier()));
                er.createCell(3).setCellValue(categoryLabel(e.getDescription()));
                er.createCell(7).setCellValue(orEmpty(e.getProvince()));
                er.createCell(8).setCellValue(code);
                writeMoney(er, 9,  e.getSubtotalCents(), money);
                writeMoney(er, 10, e.getTpsCents(),      money);
                writeMoney(er, 11, e.getTvqCents(),      money);
                writeMoney(er, 12, e.getTvhCents(),      money);
                writeMoney(er, 13, e.getTipCents(),      money);
                writeMoney(er, 14, e.getTotalCents(),    money);

                totSub += nz(e.getSubtotalCents());
                totTps += nz(e.getTpsCents());
                totTvq += nz(e.getTvqCents());
                totTvh += nz(e.getTvhCents());
                totTip += nz(e.getTipCents());
                totAll += nz(e.getTotalCents());

                if (code != null && !code.isEmpty()) {
                    summaryByCode.merge(code, nz(e.getSubtotalCents()), Long::sum);
                }
            }

            // ── Phone allowance: $70.00 per calendar month ───────────────────────────
            // Included only when the admin explicitly opts in via the export
            // checkbox (different reps get paid the allowance on different
            // schedules, so we no longer auto-detect it from the date range).
            // When opted in, one row is added per calendar month overlapping
            // the selected period.
            final long PHONE_CENTS = 7_000L; // $70.00
            List<LocalDate> phoneMonths = new ArrayList<>();
            if (includePhoneAllowance) {
                LocalDate cur = startDate.withDayOfMonth(1);
                while (!cur.isAfter(endDate)) {
                    phoneMonths.add(cur);
                    cur = cur.plusMonths(1);
                }
            }
            for (LocalDate monthStart : phoneMonths) {
                Row pr = sheet.createRow(row++);
                pr.createCell(0).setCellValue(eidx++);
                pr.createCell(1).setCellValue(monthStart.format(DateTimeFormatter.ofPattern("yyyy-MM")));
                pr.createCell(2).setCellValue("Forfait t\u00e9l\u00e9phonique");
                pr.createCell(3).setCellValue("Cellulaire");
                pr.createCell(7).setCellValue("");
                pr.createCell(8).setCellValue("7330");
                writeMoney(pr,  9, PHONE_CENTS, money); // sous-total
                writeMoney(pr, 14, PHONE_CENTS, money); // total (no taxes)
                totSub += PHONE_CENTS;
                totAll += PHONE_CENTS;
                summaryByCode.merge("7330", PHONE_CENTS, Long::sum);
            }

            // Expense totals row
            Row et = sheet.createRow(row++);
            et.createCell(8).setCellValue("Totaux:");
            writeMoney(et, 9,  totSub, money);
            writeMoney(et, 10, totTps, money);
            writeMoney(et, 11, totTvq, money);
            writeMoney(et, 12, totTvh, money);
            writeMoney(et, 13, totTip, money);
            writeMoney(et, 14, totAll, money);

            // Grand total
            row++;
            Row gt = sheet.createRow(row);
            gt.createCell(13).setCellValue("GRAND TOTAL:");
            gt.getCell(13).setCellStyle(boldStyle(wb, 11));
            Cell grand = gt.createCell(14);
            grand.setCellValue((totalReimb + totAll) / 100.0);
            grand.setCellStyle(money);

            // ── Sommaire des coûts (hors taxes) ─────────────────────────────
            // Block placed on the right-hand side (cols Q/R) so it stays
            // aligned with the title regardless of how many trip / expense
            // rows precede it.
            final int summaryColCode  = 16; // Q
            final int summaryColValue = 17; // R
            int summaryRow = 4;             // sits below the NOM / DATE block

            Row sumTitle = sheet.getRow(summaryRow);
            if (sumTitle == null) sumTitle = sheet.createRow(summaryRow);
            Cell sumTitleCell = sumTitle.createCell(summaryColCode);
            sumTitleCell.setCellValue("Sommaire des coûts (hors taxes)");
            sumTitleCell.setCellStyle(boldStyle(wb, 11));
            sheet.addMergedRegion(new CellRangeAddress(summaryRow, summaryRow,
                    summaryColCode, summaryColValue));
            summaryRow++;

            for (String code : SUMMARY_CODES) {
                Row sr = sheet.getRow(summaryRow);
                if (sr == null) sr = sheet.createRow(summaryRow);
                Cell codeCell = sr.createCell(summaryColCode);
                codeCell.setCellValue(code);
                codeCell.setCellStyle(header);
                long cents = summaryByCode.getOrDefault(code, 0L);
                Cell amountCell = sr.createCell(summaryColValue);
                if (cents == 0L) {
                    amountCell.setCellValue("-");
                } else {
                    amountCell.setCellValue(cents / 100.0);
                    amountCell.setCellStyle(money);
                }
                summaryRow++;
            }

            // Auto-size columns
            for (int i = 0; i < 18; i++) sheet.autoSizeColumn(i);

            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build Excel report", e);
        }
    }

    private static long nz(Long v) { return v == null ? 0L : v; }
    private static String orEmpty(String s) { return s == null ? "" : s; }

    private static void writeMoney(Row r, int col, Long cents, CellStyle style) {
        Cell c = r.createCell(col);
        c.setCellStyle(style);
        if (cents != null) c.setCellValue(cents / 100.0);
    }

    private static CellStyle boldStyle(Workbook wb, int size) {
        CellStyle s = wb.createCellStyle();
        Font f = wb.createFont();
        f.setBold(true);
        f.setFontHeightInPoints((short) size);
        s.setFont(f);
        return s;
    }

    private static CellStyle headerStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        Font f = wb.createFont();
        f.setBold(true);
        s.setFont(f);
        s.setBorderBottom(BorderStyle.THIN);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setWrapText(true);
        s.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return s;
    }

    private static CellStyle moneyStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        DataFormat fmt = wb.createDataFormat();
        s.setDataFormat(fmt.getFormat("#,##0.00"));
        return s;
    }
}
