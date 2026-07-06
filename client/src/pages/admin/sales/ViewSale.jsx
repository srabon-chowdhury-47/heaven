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
  FiTrendingUp,
} from "react-icons/fi";

// ── Company info shown on the printed bill (edit these) ──
const COMPANY = {
  name: "Heaven Autos",
  addressLine1: "77.R.N.Road, Noldanga Road (Heaven Building), Jashore-7400,",
  addressLine2: "Address Line 2,",
  addressLine3: "City, Bangladesh",
  phone: "Tel 0421-66095, Mob 01924-331354, 01711-355328, 01778-117515",
  email: "Email: heavenautojessore@gmail.com Website: www.heavenautos.com.bd",
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
  const [brands, setBrands] = useState([]);
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
      const [saleRes, prodRes, brandRes, custRes, empRes] = await Promise.all([
        axiosInstance.get(`sale/sales/${id}/`),
        axiosInstance.get("products/"),
        axiosInstance.get("brand/brands/"),
        axiosInstance.get("person/customers/"),
        axiosInstance.get("person/employees/"),
      ]);

      setSale(saleRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setBrands(brandRes.data.results || brandRes.data);
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

  const getProductDetails = (productId) => {
    if (!productId) return null;
    return products.find((p) => String(p.id) === String(productId));
  };

  const getProductPartNumber = (item) => {
    if (!item) return "N/A";
    const product = getProductDetails(item.product);
    return product?.part_number || "N/A";
  };

  const getProductBrand = (item) => {
    if (!item) return "N/A";
    const product = getProductDetails(item.product);
    if (!product) return "N/A";
    // Find brand by ID
    const brand = brands.find((b) => String(b.id) === String(product.brand));
    return brand?.name || "N/A";
  };

  const getProductPurchasePrice = (item) => {
    if (!item) return 0;
    const product = getProductDetails(item.product);
    return product?.purchase_cost_bdt || 0;
  };

  const getProductName = (item) => {
    if (!item) return "Unknown Product";
    const product = getProductDetails(item.product);
    return product?.product_name || item.product_name || "Unknown Product";
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

  // Calculate percentage difference
  const calculatePercentage = (mrp, price) => {
    if (!mrp || mrp === 0) return null;
    const diff = ((mrp - price) / mrp) * 100;
    return diff.toFixed(1);
  };

  // Get multiplier display
  const getMultiplierDisplay = (item) => {
    if (!item) return "N/A";
    if (item.multiplier) {
      return parseFloat(item.multiplier).toFixed(2);
    }
    const purchasePrice = getProductPurchasePrice(item);
    const salePrice = parseFloat(item.unit_price_bdt || 0);
    if (purchasePrice > 0 && salePrice > 0) {
      return (salePrice / purchasePrice).toFixed(2);
    }
    return "N/A";
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
      const previousBalance = parseFloat(sale?.previous_balance || 0);
      const currentBalance = previousBalance + due;

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
              table.customer-info {
                width: 50%;
                border-collapse: collapse;
                margin-bottom: 12px;
                border: 1px solid #000;
                font-size: 11px;
              }
              table.customer-info td {
                border: 1px solid #000;
                padding: 2px 6px;
                font-size: 11px;
              }
              table.customer-info .label {
                font-weight: bold;
                width: 25%;
              }
              table.items {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
                border: 1px solid #000;
                table-layout: fixed;
              }
              table.items th,
              table.items td {
                border: 1px solid #000;
                padding: 4px 5px;
                vertical-align: middle;
                word-wrap: break-word;
              }
              table.items th {
                font-weight: bold;
                text-align: center;
                background: #f0f0f0;
                text-transform: capitalize;
                font-size: 10px;
              }
              .col-sl { width: 4%; text-align: center; }
              .col-part-no { width: 11%; text-align: center; }
              .col-brand { width: 8%; text-align: center; }
              .col-part-name { width: 22%; text-align: center; }
              .col-multiplier { width: 7%; text-align: center; }
              .col-qty { width: 6%; text-align: center; }
              .col-mrp { width: 10%; text-align: center; }
              .col-percent { width: 6%; text-align: center; }
              .col-price { width: 11%; text-align: center; }
              .col-total { width: 11%; text-align: center; }
              td.num { text-align: right; }
              td.ctr { text-align: center; }
              td.part-no { text-align: left; }
              .item-name { font-weight: normal; }
              .item-meta { font-size: 9px; color: #555; }
              .totals-label {
                text-align: right;
                font-weight: normal;
              }
              .words-cell {
                font-weight: bold;
                border: 1px solid #000;
                font-size: 11px;
              }
              .totals-label,
              .balance-label {
                text-align: right;
                font-weight: normal;
                font-size: 12px;
                white-space: nowrap;
              }
              .balance-value {
                text-align: right;
                font-weight: normal;
                font-size: 12px;
              }
              .received-note {
                font-size: 12px;
                margin: 10px 0 18px;
              }
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

              <div class="top-header">
                <div class="company-block">
                  <div class="logo">${COMPANY.name.toUpperCase()}</div>
                  <div class="company-name">${COMPANY.name}</div>
                  <div class="company-line">${COMPANY.addressLine1}</div>
                  <div class="company-line">${COMPANY.phone}</div>
                  <div class="company-line">${COMPANY.email}</div>
                </div>
                <div class="invoice-box">
                  <div class="title">INVOICE / BILL</div>
                  <div class="boxed"><b>NO:</b> ${sale?.invoice_number || "N/A"}</div>
                  <div class="boxed"><b>Date:</b> ${formatDateShort(sale?.sale_date)}</div>
                </div>
              </div>

              <table class="customer-info">
                <tr>
                  <td class="label">Customer:</td>
                  <td colspan="3">${getCustomerName(sale?.customer)}</td>
                </tr>
                <tr>
                  <td class="label">Address:</td>
                  <td colspan="3">${customer?.address || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Phone:</td>
                  <td colspan="3">${customer?.phone || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td colspan="3">${customer?.email || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Salesman:</td>
                  <td colspan="3">${getEmployeeName(sale?.sold_by)}</td>
                </tr>
              </table>

              <table class="items">
                <thead>
                  <tr>
                    <th class="col-sl">Sl</th>
                    <th class="col-part-no">Part no.</th>
                    <th class="col-brand">Brand</th>
                    <th class="col-part-name">Product name</th>
                    <th class="col-multiplier">×</th>
                    <th class="col-qty">Qty</th>
                    <th class="col-mrp">Mrp (inr)</th>
                    <th class="col-percent">%</th>
                    <th class="col-price">Price</th>
                    <th class="col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${sale?.items?.map((item, index) => {
                    const mrp = parseFloat(item.mrp_inr || 0);
                    const price = parseFloat(item.unit_price_bdt || 0);
                    const percentage = calculatePercentage(mrp, price);
                    const multiplier = getMultiplierDisplay(item);
                    const brandName = getProductBrand(item);
                    const productName = getProductName(item);
                    const partNumber = getProductPartNumber(item);
                    return `
                  <tr>
                    <td class="ctr">${index + 1}</td>
                    <td class="part-no" style="font-size:11px;">${partNumber}</td>
                    <td class="ctr" style="font-size:11px;">${brandName}</td>
                    <td>
                      <span class="item-name">${productName}</span>
                    </td>
                    <td class="ctr" style="font-size:11px;">${multiplier}</td>
                    <td class="ctr">${item.quantity}</td>
                    <td class="num">${mrp ? formatNumber(mrp) : "—"}</td>
                    <td class="ctr">${percentage ? percentage + "%" : "—"}</td>
                    <td class="num">${formatNumber(price)}</td>
                    <td class="num">${formatNumber(item.total_price_bdt)}</td>
                  </tr>
                  `;
                  }).join("") || '<tr><td colspan="10" style="text-align:center;">No items found</td></tr>'}
                  <tr>
                    <td colspan="7" rowspan="${totals.discount > 0 ? 6 : 5}" class="words-cell" style="vertical-align:bottom; padding: 8px;">
                      <b>Amount In Words:</b> BDT ${numberToWords(totals.total)} Only
                    </td>
                    <td colspan="2" class="totals-label">Total</td>
                    <td class="num" style="font-weight:normal;">${formatNumber(totals.subtotal)}</td>
                  </tr>
                  ${totals.discount > 0 ? `
                  <tr>
                    <td colspan="2" class="totals-label">Less/Add.</td>
                    <td class="num" style="font-weight:normal;">${formatNumber(totals.discount)}</td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td colspan="2" class="totals-label">Grand Total</td>
                    <td class="num" style="font-weight:normal;">${formatNumber(totals.total)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" class="balance-label">Previous Balance</td>
                    <td class="num balance-value" style="font-weight:normal;">${formatNumber(previousBalance)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" class="balance-label">Paid</td>
                    <td class="num balance-value" style="font-weight:normal;">${formatNumber(paid)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" class="balance-label">Current Balance</td>
                    <td class="num balance-value" style="font-weight:normal;">
                      ${formatNumber(currentBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="received-note">✓ Good received by customer in good condition.</div>

              ${sale?.remarks ? `<div class="vat-note"><b>Remarks:</b> ${sale.remarks}</div>` : ""}
              <div class="vat-note"></div>

              <div class="terms">
                <div class="terms-title">Terms &amp; Conditions:</div>
                <ol>
                  <li>Goods once sold will not be refunded &amp; changed.</li>
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
  const customer = getCustomerDetails(sale.customer);
  const previousBalance = parseFloat(sale?.previous_balance || 0);
  const paid = sale?.payment_status === "Paid" ? totals.total : parseFloat(sale?.paid_amount || 0);
  const due = totals.total - paid;
  const currentBalance = previousBalance + due;

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
        </div>
      </div>

      {/* Customer Info Table - Half Width */}
      <div className="bg-white border border-gray-300 overflow-hidden mb-4 max-w-md">
        <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <FiUser /> Customer Information
          </h3>
        </div>
        <div className="p-3">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="font-semibold w-24 py-1">Customer:</td>
                <td className="py-1">{getCustomerName(sale.customer)}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Address:</td>
                <td className="py-1">{customer?.address || "N/A"}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Phone:</td>
                <td className="py-1">{customer?.phone || "N/A"}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Email:</td>
                <td className="py-1">{customer?.email || "N/A"}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Salesman:</td>
                <td className="py-1">{getEmployeeName(sale.sold_by)}</td>
              </tr>
            </tbody>
          </table>
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
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
            Previous Balance
          </p>
          <p className="text-amber-600">
            {formatCurrency(previousBalance)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Current Balance
          </p>
          <p className={`${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(currentBalance)}
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
                  Sl
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Part no
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Brand
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Product name
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  ×
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Qty
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Mrp (inr)
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  %
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Price
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Total
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center text-emerald-300">
                  Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item, idx) => {
                  const partNumber = getProductPartNumber(item);
                  const brandName = getProductBrand(item);
                  const productName = getProductName(item);
                  const mrp = parseFloat(item.mrp_inr || 0);
                  const price = parseFloat(item.unit_price_bdt || 0);
                  const percentage = calculatePercentage(mrp, price);
                  const multiplier = getMultiplierDisplay(item);
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-left text-xs">
                        <div className="font-bold text-gray-800">
                          {partNumber}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-700">
                        {brandName}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="text-xs font-bold text-gray-800">
                          {productName}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono font-medium">{multiplier}</span>
                          <FiTrendingUp className="text-gray-400" size={10} />
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs">
                        {mrp ? formatCurrency(mrp) : "—"}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold">
                        {percentage ? percentage + "%" : "—"}
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
                  <td colSpan="11" className="border border-gray-300 px-3 py-6 text-center text-gray-400 text-sm">
                    No products in this sale.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan="9" className="border border-gray-300 px-2 py-1.5 text-right text-xs uppercase text-gray-600">
                  Subtotal
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono">
                  {formatCurrency(totals.subtotal)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
              </tr>
              {totals.discount > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan="9" className="border border-gray-300 px-2 py-1.5 text-right text-xs uppercase text-red-600">
                    Discount
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-red-600">
                    -{formatCurrency(totals.discount)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5"></td>
                </tr>
              )}
              <tr className="bg-green-50">
                <td colSpan="9" className="border border-gray-300 px-2 py-1.5 text-right text-sm uppercase text-green-700">
                  Grand Total
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-base text-green-700">
                  {formatCurrency(totals.total)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
              </tr>
              <tr className="bg-amber-50">
                <td colSpan="9" className="border border-gray-300 px-2 py-1.5 text-right text-xs text-amber-700">
                  Previous Balance
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-amber-700">
                  {formatCurrency(previousBalance)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
              </tr>
              <tr className="bg-blue-50">
                <td colSpan="9" className="border border-gray-300 px-2 py-1.5 text-right text-xs text-blue-700">
                  Paid
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-blue-700">
                  {formatCurrency(paid)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
              </tr>
              <tr className={`${currentBalance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <td colSpan="9" className={`border border-gray-300 px-2 py-1.5 text-right text-sm uppercase ${currentBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  Current Balance
                </td>
                <td className={`border border-gray-300 px-2 py-1.5 text-right font-mono text-base ${currentBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatCurrency(currentBalance)}
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