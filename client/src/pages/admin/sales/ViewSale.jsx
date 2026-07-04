import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import {
  FiArrowLeft,
  FiPrinter,
  FiFileText,
  FiUser,
  FiUserCheck,
  FiCalendar,
  FiDollarSign,
  FiPackage,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiDownload,
} from "react-icons/fi";

// ── Company info shown on the printed bill (edit these) ──
const COMPANY = {
  name: "Heaven Autos",
  addressLine1: "77.R.N.Road, Noldanga Road (Heaven Building), Jashore-7400,",
  addressLine2: "Address Line 2,",
  addressLine3: "City, Bangladesh",
  phone: "Tel 0421-66095, Mob 01924-331354, 01711-355328, 01778-117515",
  email: "Email: heavenautos77jsr@yahoo.com/heavenautojessore@gmail.com",
};

// ── Convert amount to words (BDT, lakh/crore system) ──
const numberToWords = (num) => {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const twoDigits = (n) =>
    n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`;

  const threeDigits = (n) => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let str = "";
    if (h) str += `${ones[h]} Hundred`;
    if (rest) str += `${str ? " " : ""}${twoDigits(rest)}`;
    return str;
  };

  num = Math.floor(Math.abs(num || 0));
  if (num === 0) return "Zero";

  let words = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

  if (crore) words += `${twoDigits(crore)} Crore `;
  if (lakh) words += `${twoDigits(lakh)} Lakh `;
  if (thousand) words += `${twoDigits(thousand)} Thousand `;
  if (num) words += threeDigits(num);

  return words.trim();
};

export default function ViewSale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();

  const [sale, setSale] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchSaleData();
  }, [id]);

  const fetchSaleData = async () => {
    try {
      setLoading(true);
      const [saleRes, prodRes, custRes, empRes] = await Promise.all([
        axiosInstance.get(`sale/sales/${id}/`),
        axiosInstance.get("products/"),
        axiosInstance.get("person/customers/"),
        axiosInstance.get("person/employees/"),
      ]);

      setSale(saleRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setCustomers(custRes.data.results || custRes.data);
      setEmployees(empRes.data.results || empRes.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to fetch sale details.");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getCustomerName = (id) => {
    if (!id) return "Walk-in Customer";
    const cust = customers.find((c) => String(c.id) === String(id));
    return cust ? cust.shop_name || cust.proprietor_name || cust.name : "Walk-in Customer";
  };

  const getCustomerDetails = (id) => {
    if (!id) return null;
    return customers.find((c) => String(c.id) === String(id));
  };

  const getEmployeeName = (id) => {
    if (!id) return "Unknown";
    const emp = employees.find((e) => String(e.id) === String(id));
    if (!emp) return "Unknown";
    return emp.first_name
      ? `${emp.first_name} ${emp.last_name || ""}`.trim()
      : emp.full_name || emp.name || emp.employee_id;
  };

  const getProductPartNumber = (item) => {
    if (!item) return "N/A";
    let product = products.find((p) => String(p.id) === String(item.product));
    if (!product) {
      product = products.find((p) => p.product_name === item.product_name);
    }
    return product?.part_number || "N/A";
  };

  const getProductBrand = (item) => {
    if (!item) return "N/A";
    const product = products.find((p) => String(p.id) === String(item.product));
    return product?.brand_name || product?.brand || "N/A";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
      .toUpperCase()
      .replace(/ /g, "-");
  };

  const formatCurrency = (amount) => {
    return `৳ ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatNumber = (amount) => {
    return parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!sale || !sale.items) return { subtotal: 0, total: 0, discount: 0 };
    const subtotal = sale.items.reduce((sum, item) => sum + parseFloat(item.total_price_bdt || 0), 0);
    const discount = parseFloat(sale.discount_amount || 0);
    const total = subtotal - discount;
    return { subtotal, discount, total };
  };

  // Print bill — layout styled like a standard computer shop invoice
  const handlePrint = async () => {
    setPrinting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const WinPrint = window.open("", "", "width=900,height=650");

      if (!WinPrint) {
        alert("Please allow pop-ups for this site to print the bill.");
        setPrinting(false);
        return;
      }

      const totals = calculateTotals();
      const customer = getCustomerDetails(sale?.customer);
      const paid =
        sale?.payment_status === "Paid"
          ? totals.total
          : parseFloat(sale?.paid_amount || 0);
      const due = totals.total - paid;

      WinPrint.document.write(`
        <html>
          <head>
            <title>Invoice #${sale?.invoice_number || "N/A"}</title>
            <style>
              @page {
                size: A4;
                margin: 10mm;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 12px;
                color: #000;
                background: #fff;
                padding: 10px;
                margin: 0;
              }
              .invoice-container {
                max-width: 860px;
                margin: 0 auto;
                padding: 5px;
              }
              /* ── Top header: company left, invoice box right ── */
              .top-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                width: 100%;
              }
              .company-block {
                flex: 1;
              }
              .company-block .logo {
                font-size: 30px;
                font-weight: bold;
                font-style: italic;
                letter-spacing: 1px;
                margin-bottom: 8px;
              }
              .company-block .company-name {
                font-weight: bold;
                font-size: 13px;
                margin-bottom: 2px;
              }
              .company-block .company-line {
                font-size: 11px;
                line-height: 1.4;
              }
              .invoice-box {
                text-align: left;
                min-width: 180px;
                margin-left: 20px;
              }
              .invoice-box .title {
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 4px;
              }
              .invoice-box .boxed {
                border: 1px solid #000;
                padding: 3px 8px;
                font-size: 12px;
                margin-bottom: 3px;
                width: 100%;
              }
              /* ── Customer line ── */
              .customer-line {
                font-size: 12px;
                margin-bottom: 12px;
                line-height: 1.5;
              }
              .customer-line b {
                font-weight: bold;
              }
              /* ── Items table (fully bordered, B&W) ── */
              table.items {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                border: 1px solid #000;
              }
              table.items th,
              table.items td {
                border: 1px solid #000;
                padding: 5px 6px;
                vertical-align: middle;
              }
              table.items th {
                font-weight: bold;
                text-align: left;
                background: #f0f0f0;
              }
              .col-sl { width: 5%; text-align: center; }
              .col-part-no { width: 15%; }
              .col-part-name { width: 35%; }
              .col-qty { width: 10%; text-align: center; }
              .col-price { width: 17%; text-align: right; }
              .col-total { width: 18%; text-align: right; }
              td.num { text-align: right; }
              td.ctr { text-align: center; }
              .item-name { font-weight: normal; }
              .item-meta { font-size: 10px; color: #555; }
              /* Totals rows inside the table */
              .totals-label {
                text-align: left;
                font-weight: normal;
              }
              .words-cell {
                font-weight: bold;
                border: 1px solid #000;
                font-size: 11px;
              }
              /* ── Paid/Due line ── */
              .paid-line {
                text-align: right;
                font-size: 13px;
                margin: 8px 0 4px;
                font-weight: bold;
              }
              .received-note {
                font-size: 12px;
                margin: 10px 0 18px;
              }
              /* ── Sale info table ── */
              .section-title {
                font-weight: bold;
                font-size: 13px;
                margin-bottom: 5px;
                margin-top: 10px;
              }
              table.payments {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                margin-bottom: 15px;
                border: 1px solid #000;
              }
              table.payments th,
              table.payments td {
                border: 1px solid #000;
                padding: 4px 6px;
                text-align: left;
              }
              table.payments th {
                font-weight: bold;
                background: #f0f0f0;
              }
              /* ── Footer / terms ── */
              .vat-note {
                font-size: 11px;
                margin-bottom: 10px;
              }
              .terms-title {
                font-weight: bold;
                font-size: 13px;
                margin-bottom: 5px;
              }
              .terms ol {
                padding-left: 20px;
                font-size: 12px;
                line-height: 1.5;
              }
              .system-note {
                margin-top: 15px;
                font-size: 11px;
                font-style: italic;
              }
              @media print {
                body { 
                  padding: 0; 
                  margin: 0;
                }
                .invoice-container {
                  padding: 10px;
                }
                table.items th,
                table.items td {
                  border: 1px solid #000 !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">

              <!-- ── Header ── -->
              <div class="top-header">
                <div class="company-block">
                  <div class="logo">${COMPANY.name.toUpperCase()}</div>
                  <div class="company-name">${COMPANY.name}</div>
                  <div class="company-line">${COMPANY.addressLine1}</div>
                  <div class="company-line">${COMPANY.addressLine2}</div>
                  <div class="company-line">${COMPANY.addressLine3}</div>
                  <div class="company-line">${COMPANY.phone}</div>
                  <div class="company-line">${COMPANY.email}</div>
                </div>
                <div class="invoice-box">
                  <div class="title">INVOICE / BILL</div>
                  <div class="boxed"><b>NO:</b> ${sale?.invoice_number || "N/A"}</div>
                  <div class="boxed"><b>Date:</b> ${formatDateShort(sale?.sale_date)}</div>
                </div>
              </div>

              <!-- ── Customer line ── -->
              <div class="customer-line">
                <b>Customer:</b> ${getCustomerName(sale?.customer)}
                ${customer?.proprietor_name ? ` &nbsp; <b>Proprietor:</b> ${customer.proprietor_name}` : ""}
                ${customer?.phone ? ` &nbsp; <b>Phone:</b> ${customer.phone}` : ""}
                <br/>
                ${customer?.address ? `<b>Address:</b> ${customer.address} &nbsp; ` : ""}
                <b>Salesman:</b> ${getEmployeeName(sale?.sold_by)}
              </div>

              <!-- ── Items table ── -->
              <table class="items">
                <thead>
                  <tr>
                    <th class="col-sl">SL</th>
                    <th class="col-part-no">PART NO.</th>
                    <th class="col-part-name">PART NAME</th>
                    <th class="col-qty">QTY</th>
                    <th class="col-price">PRICE</th>
                    <th class="col-total">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${sale?.items?.map((item, index) => `
                  <tr>
                    <td class="ctr">${index + 1}</td>
                    <td style="font-size:11px;">${getProductPartNumber(item)}</td>
                    <td>
                      <span class="item-name">${item.product_name}</span>
                      <div class="item-meta">Brand: ${getProductBrand(item)}</div>
                    </td>
                    <td class="ctr">${item.quantity}</td>
                    <td class="num">${formatNumber(item.unit_price_bdt)}</td>
                    <td class="num">${formatNumber(item.total_price_bdt)}</td>
                  </tr>
                  `).join("") || '<tr><td colspan="6" style="text-align:center;">No items found</td></tr>'}
                  <!-- Totals rows -->
                  <tr>
                    <td colspan="4" rowspan="${totals.discount > 0 ? 3 : 2}" class="words-cell" style="vertical-align:bottom; padding: 8px;">
                      <b>Amount In Words:</b> BDT ${numberToWords(totals.total)} Only
                    </td>
                    <td class="totals-label"><b>Total</b></td>
                    <td class="num"><b>${formatNumber(totals.subtotal)}</b></td>
                  </tr>
                  ${totals.discount > 0 ? `
                  <tr>
                    <td class="totals-label">Less/Add.</td>
                    <td class="num">${formatNumber(totals.discount)}</td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td class="totals-label"><b>Grand Total</b></td>
                    <td class="num"><b>${formatNumber(totals.total)}</b></td>
                  </tr>
                </tbody>
              </table>

              <!-- ── Paid / Due ── -->
              <div class="paid-line">
                Paid: ${formatNumber(paid)} Tk &nbsp;&nbsp;&nbsp; Due: ${formatNumber(due > 0 ? due : 0)} Tk
              </div>
              <div class="received-note">✓ Good received by customer in good condition.</div>

              <!-- ── Sale info ── -->
              <div class="section-title">Sale Information</div>
              <table class="payments">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sold By</th>
                    <th>Payment Status</th>
                    <th>Items</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${formatDate(sale?.sale_date)}</td>
                    <td>${getEmployeeName(sale?.sold_by)}</td>
                    <td>${sale?.payment_status || "Unpaid"}</td>
                    <td>${sale?.items?.length || 0}</td>
                  </tr>
                </tbody>
              </table>

              ${sale?.remarks ? `<div class="vat-note"><b>Remarks:</b> ${sale.remarks}</div>` : ""}
              <div class="vat-note">* VAT and TAX not included if not mentioned in the item field.</div>

              <!-- ── Terms ── -->
              <div class="terms">
                <div class="terms-title">Terms &amp; Conditions:</div>
                <ol>
                  <li>Goods once sold will not be refunded &amp; changed.</li>
                  <li>The products under warranty will be repaired or replaced by the manufacturing company.</li>
                  <li>Timing for the warranty process will be controlled by the manufacturing company.</li>
                </ol>
              </div>

              <div class="system-note">
                ** This is a system generated bill / invoice, seal &amp; sign are not mandatory. **
              </div>

            </div>
          </body>
        </html>
      `);

      WinPrint.document.close();

      setTimeout(() => {
        WinPrint.focus();
        WinPrint.print();
        setTimeout(() => {
          WinPrint.close();
          setPrinting(false);
        }, 500);
      }, 500);
    } catch (err) {
      console.error("Print error:", err);
      alert("Failed to generate print preview. Please try again.");
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white border border-gray-300 p-8 text-center">
          <div className="animate-pulse text-gray-400">Loading sale details...</div>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white border border-red-300 p-8 text-center">
          <p className="text-red-600">{error || "Sale not found"}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-3">
      {/* Header Actions */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 bg-white border border-gray-300 p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 p-1.5 border border-gray-300 rounded hover:bg-gray-50"
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FiFileText className="text-blue-600" />
              Sale Details
            </h1>
            <p className="text-xs text-gray-500">
              Invoice #{sale.invoice_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition disabled:opacity-50"
          >
            <FiPrinter />
            {printing ? "Preparing..." : "Print Bill"}
          </button>
          {/* <button
            onClick={() => navigate(`/dashboard/sales/edit/${sale.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition"
          >
            <FiFileText />
            Edit
          </button> */}
        </div>
      </div>

      {/* Hidden Print Content */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {/* Print content is generated in handlePrint */}
        </div>
      </div>

      {/* Sale Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiUser size={12} /> Customer
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {getCustomerName(sale.customer)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiUserCheck size={12} /> Sold By
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {getEmployeeName(sale.sold_by)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiCalendar size={12} /> Date
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {formatDate(sale.sale_date)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiDollarSign size={12} /> Total
          </p>
          <p className="text-sm font-bold text-green-600 truncate">
            {formatCurrency(totals.total)}
          </p>
        </div>
      </div>

      {/* Status & Payment Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-300 p-3 flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            sale.payment_status === 'Paid' ? 'bg-green-100' :
            sale.payment_status === 'Partial' ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            {sale.payment_status === 'Paid' ? <FiCheckCircle className="text-green-600" size={20} /> :
             sale.payment_status === 'Partial' ? <FiClock className="text-amber-600" size={20} /> :
             <FiXCircle className="text-red-600" size={20} />}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Payment Status
            </p>
            <p className={`font-bold ${
              sale.payment_status === 'Paid' ? 'text-green-600' :
              sale.payment_status === 'Partial' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {sale.payment_status || "Unpaid"}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Discount
          </p>
          <p className="font-bold text-red-600">
            {formatCurrency(totals.discount)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Items Count
          </p>
          <p className="font-bold text-gray-800">
            {sale.items?.length || 0} products
          </p>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-gray-300 overflow-hidden mb-4">
        <div className="border-b border-gray-300 px-3 py-2 bg-gray-50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <FiPackage /> Products Sold
          </h3>
          <span className="text-xs text-gray-500">
            {sale.items?.length || 0} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  SL
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                  Part No
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                  Product Name
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Qty
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                  Unit Price
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                  Total
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right text-emerald-300">
                  Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item, idx) => {
                  const partNumber = getProductPartNumber(item);
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-xs">
                        <div className="font-bold text-gray-800">
                          {partNumber}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="text-xs font-bold text-gray-800">
                          {item.product_name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Brand: {getProductBrand(item)}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs">
                        {formatCurrency(item.unit_price_bdt)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-xs text-gray-800">
                        {formatCurrency(item.total_price_bdt)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-emerald-600 text-xs">
                        {item.profit_bdt ? formatCurrency(item.profit_bdt) : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="border border-gray-300 px-3 py-6 text-center text-gray-400 text-sm">
                    No products in this sale.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan="5" className="border border-gray-300 px-2 py-1.5 text-right text-xs uppercase text-gray-600">
                  Subtotal
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono">
                  {formatCurrency(totals.subtotal)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
              </tr>
              {totals.discount > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan="5" className="border border-gray-300 px-2 py-1.5 text-right text-xs uppercase text-red-600">
                    Discount
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-red-600">
                    -{formatCurrency(totals.discount)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5"></td>
                </tr>
              )}
              <tr className="bg-green-50 font-bold">
                <td colSpan="5" className="border border-gray-300 px-2 py-1.5 text-right text-sm uppercase text-green-700">
                  Grand Total
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-base text-green-700">
                  {formatCurrency(totals.total)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Remarks */}
      {sale.remarks && (
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Remarks
          </p>
          <p className="text-sm text-gray-700">{sale.remarks}</p>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back to Sales
        </button>
        <button
          onClick={handlePrint}
          disabled={printing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition disabled:opacity-50"
        >
          <FiPrinter />
          {printing ? "Preparing..." : "Print / PDF"}
        </button>
      </div>
    </div>
  );
}