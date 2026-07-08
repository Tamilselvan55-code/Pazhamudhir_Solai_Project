import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

const InvoiceModal = ({ order, userInfo, onClose }) => {
  if (!order) return null;

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Actions bar (hidden during print) */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between print:hidden">
          <h3 className="text-base font-bold text-gray-800">Tax Invoice / Bill</h3>
          <div className="flex items-center gap-2">
            {userInfo?.role === 'admin' && (
              <>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => generateInvoicePDF(order, userInfo)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
                  title="Download Supermarket Bill PDF"
                >
                  <Download className="w-4 h-4" /> Download PDF Bill
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area - Supermarket Style */}
        <div className="p-8 space-y-6 text-slate-800 bg-white print:p-0">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-200 pb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-800 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner shrink-0">
                TM
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-black text-emerald-800 tracking-tight leading-none">
                  TIRUCHENDUR MURUGAN
                </h2>
                <h3 className="text-lg font-bold text-emerald-800 tracking-wide mt-1">
                  PAZHAMUDHIR SOLAI
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-1.5">
                  →─── Grocery & Fresh Vegetables Store ───←
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  📍 Sriperumbudur, Tamil Nadu - 602105
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  📞 +91 94443 62453 | ✉ contact@tmstore.com | 🌐 www.tmstore.com
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-500 rounded-2xl p-4 text-center min-w-[180px] shadow-sm shrink-0">
              <div className="bg-emerald-800 text-white text-xs font-black py-1.5 px-4 rounded-lg uppercase tracking-wider shadow">
                TAX INVOICE / BILL
              </div>
              <p className="text-xs font-bold text-slate-800 mt-2.5 leading-tight">
                Thank you for<br />shopping with us!
              </p>
              <p className="text-emerald-600 text-sm mt-1">🌿</p>
            </div>
          </div>

          {/* Three Info Cards - 2-col top row + full-width Delivery Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Customer Details */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-emerald-800 text-white font-bold px-3 py-1.5 flex items-center gap-1.5 text-xs">
                <span>👤</span> CUSTOMER DETAILS
              </div>
              <div className="p-3 space-y-1 text-slate-700 font-medium">
                <div className="flex"><span className="w-20 text-slate-400">Name :</span> <span className="font-bold text-slate-900">{order.recipient?.name || userInfo?.fullName || 'Customer'}</span></div>
                <div className="flex"><span className="w-20 text-slate-400">Phone :</span> <span>{order.recipient?.phone || userInfo?.phoneNumber || 'N/A'}</span></div>
                <div className="flex"><span className="w-20 text-slate-400">Email :</span> <span>{userInfo?.email || 'N/A'}</span></div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-emerald-800 text-white font-bold px-3 py-1.5 flex items-center gap-1.5 text-xs">
                <span>📄</span> INVOICE DETAILS
              </div>
              <div className="p-3 space-y-1 text-slate-700 font-medium">
                <div className="flex"><span className="w-24 text-slate-400">Invoice No. :</span> <span className="font-bold text-slate-900">{order.invoiceNumber || order._id.slice(-6).toUpperCase()}</span></div>
                <div className="flex"><span className="w-24 text-slate-400">Order Date :</span> <span>{orderDate}</span></div>
                <div className="flex"><span className="w-24 text-slate-400">Invoice Date :</span> <span>{orderDate}</span></div>
                <div className="flex items-center pt-0.5"><span className="w-24 text-slate-400">Order Status :</span> <span className="bg-emerald-800 text-white font-bold px-2 py-0.5 rounded text-[10px]">{order.status || 'Accepted'}</span></div>
              </div>
            </div>

            {/* Delivery Address - Full Width */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white md:col-span-2">
              <div className="bg-emerald-800 text-white font-bold px-3 py-1.5 flex items-center gap-1.5 text-xs">
                <span>📍</span> DELIVERY ADDRESS
              </div>
              <div className="p-3 text-slate-700 leading-relaxed font-medium">
                {order.shippingAddress?.fullAddress || order.shippingAddress?.street || 'Standard Delivery / Store Pickup'}
                <div className="text-slate-500 mt-0.5">
                  {[order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.pincode].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>

          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 text-center w-12">S.No.</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price (₹)</th>
                  <th className="py-3 px-4 text-center">GST (%)</th>
                  <th className="py-3 px-4 text-right">GST Amount (₹)</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {order.orderItems?.map((item, idx) => {
                  const price = Number(item.price) || 0;
                  const qty = Number(item.quantity) || 1;
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="py-3 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{item.name || item.product?.name || 'Item'}</div>
                        {(item.nameTamil || item.tamilName || item.product?.nameTamil || item.product?.tamilName) && (
                          <div className="text-[11px] text-emerald-700 font-normal">
                            ({item.nameTamil || item.tamilName || item.product?.nameTamil || item.product?.tamilName})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{qty}</td>
                      <td className="py-3 px-4 text-right">{price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-slate-400">0%</td>
                      <td className="py-3 px-4 text-right text-slate-400">0.00</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{(price * qty).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Scan & Pay and Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
            {/* Scan Box */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-2">
              <h4 className="font-bold text-emerald-900 text-sm">SCAN & PAY (Optional)</h4>
              <p className="text-xs text-slate-500">Scan this QR code to support our store.</p>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm my-2">
                <div className="w-28 h-28 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-bold relative overflow-hidden">
                  <div className="absolute inset-1 grid grid-cols-5 grid-rows-5 gap-1 p-1 bg-white">
                    <div className="col-span-2 row-span-2 bg-slate-900 rounded-sm"></div>
                    <div className="col-start-4 col-span-2 row-span-2 bg-slate-900 rounded-sm"></div>
                    <div className="col-span-2 row-start-4 row-span-2 bg-slate-900 rounded-sm"></div>
                    <div className="col-start-3 row-start-3 bg-slate-900"></div>
                    <div className="col-start-4 row-start-4 bg-slate-900"></div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] font-semibold text-slate-700">This is the store QR code.<br />Thank you for your support!</p>
            </div>

            {/* Summary Block */}
            <div className="bg-white p-2 space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal (Before GST)</span>
                <span className="font-bold text-slate-900">₹{Number(order.subTotal || order.totalPrice || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>GST Total</span>
                <span className="font-bold text-slate-900">₹0.00</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Delivery Charge</span>
                <span>₹0.00</span>
              </div>
              {(order.couponDiscount > 0 || order.offerDiscount > 0) && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Discount</span>
                  <span>-₹{Number(order.couponDiscount || order.offerDiscount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="border-b border-dashed border-slate-300 pt-1"></div>
              
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-base font-black text-emerald-800 uppercase tracking-wide">TOTAL PAYABLE</h4>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">(Rupees Five Hundred Fifteen Only)</p>
                </div>
                <div className="bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-black text-lg shadow-md">
                  ₹{Number(order.totalPrice || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="border-y border-slate-200 py-4 my-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">✔</div>
              <div className="text-left"><p className="font-bold text-xs text-slate-800">100% Fresh</p><p className="text-[10px] text-slate-500">Farm Fresh Quality</p></div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">🛍</div>
              <div className="text-left"><p className="font-bold text-xs text-slate-800">Best Prices</p><p className="text-[10px] text-slate-500">Affordable Everyday</p></div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">🚚</div>
              <div className="text-left"><p className="font-bold text-xs text-slate-800">Fast Delivery</p><p className="text-[10px] text-slate-500">On-time Assurance</p></div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">🎧</div>
              <div className="text-left"><p className="font-bold text-xs text-slate-800">Support</p><p className="text-[10px] text-slate-500">We are here to help</p></div>
            </div>
          </div>

          {/* Footer Terms & Support */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs pt-2 pb-6">
            <div>
              <h5 className="font-bold text-slate-800 uppercase mb-2">TERMS & CONDITIONS</h5>
              <ul className="space-y-1 text-[11px] text-slate-500">
                <li>• Goods once sold will not be taken back.</li>
                <li>• Please check items before accepting delivery.</li>
                <li>• Keep this invoice for future reference.</li>
                <li>• Subject to Sriperumbudur jurisdiction only.</li>
              </ul>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <h4 className="text-lg font-black text-emerald-600 italic font-serif">🌿 Thank You! 🌿</h4>
              <p className="text-xs text-slate-600 font-medium mt-1">We appreciate your trust and support.</p>
              <div className="text-emerald-700 tracking-widest font-bold mt-1">★ ★ ★ ★ ★</div>
            </div>
            <div className="md:text-right">
              <h5 className="font-bold text-slate-800 uppercase mb-2">FOR SUPPORT</h5>
              <div className="space-y-1 text-[11px] text-slate-500">
                <p>📞 +91 94443 62453</p>
                <p>✉ contact@tmstore.com</p>
                <p>🌐 www.tmstore.com</p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="bg-emerald-800 text-white text-[11px] py-3 px-6 rounded-b-3xl flex justify-between items-center font-medium">
            <span>This is a computer-generated invoice and does not require a signature.</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
