# AU Invoice Editor — invoice_v2

A minimal, static invoice editor based on the uploaded AU invoice template
(`invoice-template-au.pdf`, 1 page, Xero-style layout, no Xero branding).

Just one white A4 page: click any field on the invoice and type. No dashboard,
no reports, no recurring invoices, no clients, no payments, no backend, no
Supabase, no environment variables.

## What it does

- Layout matching the template: large company name, `INVOICE` heading,
  client block on the left, Invoice Date / Invoice Number / Reference-PO #
  in the middle with the company address on the far right.
- Line items table: Description | Quantity | Unit Price | Total price AUD —
  **6 rows to start** (alternating white / light-grey), Add row / Remove row.
- Totals, calculated live in AUD:
  - Subtotal AUD = sum of line totals
  - GST AUD = Subtotal × GST% — the GST percentage is editable on the
    template, default **10%**
  - TOTAL AUD = Subtotal + GST, with a thick line above it
- Due Date and Additional notes, both editable on the paper.
- Bank Details at the end, after Due Date and Additional notes, with four
  editable fields: **Bank Name, Account Name, BSB, Account No.**
- Buttons: **Save to PDF** (real A4 PDF in the same layout, named from the
  invoice number, e.g. `INV-0001.pdf`), **Print**, **Clear / New invoice**
  (asks for confirmation, then resets to 6 rows and GST 10%).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The invoice page and toolbar |
| `styles.css` | Layout, A4 paper, print rules |
| `app.js` | Editing, totals, add/remove rows, PDF (jsPDF), print, clear |

jsPDF is loaded from the cdnjs CDN in `index.html` for the PDF download.
If you are offline, Save to PDF will show an error message instead; the
rest of the editor still works.

## Open locally

Open `index.html` in a browser, or serve the folder:

```sh
cd invoice-v2
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

This is a static site — no build step is needed.

- **Vercel:** Import the repo, framework preset "Other", no build command,
  output directory `.` (the repo root). Or drag the folder into a new
  Vercel project.
- **Netlify:** Drag the folder onto Netlify Drop, or connect the repo with
  no build command and publish directory `.`.
- **GitHub Pages:** Settings → Pages → deploy from the `main` branch,
  root folder.

## Use

1. Click a field on the invoice and type — company name, client details,
   invoice date / number / PO, each line's description, quantity and unit
   price, due date, notes, and bank details.
2. Change the GST % if needed (click the number next to "GST").
3. Add rows with **+ Add row** if you need more than 6.
4. Click **Save to PDF** to download the invoice, or **Print** to print it.
