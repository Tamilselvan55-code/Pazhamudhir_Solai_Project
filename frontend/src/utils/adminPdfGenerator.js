import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayAddressLines } from './addressFormatter';

const formatCurrencyPdf = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

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
    str += helper(Math.floor(temp / 10000000)) + ' Crore ';
    temp %= 10000000;
  }
  if (temp >= 100000) {
    str += helper(Math.floor(temp / 100000)) + ' Lakh ';
    temp %= 100000;
  }
  if (temp >= 1000) {
    str += helper(Math.floor(temp / 1000)) + ' Thousand ';
    temp %= 1000;
  }
  if (temp >= 100) {
    str += helper(Math.floor(temp / 100)) + ' Hundred ';
    temp %= 100;
  }
  if (temp > 0) {
    if (str !== '') str += 'and ';
    str += helper(temp);
  }
  return `Rupees ${str.trim()} Only`;
};

const loadLogoImage = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return resolve(null);
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
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
};

const loadProductImage = (url) => {
  if (!url || typeof window === 'undefined') return Promise.resolve(null);
  if (url.startsWith('/')) url = window.location.origin + url;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > h) { h = Math.round((h * 128) / w); w = 128; } 
        else { w = Math.round((w * 128) / h); h = 128; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const drawVectorQR = (doc, x, y, size) => {
  const gridSize = 21;
  const cellSize = size / gridSize;
  doc.setFillColor(15, 23, 42);
  const drawFinder = (fr, fc) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(x + fc * cellSize, y + fr * cellSize, 7 * cellSize, 7 * cellSize, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + (fc + 1) * cellSize, y + (fr + 1) * cellSize, 5 * cellSize, 5 * cellSize, 'F');
    doc.setFillColor(15, 23, 42);
    doc.rect(x + (fc + 2) * cellSize, y + (fr + 2) * cellSize, 3 * cellSize, 3 * cellSize, 'F');
  };
  drawFinder(0, 0); drawFinder(0, gridSize - 7); drawFinder(gridSize - 7, 0);
  for (let i = 8; i < gridSize - 8; i += 2) {
    doc.rect(x + i * cellSize, y + 6 * cellSize, cellSize, cellSize, 'F');
    doc.rect(x + 6 * cellSize, y + i * cellSize, cellSize, cellSize, 'F');
  }
  const pattern = [[8,1],[8,2],[8,4],[8,5],[8,8],[8,10],[8,12],[8,14],[8,16],[8,18],[8,20],[9,0],[9,3],[9,5],[9,7],[9,9],[9,11],[9,13],[9,15],[9,17],[9,19],[10,1],[10,2],[10,4],[10,7],[10,8],[10,10],[10,12],[10,14],[10,18],[10,20],[11,0],[11,3],[11,6],[11,9],[11,11],[11,13],[11,15],[11,16],[11,19],[12,1],[12,4],[12,5],[12,8],[12,10],[12,12],[12,14],[12,17],[12,18],[12,20],[13,0],[13,2],[13,3],[13,7],[13,9],[13,11],[13,13],[13,15],[13,19],[14,8],[14,10],[14,11],[14,13],[14,15],[14,16],[14,18],[14,20],[15,9],[15,12],[15,14],[15,17],[15,19],[16,8],[16,10],[16,13],[16,15],[16,18],[16,20],[17,9],[17,11],[17,12],[17,14],[17,16],[17,17],[17,19],[18,8],[18,10],[18,13],[18,15],[18,18],[18,20],[19,9],[19,11],[19,14],[19,16],[19,17],[19,19],[20,8],[20,10],[20,12],[20,13],[20,15],[20,18],[20,20]];
  pattern.forEach(([r, c]) => { doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F'); });
};

let tamilFontCache = null;
const loadAndRegisterTamilFont = async (doc) => {
  if (!tamilFontCache) {
    tamilFontCache = (async () => {
      const urls = ['/fonts/NotoSansTamil-Regular.ttf', 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf'];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i += 1024) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 1024));
            return window.btoa(binary);
          }
        } catch (e) {}
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
    } catch (e) {}
  }
  return 'helvetica';
};

const capitalizeAddressLine = (str) => {
  if (typeof str !== 'string') return str;
  return str.toLowerCase().replace(/\b[a-z]/g, char => char.toUpperCase());
};

export const generateEnterpriseAdminInvoicePDF = async (order, adminInfo) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const tamilFont = await loadAndRegisterTamilFont(doc);
  const logoDataUrl = await loadLogoImage();
  
  const items = order.orderItems || [];
  const imagePromises = items.map(item => {
    const url = item.image || item.product?.image || item.product?.imageUrl;
    return loadProductImage(url);
  });
  const itemImages = await Promise.all(imagePromises);

  const leftM = 14;
  const rightM = 196;
  const contentW = rightM - leftM;

  // Header Background
  doc.setFillColor(248, 250, 252);
  doc.rect(leftM, 15, contentW, 36, 'F');
  
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', leftM + 4, 18, 30, 30);
  } else {
    doc.setFillColor(22, 163, 74);
    doc.circle(leftM + 19, 33, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TM", leftM + 19, 35, { align: 'center' });
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text("TIRUCHENDUR MURUGAN PAZHAMUDHIR SOLAI", leftM + 38, 22);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Fresh Fruits \u2022 Vegetables \u2022 Grocery \u2022 Dairy Products", leftM + 38, 26);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("GSTIN: 33ABCDE1234F1Z5  |  FSSAI: 12423000000123", leftM + 38, 32);
  doc.text("Sriperumbudur, Tamil Nadu - 602105", leftM + 38, 36);
  doc.text("Phone: +91 94443 62453  |  Email: admin@tmstore.com", leftM + 38, 40);
  doc.text("Web: www.tmstore.com", leftM + 38, 44);

  // ADMIN COPY Badge
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(rightM - 28, 18, 24, 6, 1, 1, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("ADMIN COPY", rightM - 16, 22.2, { align: 'center' });

  // Right Header Details
  const orderDateObj = new Date(order.createdAt || Date.now());
  const rLines = [
    { l: "Invoice No:", v: order.invoiceNumber || `INV-${(order._id||'').slice(-6).toUpperCase()}` },
    { l: "Order ID:", v: (order._id||'').slice(-8).toUpperCase() },
    { l: "Order Date:", v: orderDateObj.toLocaleString('en-IN') },
    { l: "Payment:", v: order.paymentMethod || 'Online' },
    { l: "Pay Status:", v: order.paymentStatus || 'Pending' }
  ];
  
  rLines.forEach((line, i) => {
    const y = 29 + (i * 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(line.l, rightM - 26, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(line.v, rightM - 4, y, { align: 'right' });
  });

  // Split Customer & Delivery Panels
  let curY = 56;
  const panelW = (contentW - 6) / 2;
  
  // CUSTOMER PANEL
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(leftM, curY, panelW, 30, 2, 2, 'FD');
  
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftM, curY, panelW, 6, 2, 2, 'F');
  doc.rect(leftM, curY + 4, panelW, 2, 'F'); 
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("CUSTOMER DETAILS", leftM + 3, curY + 4.5);
  
  const userDate = order.user?.createdAt ? new Date(order.user.createdAt).toLocaleDateString() : 'Guest';
  const cName = order.user?.fullName || order.recipient?.name || 'Walk-in Customer';
  
  const cLines = [
    { l: "Name:", v: cName.length > 25 ? cName.substring(0, 22) + '...' : cName },
    { l: "Mobile:", v: order.user?.phoneNumber || order.recipient?.phone || 'N/A' },
    { l: "Email:", v: order.user?.email || 'N/A' },
    { l: "Type:", v: order.user ? "Registered Customer" : "Guest User" },
    { l: "Since:", v: userDate }
  ];
  
  cLines.forEach((ln, i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(ln.l, leftM + 3, curY + 11 + (i * 4));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(ln.v, leftM + 16, curY + 11 + (i * 4));
  });

  // DELIVERY PANEL
  const dX = leftM + panelW + 6;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(dX, curY, panelW, 30, 2, 2, 'FD');
  
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(dX, curY, panelW, 6, 2, 2, 'F');
  doc.rect(dX, curY + 4, panelW, 2, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("DELIVERY DETAILS", dX + 3, curY + 4.5);
  
  const dLines = [];
  const rName = order.recipient?.name || order.user?.fullName || 'Customer';
  dLines.push({ l: "Receiver:", v: rName.length > 25 ? rName.substring(0, 22) + '...' : rName });
  dLines.push({ l: "Contact:", v: order.recipient?.phone || order.user?.phoneNumber || 'N/A' });
  
  const addrStrs = formatDisplayAddressLines(order.shippingAddress, order.notes)
    .filter(line => {
      const clean = line.trim();
      if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(clean)) return false;
      if (clean.toLowerCase().includes('lat:') || clean.toLowerCase().includes('lng:')) return false;
      return true;
    })
    .map(capitalizeAddressLine);
    
  let addrStr = addrStrs.join(', ');
  if (addrStr.length > 65) addrStr = addrStr.substring(0, 62) + '...';
  if (!addrStr) addrStr = "Standard Checkout Address";
  
  dLines.push({ l: "Address:", v: addrStr });
  dLines.push({ l: "Distance:", v: order.shippingAddress?.distanceFromStore != null ? `${order.shippingAddress.distanceFromStore} KM` : 'N/A' });
  dLines.push({ l: "Slot:", v: order.deliverySlot || 'Standard Delivery' });
  
  dLines.forEach((ln, i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(ln.l, dX + 3, curY + 11 + (i * 4));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(ln.v, dX + 18, curY + 11 + (i * 4));
  });

  curY += 35;

  // TIMELINE
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(leftM, curY, contentW, 16, 2, 2, 'S');
  
  const steps = ["Pending", "Accepted", "Packed", "Out for Delivery", "Delivered"];
  if (order.status === 'Cancelled' || order.status === 'Rejected') {
    steps.splice(1, 4, "Cancelled");
  }
  
  const stepW = contentW / steps.length;
  steps.forEach((s, i) => {
    const cx = leftM + (stepW * i) + (stepW / 2);
    const cy = curY + 8;
    const mappedOrderStat = order.status === 'Out For Delivery' ? 'Out for Delivery' : order.status;
    const isCurrent = s === mappedOrderStat;
    const statusIndex = steps.indexOf(mappedOrderStat);
    const isCompleted = i <= statusIndex;
    
    if (i < steps.length - 1) {
      doc.setDrawColor(isCompleted ? 34 : 226, isCompleted ? 197 : 232, isCompleted ? 94 : 240);
      doc.setLineWidth(1);
      doc.line(cx + 14, cy - 2, cx + stepW - 14, cy - 2);
    }
    
    doc.setFillColor(isCompleted ? 34 : 241, isCompleted ? 197 : 245, isCompleted ? 94 : 249);
    if (isCurrent && isCompleted) doc.setDrawColor(22, 163, 74);
    else doc.setDrawColor(255, 255, 255);
    
    doc.setLineWidth(0.5);
    doc.circle(cx, cy - 2, 3.5, 'FD');
    
    doc.setFont("helvetica", isCurrent ? "bold" : "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(isCurrent ? 15 : 100, isCurrent ? 23 : 116, isCurrent ? 42 : 139);
    doc.text(s, cx, cy + 4, { align: 'center' });
  });

  curY += 21;

  // PRODUCT TABLE
  const tableHeaders = ['#', 'IMG', 'PRODUCT NAME & SKU', 'QTY', 'MRP', 'SELL', 'GST%', 'GST AMT', 'TOTAL'];
  const tableRows = items.map((item, idx) => {
    const p = item.product || {};
    const imgData = itemImages[idx];
    const eng = p.name;
    const tam = item.nameTamil || item.tamilName || p.nameTamil || p.tamilName || '';
    const sku = item.sku || p.sku || `SKU-${(item._id || 'XX').slice(-4).toUpperCase()}`;
    const qty = Number(item.quantity) || 1;
    const sell = Number(item.price) || 0;
    const mrp = Number(item.mrp || p.mrp || sell);
    const gstRate = item.gstRate || p.gstRate || 0;
    const gstAmt = (sell * qty) * (gstRate / (100 + gstRate));
    const total = sell * qty;
    
    const productText = `${eng}\n(${tam})\nSKU: ${sku}`;

    return [
      idx + 1,
      { content: '', imgData },
      { 
        content: productText, 
        styles: { 
          font: "helvetica", 
          fontStyle: "bold", 
          valign: "middle" 
        } 
      },
      `${qty} ${item.unit || p.unit || 'pcs'}`,
      mrp.toFixed(2),
      sell.toFixed(2),
      `${gstRate}%`,
      gstAmt.toFixed(2),
      total.toFixed(2)
    ];
  });
  
  autoTable(doc, {
    startY: curY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 3.5
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    bodyStyles: { font: tamilFont, fontSize: 7, cellPadding: 3.5, textColor: [15, 23, 42], valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 62, halign: 'left' },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 16, halign: 'right', textColor: [100, 116, 139] },
      5: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 16, halign: 'right' },
      8: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }
    },
    margin: { left: leftM, right: leftM },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        data.cell.styles.font = ["helvetica", tamilFont, "helvetica"];
        data.cell.styles.fontStyle = ["bold", "normal", "normal"];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 1 && data.cell.raw?.imgData) {
           const dim = 10;
           const x = data.cell.x + (data.cell.width - dim) / 2;
           const y = data.cell.y + (data.cell.height - dim) / 2;
           doc.addImage(data.cell.raw.imgData, 'JPEG', x, y, dim, dim);
           doc.setDrawColor(226, 232, 240);
           doc.rect(x, y, dim, dim, 'S');
        }
      }
    }
  });

  curY = doc.lastAutoTable.finalY + 6;

  if (curY > 210) {
     doc.addPage();
     curY = 20;
  }

  // 3-Panel Bottom Section (QRs, Notes, Summary)
  const sW = (contentW - 8) / 3;
  
  // Panel 1: QR Section
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(leftM, curY, sW, 40, 2, 2, 'FD');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("VERIFICATION QRs", leftM + 4, curY + 5.5);
  
  const qrX1 = leftM + 8;
  const qrX2 = leftM + sW - 26;
  const qrY = curY + 9;
  
  doc.roundedRect(qrX1, qrY, 18, 18, 1, 1, 'FD');
  drawVectorQR(doc, qrX1 + 1, qrY + 1, 16);
  
  doc.roundedRect(qrX2, qrY, 18, 18, 1, 1, 'FD');
  drawVectorQR(doc, qrX2 + 1, qrY + 1, 16);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("Order Scan", qrX1 + 9, qrY + 22, { align: 'center' });
  doc.text("Gate Pass", qrX2 + 9, qrY + 22, { align: 'center' });

  // Triple internal tracking QR (tiny)
  drawVectorQR(doc, leftM + (sW/2) - 5, curY + 33, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text("Internal Tracking ID", leftM + (sW/2), curY + 38.5, { align: 'center' });

  // Panel 2: Admin Notes
  const nX = leftM + sW + 4;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(nX, curY, sW, 40, 2, 2, 'FD');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("ADMIN & PACKING NOTES", nX + 4, curY + 5.5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(220, 38, 38);
  doc.text("Customer Instruction:", nX + 4, curY + 11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  let splitNote = doc.splitTextToSize(order.notes || 'No special instructions provided.', sW - 8);
  doc.text(splitNote, nX + 4, curY + 15);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("Delivery Note:", nX + 4, curY + 29);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(order.deliverySlot || "Standard Timeline", nX + 4, curY + 33);
  doc.text(order.shippingAddress?.distanceFromStore != null ? `Zone Range: ${order.shippingAddress.distanceFromStore} km` : 'Zone Range: N/A', nX + 4, curY + 37);

  // Panel 3: Summary & Payment
  const fX = nX + sW + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(fX, curY, sW, 40, 2, 2, 'FD');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("FINANCIAL SUMMARY", fX + 4, curY + 5.5);
  
  const subtotal = Number(order.subTotal || order.totalPrice || 0);
  const discount = Number(order.couponDiscount || order.offerDiscount || 0);
  const delivery = Number(order.deliveryFee || 0);
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const grandTotal = subtotal - discount + delivery;

  const sumLines = [
    { l: "Total Items:", v: `${items.length} (${totalQty} units)` },
    { l: "Subtotal:", v: formatCurrencyPdf(subtotal) },
    { l: "Delivery Fee:", v: `+ ${formatCurrencyPdf(delivery)}` },
    { l: "Discount:", v: `- ${formatCurrencyPdf(discount)}`, color: [220, 38, 38] }
  ];
  
  sumLines.forEach((ln, i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(ln.l, fX + 4, curY + 11 + (i * 4.5));
    doc.setFont("helvetica", "bold");
    if (ln.color) doc.setTextColor(...ln.color);
    else doc.setTextColor(15, 23, 42);
    doc.text(ln.v, fX + sW - 4, curY + 11 + (i * 4.5), { align: 'right' });
  });
  
  doc.setDrawColor(226, 232, 240);
  doc.line(fX, curY + 28, fX + sW, curY + 28);
  
  doc.setFontSize(9);
  doc.setTextColor(22, 163, 74);
  doc.text("GRAND TOTAL", fX + 4, curY + 33.5);
  doc.setFontSize(10.5);
  doc.text(formatCurrencyPdf(grandTotal), fX + sW - 4, curY + 33.5, { align: 'right' });

  // Payment Status Banner at bottom of panel 3
  const isPaid = order.paymentStatus === 'Paid';
  doc.setFillColor(isPaid ? 34 : 245, isPaid ? 197 : 158, isPaid ? 94 : 11);
  doc.rect(fX, curY + 37, sW, 3, 'F');
  
  // Footer (All Pages)
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const fy = 288;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(leftM, fy - 4, rightM, fy - 4);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`ERP SYSTEM VERSION 2.4 | CONFIDENTIAL INTERNAL ADMIN COPY`, leftM, fy);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Generated By: ${adminInfo?.name || 'Admin'} | Print Time: ${new Date().toLocaleString('en-IN')}`, 105, fy, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, rightM, fy, { align: 'right' });
  }

  doc.save(`Enterprise_Admin_Invoice_${order.invoiceNumber || order._id}.pdf`);
};
