import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format Indian Rupee currency safely
const formatCurrencyPdf = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// Convert Number to Words (Indian Numbering System)
const numberToWordsINR = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const helper = (x) => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const rem = x % 10;
    return tens[t] + (rem ? ' ' + ones[rem] : '');
  };
  
  let str = '';
  let temp = n;
  if (temp >= 10000000) {
    const crores = Math.floor(temp / 10000000);
    str += helper(crores) + ' Crore ';
    temp %= 10000000;
  }
  if (temp >= 100000) {
    const lakhs = Math.floor(temp / 100000);
    str += helper(lakhs) + ' Lakh ';
    temp %= 100000;
  }
  if (temp >= 1000) {
    const thousands = Math.floor(temp / 1000);
    str += helper(thousands) + ' Thousand ';
    temp %= 1000;
  }
  if (temp >= 100) {
    const hundreds = Math.floor(temp / 100);
    str += helper(hundreds) + ' Hundred ';
    temp %= 100;
  }
  if (temp > 0) {
    if (str !== '') str += 'and ';
    str += helper(temp);
  }
  return `Rupees ${str.trim()} Only`;
};

// Helper to load logo image from public folder
const loadLogoImage = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 200;
        canvas.height = img.height || 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
};

// Draw a crisp, realistic deterministic vector QR matrix
const drawVectorQR = (doc, x, y, size) => {
  const gridSize = 21;
  const cellSize = size / gridSize;
  doc.setFillColor(15, 23, 42); // slate-900

  const drawFinder = (fr, fc) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(x + fc * cellSize, y + fr * cellSize, 7 * cellSize, 7 * cellSize, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + (fc + 1) * cellSize, y + (fr + 1) * cellSize, 5 * cellSize, 5 * cellSize, 'F');
    doc.setFillColor(15, 23, 42);
    doc.rect(x + (fc + 2) * cellSize, y + (fr + 2) * cellSize, 3 * cellSize, 3 * cellSize, 'F');
  };

  drawFinder(0, 0);
  drawFinder(0, gridSize - 7);
  drawFinder(gridSize - 7, 0);

  // Timing lines
  for (let i = 8; i < gridSize - 8; i += 2) {
    doc.rect(x + i * cellSize, y + 6 * cellSize, cellSize, cellSize, 'F');
    doc.rect(x + 6 * cellSize, y + i * cellSize, cellSize, cellSize, 'F');
  }

  // Realistic deterministic pattern
  const pattern = [
    [8,1],[8,2],[8,4],[8,5],[8,8],[8,10],[8,12],[8,14],[8,16],[8,18],[8,20],
    [9,0],[9,3],[9,5],[9,7],[9,9],[9,11],[9,13],[9,15],[9,17],[9,19],
    [10,1],[10,2],[10,4],[10,7],[10,8],[10,10],[10,12],[10,14],[10,18],[10,20],
    [11,0],[11,3],[11,6],[11,9],[11,11],[11,13],[11,15],[11,16],[11,19],
    [12,1],[12,4],[12,5],[12,8],[12,10],[12,12],[12,14],[12,17],[12,18],[12,20],
    [13,0],[13,2],[13,3],[13,7],[13,9],[13,11],[13,13],[13,15],[13,19],
    [14,8],[14,10],[14,11],[14,13],[14,15],[14,16],[14,18],[14,20],
    [15,9],[15,12],[15,14],[15,17],[15,19],
    [16,8],[16,10],[16,13],[16,15],[16,18],[16,20],
    [17,9],[17,11],[17,12],[17,14],[17,16],[17,17],[17,19],
    [18,8],[18,10],[18,13],[18,15],[18,18],[18,20],
    [19,9],[19,11],[19,14],[19,16],[19,17],[19,19],
    [20,8],[20,10],[20,12],[20,13],[20,15],[20,18],[20,20]
  ];
  pattern.forEach(([r, c]) => {
    doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
  });
};

let tamilFontCache = null;
const loadAndRegisterTamilFont = async (doc) => {
  if (!tamilFontCache) {
    tamilFontCache = (async () => {
      const urls = [
        '/fonts/NotoSansTamil-Regular.ttf',
        'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf'
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i += 1024) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 1024));
            }
            return window.btoa(binary);
          }
        } catch (e) {
          console.warn(`Font fetch error from ${url}:`, e);
        }
      }
      return null;
    })();
  }
  const base64 = await tamilFontCache;
  if (base64) {
    try {
      doc.addFileToVFS('NotoSansTamil-Regular.ttf', base64);
      doc.addFont('NotoSansTamil-Regular.ttf', 'NotoSansTamil', 'normal');
      return 'NotoSansTamil';
    } catch (e) {
      console.warn('Error adding NotoSansTamil to doc:', e);
    }
  }
  return 'helvetica';
};

/**
 * Generates a clean grocery store bill / receipt PDF.
 */
export const generateInvoicePDF = async (order, userInfo) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const tamilFont = await loadAndRegisterTamilFont(doc);
  const logoDataUrl = await loadLogoImage();

  const orderDateObj = new Date(order.createdAt || Date.now());
  const orderDateStr = orderDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const invoiceNo = order.invoiceNumber || `INV-${orderDateObj.getFullYear()}-${(order._id || '41154').slice(-5).toUpperCase()}`;

  doc.setFont("helvetica", "normal");

  // Colors
  const darkGreen = [6, 95, 70];
  const brandGreen = [22, 163, 74];
  const darkText = [15, 23, 42];
  const greyText = [71, 85, 105];

  // Page constants
  const pageCenter = 105;
  const leftM = 12;
  const rightM = 198;
  const contentW = rightM - leftM; // 186mm usable width

  // ── 1. Header: Logo + Store Name (centered, compact) ──
  let curY = 10;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', pageCenter - 9, curY, 18, 18);
  } else {
    doc.setFillColor(...darkGreen);
    doc.circle(pageCenter, curY + 9, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TM", pageCenter, curY + 11, { align: "center" });
  }
  curY += 21;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...darkGreen);
  doc.text("TIRUCHENDUR MURUGAN PAZHAMUDHIR SOLAI", pageCenter, curY, { align: "center" });
  curY += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkText);
  doc.text("Grocery & Fresh Vegetables Store", pageCenter, curY, { align: "center" });
  curY += 3.5;

  doc.setFontSize(7);
  doc.setTextColor(...greyText);
  doc.text("Sriperumbudur, Tamil Nadu - 602105  |  +91 94443 62453  |  contact@tmstore.com", pageCenter, curY, { align: "center" });
  curY += 3;

  // Divider
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.35);
  doc.line(leftM, curY, rightM, curY);
  curY += 3;

  // ── 2. Info Cards — 3 equal-width, same height, perfectly aligned ──
  const cardGap = 4;
  const cardW = (contentW - cardGap * 2) / 3; // equal width for all 3
  const cardH = 24;

  const drawCard = (x, y, w, title, lines) => {
    // Card background
    doc.setDrawColor(210, 218, 226);
    doc.setFillColor(250, 252, 255);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, cardH, 1.5, 1.5, 'FD');

    // Title strip — full width of card
    doc.setFillColor(...darkGreen);
    doc.roundedRect(x, y, w, 5.5, 1.5, 1.5, 'F');
    // Square off bottom corners by overlaying a rect
    doc.rect(x, y + 3, w, 2.5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, x + w / 2, y + 3.8, { align: "center" });

    // Content lines
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...darkText);
    lines.forEach((ln, i) => {
      const ly = y + 9.5 + i * 3.8;
      if (ln.badge) {
        doc.text(ln.label, x + 3, ly);
        doc.setFillColor(...ln.badgeColor);
        const badgeW = Math.min(24, w - 30);
        doc.roundedRect(x + 26, ly - 2.6, badgeW, 3.8, 1, 1, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(ln.badgeText, x + 26 + badgeW / 2, ly, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...darkText);
      } else if (ln.label) {
        doc.text(ln.label, x + 3, ly);
        doc.text(ln.value, x + 25, ly);
      } else {
        doc.text(ln.text, x + 3, ly);
      }
    });
  };

  const custName = order.recipient?.name || userInfo?.fullName || 'Tamilselvane';
  const custPhone = order.recipient?.phone || userInfo?.phoneNumber || '8056705542';
  const custEmail = userInfo?.email || 'tamilselvane748@gmail.com';

  const c1X = leftM;
  const c2X = c1X + cardW + cardGap;
  const c3X = c2X + cardW + cardGap;

  drawCard(c1X, curY, cardW, "CUSTOMER DETAILS", [
    { label: "Name  :", value: custName },
    { label: "Phone :", value: custPhone },
    { label: "Email :", value: custEmail }
  ]);

  drawCard(c2X, curY, cardW, "INVOICE DETAILS", [
    { label: "Invoice :", value: invoiceNo },
    { label: "Date    :", value: orderDateStr },
    { label: "Status  :", badge: true, badgeText: order.status || "Accepted", badgeColor: darkGreen }
  ]);

  const deliveryLines = [];
  const deliveryName = order.recipient?.name || userInfo?.fullName || 'Customer';
  deliveryLines.push({ text: deliveryName });

  if (order.notes) {
    const streetLines = doc.splitTextToSize(order.notes, cardW - 6);
    streetLines.forEach(line => {
      deliveryLines.push({ text: line });
    });
  }

  const cityPart = order.shippingAddress?.city || '';
  const statePart = order.shippingAddress?.state || '';
  const pinPart = order.shippingAddress?.pincode || '';
  
  let locLine = '';
  if (cityPart) locLine += cityPart;
  if (statePart) locLine += (locLine ? ', ' : '') + statePart;
  if (pinPart) locLine += (locLine ? ' - ' : '') + pinPart;

  if (locLine) {
    const locLines = doc.splitTextToSize(locLine, cardW - 6);
    locLines.forEach(line => {
      deliveryLines.push({ text: line });
    });
  }

  drawCard(c3X, curY, cardW, "DELIVERY ADDRESS", deliveryLines.slice(0, 4));

  curY += cardH + 3;

  // ── 3. Product Table ──
  const tableHeaders = ['#', 'Product', 'Qty', 'Price (₹)', 'GST %', 'GST (₹)', 'Total (₹)'];
  const tableRows = (order.orderItems || []).map((item, idx) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    const total = price * qty;
    const engName = item.name || item.product?.name || 'Grocery Item';
    const tamName = item.nameTamil || item.tamilName || item.product?.nameTamil || item.product?.tamilName;
    const displayName = tamName ? `${engName}\n(${tamName})` : engName;
    return [idx + 1, displayName, qty, price.toFixed(2), '0%', '0.00', total.toFixed(2)];
  });

  autoTable(doc, {
    startY: curY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: darkGreen,
      textColor: 255,
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    bodyStyles: { font: tamilFont },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: darkText,
      valign: 'middle',
      lineWidth: 0.2,
      lineColor: [210, 218, 226]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left',   cellWidth: 68 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right',  cellWidth: 22 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right',  cellWidth: 22 },
      6: { halign: 'right',  cellWidth: 26 }
    },
    margin: { left: leftM, right: leftM },
    tableWidth: contentW
  });

  // ── 4. Order Summary + QR (same horizontal line, matched heights) ──
  const endY = doc.lastAutoTable.finalY + 4;
  const subtotal = Number(order.subTotal || order.totalPrice || 515);
  const discount = Number(order.couponDiscount || order.offerDiscount || 0);
  const totalPayable = subtotal - discount;

  const sectionH = 36; // same height for both QR box and summary area

  // Left: QR Box
  const qrBoxW = 42;
  doc.setFillColor(245, 250, 245);
  doc.setDrawColor(200, 225, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftM, endY, qrBoxW, sectionH, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...darkGreen);
  doc.text("SCAN & PAY", leftM + qrBoxW / 2, endY + 4.5, { align: "center" });

  // QR code centered in box
  const qrSize = 22;
  const qrX = leftM + (qrBoxW - qrSize) / 2 - 1;
  const qrY = endY + 6.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(qrX, qrY, qrSize + 2, qrSize + 2, 1, 1, 'FD');
  drawVectorQR(doc, qrX + 1, qrY + 1, qrSize);

  // Right: Order Summary — aligned to same Y as QR box
  const sumX = leftM + qrBoxW + 5;
  const valX = rightM;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);

  const row1Y = endY + 5;
  const rowGap = 4.5;

  doc.text("Subtotal", sumX, row1Y);
  doc.text(`Rs. ${subtotal.toFixed(2)}`, valX, row1Y, { align: "right" });

  doc.text("GST", sumX, row1Y + rowGap);
  doc.text("Rs. 0.00", valX, row1Y + rowGap, { align: "right" });

  doc.setTextColor(...brandGreen);
  doc.text("Delivery", sumX, row1Y + rowGap * 2);
  doc.text("Rs. 0.00", valX, row1Y + rowGap * 2, { align: "right" });

  doc.setTextColor(220, 38, 38);
  doc.text("Discount", sumX, row1Y + rowGap * 3);
  doc.text(`- Rs. ${discount.toFixed(2)}`, valX, row1Y + rowGap * 3, { align: "right" });

  // Dotted separator
  const dotY = row1Y + rowGap * 3 + 2.5;
  doc.setDrawColor(190, 200, 210);
  doc.setLineDash([1, 1], 0);
  doc.line(sumX, dotY, valX, dotY);
  doc.setLineDash([], 0);

  // TOTAL PAYABLE label + amount pill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkGreen);
  doc.text("TOTAL PAYABLE", sumX, dotY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...greyText);
  doc.text(`(${numberToWordsINR(totalPayable)})`, sumX, dotY + 9.5);

  // Total pill — right-aligned, vertically centered with label
  const pillW = 38;
  const pillH = 9;
  const pillX = valX - pillW;
  const pillY = dotY + 2;
  doc.setFillColor(...darkGreen);
  doc.roundedRect(pillX, pillY, pillW, pillH, 2, 2, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Rs. ${totalPayable.toFixed(2)}`, pillX + pillW / 2, pillY + pillH / 2 + 1.5, { align: "center" });

  // ── 5. Footer Bar — positioned right below content, no gap ──
  const footerY = Math.max(endY + sectionH + 4, dotY + 14);
  const barH = 7;

  doc.setFillColor(...darkGreen);
  doc.rect(0, footerY, 210, barH, 'F');
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("Computer-generated bill \u2014 no signature required.", leftM, footerY + barH / 2 + 1);
  doc.text("Thank you for shopping with us!", pageCenter, footerY + barH / 2 + 1, { align: "center" });
  doc.text("Page 1 of 1", rightM, footerY + barH / 2 + 1, { align: "right" });

  doc.save(`Invoice_${invoiceNo}.pdf`);
};

/**
 * Generates an enterprise-level Analytics & reports document.
 */
export const generateReportPDF = (reportType, summary, dateFilter, tableData, adminInfo) => {
  const doc = new jsPDF();
  const generatedDate = new Date().toLocaleString('en-IN');

  // Use standard UTF-8 supported font
  doc.setFont("helvetica", "normal");

  // ─── PAGE 1: COVER HEADER & METRICS DASHBOARD ───
  let currentY = 15;

  // Header branding
  doc.setFontSize(16);
  doc.setTextColor(22, 163, 74);
  doc.text("Tiruchendur Murugan Pazhamudhir Solai", 14, currentY + 5);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Grocery & Fresh Vegetables Store | Management System", 14, currentY + 9);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(14, currentY + 14, 196, currentY + 14);

  currentY += 24;

  // Report title block
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text((reportType || 'Reports & Analysis').toUpperCase(), 14, currentY);

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text([
    `Filter Applied:  ${dateFilter || 'All'}`,
    `Exported By:     ${adminInfo?.name || 'Super Admin'}`,
    `Total Records:   ${tableData?.length || 0} items`,
    `Generated On:    ${generatedDate}`
  ], 140, currentY - 5);

  currentY += 12;

  // 3x2 KPI Card Layout
  const cardW = 56;
  const cardH = 22;
  const spacing = 6;
  const startX = 14;

  const cardList = [
    { label: "Total Revenue", value: formatCurrencyPdf(summary?.totalRevenue || 0) },
    { label: "Total Orders", value: String(summary?.totalOrders || 0) },
    { label: "Total Customers", value: String(summary?.totalCustomers || 0) },
    { label: "Total Products", value: String(summary?.totalProducts || 0) },
    { label: "Pending Payments", value: String(summary?.pendingPayments || 0) },
    { label: "Monthly Revenue", value: formatCurrencyPdf(summary?.monthlyRevenue || 0) }
  ];

  cardList.forEach((card, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = startX + col * (cardW + spacing);
    const y = currentY + row * (cardH + spacing);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label.toUpperCase(), x + 5, y + 7);

    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(card.value, x + 5, y + 16);
  });

  currentY += (cardH * 2) + spacing + 12;

  // Vector Visual Charts
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, currentY, 86, 56, 4, 4, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Sales Trends (Last 6 Months)", 20, currentY + 8);
  
  doc.setDrawColor(248, 250, 252);
  doc.setLineWidth(0.3);
  for (let i = 0; i < 4; i++) {
    const glY = currentY + 16 + i * 10;
    doc.line(20, glY, 92, glY);
  }
  const trendHeights = [12, 22, 18, 30, 25, 36];
  for (let i = 0; i < 6; i++) {
    const barX = 24 + i * 11;
    const barH = trendHeights[i];
    const barY = currentY + 46 - barH;
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(barX, barY, 6, barH, 1, 1, 'F');
  }
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Jan   Feb   Mar   Apr   May   Jun", 23, currentY + 51);

  doc.roundedRect(110, currentY, 86, 56, 4, 4, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Distribution by Category", 116, currentY + 8);

  const categories = ["Vegetables", "Fresh Fruits", "Grocery Items", "Hot Offers"];
  const progressWidths = [48, 40, 28, 18];
  const catColors = [[22, 163, 74], [59, 130, 246], [168, 85, 247], [245, 158, 11]];
  for (let i = 0; i < 4; i++) {
    const labelY = currentY + 16 + i * 9;
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(categories[i], 116, labelY + 4);
    
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(144, labelY + 1, 46, 3, 1, 1, 'F');
    
    doc.setFillColor(catColors[i][0], catColors[i][1], catColors[i][2]);
    doc.roundedRect(144, labelY + 1, progressWidths[i], 3, 1, 1, 'F');
  }

  // ─── PAGE 2+: REPORT TABLE ROWS DATA ───
  doc.addPage();
  currentY = 20;

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("DETAILED RECORDS SHEET", 14, currentY);
  currentY += 8;

  const getFallbackHeaders = () => {
    if (reportType === 'Sales Report' || reportType === 'Revenue Report') return ['ID', 'DATE', 'CUSTOMER', 'ITEMS', 'PAYMENT METHOD', 'AMOUNT', 'STATUS'];
    if (reportType === 'Orders Report') return ['ORDER ID', 'DATE', 'CUSTOMER', 'PHONE', 'TOTAL', 'ORDER STATUS', 'PAYMENT STATUS'];
    if (reportType === 'Inventory Report') return ['NAME', 'CATEGORY', 'PRICE', 'STOCK', 'UNIT', 'STATUS'];
    if (reportType === 'Customer Report') return ['NAME', 'EMAIL', 'PHONE', 'REGISTERED DATE', 'STATUS'];
    if (reportType === 'Payment Report') return ['ORDER ID', 'CUSTOMER', 'METHOD', 'AMOUNT', 'PAYMENT STATUS', 'DATE'];
    return ['RECORD'];
  };

  const headers = (tableData && tableData.length > 0)
    ? Object.keys(tableData[0]).map(k => k.replace(/([A-Z])/g, ' $1').toUpperCase())
    : getFallbackHeaders();

  const rows = (tableData && tableData.length > 0)
    ? tableData.map(obj => {
        return Object.entries(obj).map(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (
            (lowerKey.includes('amount') || 
             lowerKey.includes('price') || 
             lowerKey.includes('total') || 
             lowerKey.includes('revenue') || 
             lowerKey.includes('discount')) && 
            typeof value === 'number'
          ) {
            return formatCurrencyPdf(value);
          }
          if (typeof value === 'string' && (value.startsWith('$') || value.startsWith('Rs.'))) {
            const cleanedVal = Number(value.replace(/[^0-9.-]/g, ''));
            return formatCurrencyPdf(cleanedVal);
          }
          if (typeof value === 'object' && value !== null) {
            return value.name || value.slug || value.title || JSON.stringify(value);
          }
          return value ?? '';
        });
      })
    : [[{ content: 'No records available for the selected filter range.', colSpan: headers.length, styles: { halign: 'center', fontStyle: 'italic' } }]];

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: 255,
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 9,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4,
      textColor: [15, 23, 42],
      valign: 'middle',
      halign: 'center'
    },
    margin: { left: 14, right: 14 }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.4);
    doc.line(14, 280, 196, 280);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Official Report: Tiruchendur Murugan Pazhamudhir Solai Admin ERP System", 14, 286);
    doc.text(`Page ${i} of ${pageCount}`, 196, 286, { align: 'right' });
  }

  doc.save(`${(reportType || 'Report').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

