/* AU Invoice Editor — plain static app, no backend.
 * Totals: Subtotal = sum(line totals)
 *          GST      = Subtotal x GST%
 *          Total    = Subtotal + GST
 */
(function () {
  'use strict';

  var START_ROWS = 6;
  var DEFAULT_GST = 10;
  var itemsBody = document.getElementById('itemsBody');
  var subtotalEl = document.getElementById('subtotalValue');
  var gstEl = document.getElementById('gstValue');
  var totalEl = document.getElementById('totalValue');
  var gstRateEl = document.getElementById('gstRate');
  var toastEl = document.getElementById('toast');

  var CLIENT_DEFAULTS = [
    "Client's Company Name",
    "Attention: Client's Name",
    'Street Number & Name or PO Box',
    'State & Post Code',
    'Country',
  ];
  var ADDRESS_DEFAULTS = [
    'Your Company Name',
    'Street Number and Name',
    'State & Post Code',
    'Country',
  ];

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3000);
  }

  function money(n) {
    return '$ ' + Number(n || 0).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function num(value, fallback) {
    var n = parseFloat(value);
    return isFinite(n) ? n : (fallback || 0);
  }

  function textOf(el) {
    return (el ? el.textContent : '').trim();
  }

  /* ---------- Line items ---------- */

  function addRow(desc, qty, price) {
    var tr = document.createElement('tr');

    var descTd = document.createElement('td');
    var descSpan = document.createElement('span');
    descSpan.className = 'editable';
    descSpan.contentEditable = 'true';
    descSpan.spellcheck = false;
    descSpan.setAttribute('data-placeholder', '');
    descSpan.textContent = desc || '';
    descTd.appendChild(descSpan);
    tr.appendChild(descTd);

    var qtyTd = document.createElement('td');
    qtyTd.className = 'col-qty';
    var qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '0';
    qtyInput.step = '1';
    qtyInput.value = qty == null ? '' : String(qty);
    qtyInput.setAttribute('aria-label', 'Quantity');
    qtyTd.appendChild(qtyInput);
    tr.appendChild(qtyTd);

    var priceTd = document.createElement('td');
    priceTd.className = 'col-price';
    var priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.value = price == null ? '' : String(price);
    priceInput.setAttribute('aria-label', 'Unit Price');
    priceTd.appendChild(priceInput);
    tr.appendChild(priceTd);

    var totalTd = document.createElement('td');
    totalTd.className = 'col-total row-total';
    totalTd.textContent = '$ 0.00';
    tr.appendChild(totalTd);

    var removeTd = document.createElement('td');
    removeTd.className = 'col-remove';
    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-row';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove row';
    removeBtn.setAttribute('aria-label', 'Remove row');
    removeBtn.addEventListener('click', function () {
      tr.remove();
      recalc();
    });
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);

    qtyInput.addEventListener('input', recalc);
    priceInput.addEventListener('input', recalc);
    priceInput.addEventListener('blur', function () {
      if (priceInput.value !== '') priceInput.value = num(priceInput.value).toFixed(2);
    });

    itemsBody.appendChild(tr);
    return tr;
  }

  function getRows() {
    var rows = [];
    var trs = itemsBody.querySelectorAll('tr');
    trs.forEach(function (tr) {
      var desc = tr.querySelector('td .editable');
      var inputs = tr.querySelectorAll('input[type="number"]');
      var totalElRow = tr.querySelector('.row-total');
      rows.push({
        el: tr,
        description: desc ? textOf(desc) : '',
        qty: inputs[0] ? num(inputs[0].value) : 0,
        price: inputs[1] ? num(inputs[1].value) : 0,
        totalEl: totalElRow,
      });
    });
    return rows;
  }

  function recalc() {
    var subtotal = 0;
    getRows().forEach(function (r) {
      var lineTotal = r.qty * r.price;
      subtotal += lineTotal;
      if (r.totalEl) r.totalEl.textContent = money(lineTotal);
    });
    var gstRate = num(gstRateEl.value, DEFAULT_GST);
    var gst = subtotal * (gstRate / 100);
    var total = subtotal + gst;
    subtotalEl.textContent = money(subtotal);
    gstEl.textContent = money(gst);
    totalEl.textContent = money(total);
    return { subtotal: subtotal, gst: gst, total: total, gstRate: gstRate };
  }

  /* ---------- Reset ---------- */

  function resetInvoice() {
    document.querySelector('.company-name').textContent = 'Your Company Name';
    document.querySelectorAll('.client-block .editable').forEach(function (el, i) {
      el.textContent = CLIENT_DEFAULTS[i] || '';
    });
    document.querySelectorAll('.meta-value').forEach(function (el) { el.textContent = ''; });
    document.querySelectorAll('.company-address .editable').forEach(function (el, i) {
      el.textContent = ADDRESS_DEFAULTS[i] || '';
    });
    itemsBody.innerHTML = '';
    for (var i = 0; i < START_ROWS; i++) addRow('', '', '');
    gstRateEl.value = String(DEFAULT_GST);
    var due = document.querySelector('.due-date .editable');
    if (due) due.textContent = '';
    var notes = document.querySelector('.notes');
    if (notes) notes.textContent = '';
    document.querySelectorAll('.bank-value').forEach(function (el) { el.textContent = ''; });
    recalc();
    toast('New invoice started');
  }

  /* ---------- PDF ---------- */

  function getMetaValues() {
    var vals = document.querySelectorAll('.meta-value');
    return {
      date: vals[0] ? textOf(vals[0]) : '',
      number: vals[1] ? textOf(vals[1]) : '',
      reference: vals[2] ? textOf(vals[2]) : '',
    };
  }

  function savePdf() {
    var jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) {
      toast('PDF library failed to load — check your internet connection and try again.');
      return;
    }
    try {
      var doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      var pageW = 210, pageH = 297, margin = 15, right = pageW - margin;
      var y = 18;

      function ensureSpace(needed) {
        if (y + needed > pageH - 15) { doc.addPage(); y = 18; }
      }

      var company = textOf(document.querySelector('.company-name')) || 'Your Company Name';
      var meta = getMetaValues();
      var totals = recalc();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(22);
      doc.text(company, margin, y); y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('INVOICE', margin, y); y += 12;

      // Header blocks: client | meta | company address
      var clientLines = [];
      document.querySelectorAll('.client-block .editable').forEach(function (el) { clientLines.push(textOf(el)); });
      var addressLines = [];
      document.querySelectorAll('.company-address .editable').forEach(function (el) { addressLines.push(textOf(el)); });
      var startY = y;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      clientLines.forEach(function (line) { doc.text(line, margin, y); y += 5; });
      var metaY = startY;
      doc.setFont('helvetica', 'bold');
      var metaRows = [
        ['Invoice Date', meta.date],
        ['Invoice Number', meta.number],
        ['Reference/PO #', meta.reference],
      ];
      metaRows.forEach(function (row) {
        doc.text(row[0], 85, metaY);
        doc.setFont('helvetica', 'normal');
        doc.text(row[1], 125, metaY);
        doc.setFont('helvetica', 'bold');
        metaY += 5;
      });
      var addrY = startY;
      doc.setFont('helvetica', 'normal');
      addressLines.forEach(function (line) { doc.text(line, 155, addrY); addrY += 5; });
      y = Math.max(y, metaY, addrY) + 10;

      // Table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Description', margin, y);
      doc.text('Quantity', 115, y, { align: 'right' });
      doc.text('Unit Price', 150, y, { align: 'right' });
      doc.text('Total price AUD', right, y, { align: 'right' });
      y += 3;
      doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, right, y); y += 6;

      // Table rows
      doc.setFont('helvetica', 'normal');
      var rows = getRows();
      rows.forEach(function (r, i) {
        ensureSpace(10);
        if (i % 2 === 1) {
          doc.setFillColor(239, 239, 239);
          doc.rect(margin, y - 4, right - margin, 8, 'F');
        }
        var desc = r.description || '';
        if (desc.length > 70) desc = desc.slice(0, 67) + '...';
        doc.text(desc, margin, y);
        if (r.qty) doc.text(String(r.qty), 115, y, { align: 'right' });
        if (r.price) doc.text(money(r.price), 150, y, { align: 'right' });
        doc.text(money(r.qty * r.price), right, y, { align: 'right' });
        y += 8;
      });
      y += 4;

      // Totals
      var totalsX = 120;
      doc.text('Subtotal AUD', totalsX, y);
      doc.text(money(totals.subtotal), right, y, { align: 'right' }); y += 6;
      doc.text('GST (' + totals.gstRate + '%) AUD', totalsX, y);
      doc.text(money(totals.gst), right, y, { align: 'right' }); y += 4;
      doc.setLineWidth(0.8); doc.line(totalsX, y, right, y); y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL AUD', totalsX, y);
      doc.text(money(totals.total), right, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 14;

      // Due date / notes
      ensureSpace(20);
      var due = document.querySelector('.due-date .editable');
      doc.setFont('helvetica', 'bold');
      doc.text('Due Date:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(due ? textOf(due) : '', margin + 25, y);
      y += 10;
      doc.text('Additional notes', margin, y); y += 6;
      var notesEl = document.querySelector('.notes');
      var notes = notesEl ? textOf(notesEl) : '';
      if (notes) {
        var wrapped = doc.splitTextToSize(notes, right - margin);
        wrapped.forEach(function (line) { ensureSpace(6); doc.text(line, margin, y); y += 5; });
      }
      y += 8;

      // Bank details
      ensureSpace(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Bank Details', margin, y); y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      var bankLabels = ['Bank Name', 'Account Name', 'BSB', 'Account No.'];
      var bankValues = [];
      document.querySelectorAll('.bank-value').forEach(function (el) { bankValues.push(textOf(el)); });
      bankValues.forEach(function (val, i) {
        ensureSpace(6);
        doc.setFont('helvetica', 'bold');
        doc.text(bankLabels[i], margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(val, margin + 35, y);
        y += 6;
      });

      var filename = (meta.number ? meta.number.replace(/[^A-Za-z0-9-_]+/g, '-') : 'invoice') + '.pdf';
      doc.save(filename);
      toast('PDF downloaded: ' + filename);
    } catch (err) {
      toast('Could not create the PDF: ' + (err && err.message ? err.message : 'unknown error'));
    }
  }

  /* ---------- Wire up ---------- */

  for (var i = 0; i < START_ROWS; i++) addRow('', '', '');

  gstRateEl.addEventListener('input', recalc);

  // Keep the company address in sync with the big company name
  // until the user edits the address block itself.
  var companyNameEl = document.querySelector('.company-name');
  var addressFirstEl = document.querySelector('.company-address .editable');
  if (companyNameEl && addressFirstEl) {
    companyNameEl.addEventListener('input', function () {
      if (addressFirstEl.textContent.trim() === 'Your Company Name' || addressFirstEl.textContent.trim() === '') {
        addressFirstEl.textContent = companyNameEl.textContent;
      }
    });
  }

  document.getElementById('addRowBtn').addEventListener('click', function () {
    addRow('', '', '');
    recalc();
  });
  document.getElementById('savePdfBtn').addEventListener('click', savePdf);
  document.getElementById('printBtn').addEventListener('click', function () { window.print(); });
  document.getElementById('clearBtn').addEventListener('click', function () {
    if (window.confirm('Start a new invoice? This clears all fields on this invoice.')) {
      resetInvoice();
    }
  });

  recalc();
})();
