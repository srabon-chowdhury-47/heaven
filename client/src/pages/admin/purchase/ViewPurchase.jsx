import { useState, useEffect } from "react";
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
  FiFile,
} from "react-icons/fi";
import * as XLSX from "xlsx"; // <-- new import

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

export default function ViewPurchase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState(null);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false); // <-- new state

  useEffect(() => {
    fetchPurchaseData();
  }, [id]);

  const fetchPurchaseData = async () => {
    try {
      setLoading(true);
      const [purRes, prodRes, brandRes, supRes, empRes, usersRes] = await Promise.all([
        axiosInstance.get(`purchase/purchases/${id}/`),
        axiosInstance.get("products/"),
        axiosInstance.get("brand/brands/"),
        axiosInstance.get("supplier/suppliers/"),
        axiosInstance.get("person/employees/"),
        axiosInstance.get("users/users/"),
      ]);

      setPurchase(purRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setBrands(brandRes.data.results || brandRes.data);
      setSuppliers(supRes.data.results || supRes.data);
      setEmployees(empRes.data.results || empRes.data);
      setUsers(usersRes.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to fetch purchase details.");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions (same as before)
  const getSupplierName = (id) => {
    if (!id) return "Unknown Supplier";
    const sup = suppliers.find((s) => String(s.id) === String(id));
    return sup ? sup.name || sup.company_name : "Unknown Supplier";
  };

  const getSupplierDetails = (id) => {
    if (!id) return null;
    return suppliers.find((s) => String(s.id) === String(id));
  };

  const getSupplierAddress = (supplier) => {
    if (!supplier) return "N/A";
    const parts = [];
    if (supplier.town_village) parts.push(supplier.town_village);
    if (supplier.district) parts.push(supplier.district);
    if (supplier.division) parts.push(supplier.division);
    if (parts.length === 0 && supplier.address) parts.push(supplier.address);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const getSupplierPhone = (supplier) => {
    if (!supplier) return "N/A";
    return supplier.mobile1 || supplier.phone || "N/A";
  };

  const getEmployeeName = (id) => {
    if (!id) return "Unknown";

    const user = users.find((u) => String(u.id) === String(id));
    if (user) {
      return user.full_name || user.username || `User #${user.id}`;
    }

    const emp = employees.find((e) => String(e.id) === String(id));
    if (!emp) return "Unknown";
    return emp.first_name
      ? `${emp.first_name} ${emp.last_name || ""}`.trim()
      : emp.full_name || emp.name || emp.employee_id;
  };

  const getProductDetails = (item) => {
    if (!item) return null;
    let product = products.find((p) => String(p.id) === String(item.product));
    if (!product && item.product_name) {
      product = products.find((p) => p.product_name === item.product_name);
    }
    return product || null;
  };

  const getProductPartNumber = (item) => {
    const product = getProductDetails(item);
    return product?.part_number || "N/A";
  };

  const getProductBrand = (item) => {
    const product = getProductDetails(item);
    if (!product) return "N/A";
    const brand = brands.find((b) => String(b.id) === String(product.brand));
    return brand?.name || "N/A";
  };

  const getProductName = (item) => {
    if (!item) return "Unknown Product";
    const product = getProductDetails(item);
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

  const hasBalanceFields =
    purchase &&
    (purchase.previous_balance !== undefined || purchase.paid_amount !== undefined);

  const calculateTotals = () => {
    if (!purchase) return { subtotal: 0, total: 0, discount: 0 };
    const items = purchase.items || [];
    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.total_cost_bdt || 0),
      0
    );
    const discount = parseFloat(purchase.discount_amount || 0);
    const total =
      purchase.total_amount !== undefined && purchase.total_amount !== null
        ? parseFloat(purchase.total_amount)
        : subtotal - discount;
    return { subtotal, discount, total };
  };

  // ── Export to Excel ──
  const handleExportExcel = () => {
    if (typeof XLSX === "undefined") {
      alert("Excel export library not loaded. Please install xlsx and try again.");
      return;
    }

    setExporting(true);

    try {
      const totals = calculateTotals();
      const supplier = getSupplierDetails(purchase?.supplier);
      const previousBalance = hasBalanceFields ? parseFloat(purchase?.previous_balance || 0) : 0;
      const paid = hasBalanceFields
        ? purchase?.payment_status === "Paid"
          ? totals.total
          : parseFloat(purchase?.paid_amount || 0)
        : 0;
      const currentBalance = previousBalance + (totals.total - paid);

      // Build rows as 2D array
      const rows = [];

      // ── Company Header ──
      rows.push([COMPANY.name.toUpperCase()]);
      rows.push([COMPANY.addressLine1]);
      rows.push([COMPANY.phone]);
      rows.push([COMPANY.email]);
      rows.push([]); // blank line

      // ── Purchase Bill Title ──
      rows.push(["PURCHASE BILL"]);
      rows.push([
        `PO No: ${purchase?.po_number || "N/A"}`,
        `Invoice: ${purchase?.invoice_number || "N/A"}`,
        `Date: ${formatDateShort(purchase?.purchase_date)}`,
      ]);
      rows.push([]);

      // ── Supplier Info ──
      rows.push(["Supplier Information"]);
      rows.push([`Supplier: ${getSupplierName(purchase?.supplier)}`]);
      rows.push([`Address: ${supplier ? getSupplierAddress(supplier) : "N/A"}`]);
      rows.push([`Phone: ${supplier ? getSupplierPhone(supplier) : "N/A"}`]);
      rows.push([`Email: ${supplier?.email || "N/A"}`]);
      rows.push([`Entry By: ${getEmployeeName(purchase?.entry_by)}`]);
      rows.push([]);

      // ── Products Table Headers ──
      const headers = ["Sl", "Part No.", "Brand", "Product Name", "Qty", "Unit Cost", "Total"];
      rows.push(headers);

      // ── Product Rows ──
      (purchase?.items || []).forEach((item, idx) => {
        const partNumber = getProductPartNumber(item);
        const brandName = getProductBrand(item);
        const productName = getProductName(item);
        const price = parseFloat(item.unit_cost_bdt || 0);
        const total = parseFloat(item.total_cost_bdt || 0);
        rows.push([
          idx + 1,
          partNumber,
          brandName,
          productName,
          item.quantity,
          price,
          total,
        ]);
      });

      // ── Totals ──
      rows.push([]);
      const subtotalRow = ["", "", "", "", "", "Subtotal", totals.subtotal];
      rows.push(subtotalRow);
      if (totals.discount > 0) {
        rows.push(["", "", "", "", "", "Discount", -totals.discount]);
      }
      const grandTotalRow = ["", "", "", "", "", "Grand Total", totals.total];
      rows.push(grandTotalRow);

      // ── Balance Fields (if any) ──
      if (hasBalanceFields) {
        rows.push(["", "", "", "", "", "Previous Balance", previousBalance]);
        rows.push(["", "", "", "", "", "Paid", paid]);
        rows.push(["", "", "", "", "", "Current Balance", currentBalance]);
      }

      rows.push([]);
      // ── Remarks ──
      if (purchase?.remarks) {
        rows.push([`Remarks: ${purchase.remarks}`]);
        rows.push([]);
      }

      // ── Footer ──
      rows.push(["✓ Goods received in good condition."]);
      rows.push(["** This is a system generated bill, seal & sign are not mandatory. **"]);

      // Create workbook and sheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // ── Column widths ──
      ws["!cols"] = [
        { wch: 8 },   // Sl
        { wch: 18 },  // Part No.
        { wch: 15 },  // Brand
        { wch: 40 },  // Product Name
        { wch: 10 },  // Qty
        { wch: 15 },  // Unit Cost
        { wch: 18 },  // Total
      ];

      // ── Number formatting for currency columns ──
      // We'll set cell formatting for columns F and G (0-indexed: 5 and 6)
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (!cell) continue;
          // If the cell contains a number, format as currency (2 decimals)
          if (typeof cell.v === "number") {
            cell.z = "#,##0.00"; // number format
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Purchase");
      const fileName = `Purchase_${purchase?.po_number || "bill"}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Print bill (unchanged)
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
      const supplier = getSupplierDetails(purchase?.supplier);

      const previousBalance = hasBalanceFields
        ? parseFloat(purchase?.previous_balance || 0)
        : 0;
      const paid = hasBalanceFields
        ? purchase?.payment_status === "Paid"
          ? totals.total
          : parseFloat(purchase?.paid_amount || 0)
        : 0;
      const due = totals.total - paid;
      const currentBalance = previousBalance + due;

      WinPrint.document.write(`
        <html>
          <head>
            <title>Purchase Bill #${purchase?.po_number || purchase?.invoice_number || "N/A"}</title>
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
              .col-sl { width: 5%; text-align: center; }
              .col-part-no { width: 15%; text-align: center; }
              .col-brand { width: 12%; text-align: center; }
              .col-part-name { width: 33%; text-align: center; }
              .col-qty { width: 10%; text-align: center; }
              .col-price { width: 12%; text-align: center; }
              .col-total { width: 13%; text-align: center; }
              td.num { text-align: right; }
              td.ctr { text-align: center; }
              td.part-no { text-align: left; }
              .item-name { font-weight: normal; }
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
                  <div class="title">PURCHASE BILL</div>
                  <div class="boxed"><b>PO No:</b> ${purchase?.po_number || "N/A"}</div>
                  ${
                    purchase?.invoice_number
                      ? `<div class="boxed"><b>Invoice:</b> ${purchase.invoice_number}</div>`
                      : ""
                  }
                  <div class="boxed"><b>Date:</b> ${formatDateShort(purchase?.purchase_date)}</div>
                </div>
              </div>

              <table class="customer-info">
                <tr>
                  <td class="label">Supplier:</td>
                  <td colspan="3">${getSupplierName(purchase?.supplier)}</td>
                </tr>
                <tr>
                  <td class="label">Address:</td>
                  <td colspan="3">${supplier ? getSupplierAddress(supplier) : "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Phone:</td>
                  <td colspan="3">${supplier ? getSupplierPhone(supplier) : "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td colspan="3">${supplier?.email || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Entry By:</td>
                  <td colspan="3">${getEmployeeName(purchase?.entry_by)}</td>
                </tr>
              </table>

              <table class="items">
                <thead>
                  <tr>
                    <th class="col-sl">Sl</th>
                    <th class="col-part-no">Part no.</th>
                    <th class="col-brand">Brand</th>
                    <th class="col-part-name">Product name</th>
                    <th class="col-qty">Qty</th>
                    <th class="col-price">Unit Cost</th>
                    <th class="col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${purchase?.items?.map((item, index) => {
                    const price = parseFloat(item.unit_cost_bdt || 0);
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
                    <td class="ctr">${item.quantity}</td>
                    <td class="num">${formatNumber(price)}</td>
                    <td class="num">${formatNumber(item.total_cost_bdt)}</td>
                  </tr>
                  `;
                  }).join("") || '<tr><td colspan="7" style="text-align:center;">No items found</td></tr>'}
                  <tr>
                    <td colspan="5" rowspan="${
                      hasBalanceFields ? (totals.discount > 0 ? 6 : 5) : (totals.discount > 0 ? 3 : 2)
                    }" class="words-cell" style="vertical-align:bottom; padding: 8px;">
                      <b>Amount In Words:</b> BDT ${numberToWords(totals.total)} Only
                    </td>
                    <td colspan="1" class="totals-label">Total</td>
                    <td class="num" style="font-weight:normal;">${formatNumber(totals.subtotal)}</td>
                  </tr>
                  ${totals.discount > 0 ? `
                  <tr>
                    <td colspan="1" class="totals-label">Less/Add.</td>
                    <td class="num" style="font-weight:normal;">${formatNumber(totals.discount)}</td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td colspan="1" class="totals-label">Grand Total</td>
                    <td class="num" style="font-weight:normal;">${formatNumber(totals.total)}</td>
                  </tr>
                  ${hasBalanceFields ? `
                  <tr>
                    <td colspan="1" class="balance-label">Prev. Balance</td>
                    <td class="num balance-value" style="font-weight:normal;">${formatNumber(previousBalance)}</td>
                  </tr>
                  <tr>
                    <td colspan="1" class="balance-label">Paid</td>
                    <td class="num balance-value" style="font-weight:normal;">${formatNumber(paid)}</td>
                  </tr>
                  <tr>
                    <td colspan="1" class="balance-label">Curr. Balance</td>
                    <td class="num balance-value" style="font-weight:normal;">
                      ${formatNumber(currentBalance)}
                    </td>
                  </tr>
                  ` : ""}
                </tbody>
              </table>

              <div class="received-note">✓ Goods received in good condition.</div>

              ${purchase?.remarks ? `<div class="vat-note"><b>Remarks:</b> ${purchase.remarks}</div>` : ""}
              <div class="vat-note"></div>

              <div class="terms">
                <div class="terms-title">Terms &amp; Conditions:</div>
                <ol>
                  <li>Goods once received will be checked against this bill for discrepancies.</li>
                </ol>
              </div>

              <div class="system-note">
                ** This is a system generated bill, seal &amp; sign are not mandatory. **
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
          <div className="animate-pulse text-gray-400">Loading purchase details...</div>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white border border-red-300 p-8 text-center">
          <p className="text-red-600">{error || "Purchase not found"}</p>
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
  const supplier = getSupplierDetails(purchase.supplier);
  const previousBalance = hasBalanceFields ? parseFloat(purchase?.previous_balance || 0) : 0;
  const paid = hasBalanceFields
    ? purchase?.payment_status === "Paid"
      ? totals.total
      : parseFloat(purchase?.paid_amount || 0)
    : 0;
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
              Purchase Details
            </h1>
            <p className="text-xs text-gray-500">
              PO #{purchase.po_number}
              {purchase.invoice_number ? ` · Invoice #${purchase.invoice_number}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition disabled:opacity-50"
          >
            <FiFile />
            {exporting ? "Exporting..." : "Export to Excel"}
          </button>
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

      {/* Supplier Info Table - Half Width */}
      <div className="bg-white border border-gray-300 overflow-hidden mb-4 max-w-md">
        <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <FiUser /> Supplier Information
          </h3>
        </div>
        <div className="p-3">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="font-semibold w-24 py-1">Supplier:</td>
                <td className="py-1">{getSupplierName(purchase.supplier)}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Address:</td>
                <td className="py-1">{supplier ? getSupplierAddress(supplier) : "N/A"}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Phone:</td>
                <td className="py-1">{supplier ? getSupplierPhone(supplier) : "N/A"}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Email:</td>
                <td className="py-1">{supplier?.email || "N/A"}</td>
              </tr>
              <tr>
                <td className="font-semibold w-24 py-1">Entry By:</td>
                <td className="py-1">{getEmployeeName(purchase.entry_by)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiUser size={12} /> Supplier
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {getSupplierName(purchase.supplier)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiUserCheck size={12} /> Entry By
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {getEmployeeName(purchase.entry_by)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiCalendar size={12} /> Date
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {formatDate(purchase.purchase_date)}
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
            purchase.payment_status === 'Paid' ? 'bg-green-100' :
            purchase.payment_status === 'Partial' ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            {purchase.payment_status === 'Paid' ? <FiCheckCircle className="text-green-600" size={20} /> :
             purchase.payment_status === 'Partial' ? <FiClock className="text-amber-600" size={20} /> :
             <FiXCircle className="text-red-600" size={20} />}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Payment Status
            </p>
            <p className={`font-bold ${
              purchase.payment_status === 'Paid' ? 'text-green-600' :
              purchase.payment_status === 'Partial' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {purchase.payment_status || "Unpaid"}
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
        {hasBalanceFields ? (
          <>
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
          </>
        ) : (
          <div className="bg-white border border-gray-300 p-3 sm:col-span-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Invoice #
            </p>
            <p className="text-sm font-bold text-gray-800 truncate">
              {purchase.invoice_number || "—"}
            </p>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white border border-gray-300 overflow-hidden mb-4">
        <div className="border-b border-gray-300 px-3 py-2 bg-gray-50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <FiPackage /> Products Purchased
          </h3>
          <span className="text-xs text-gray-500">
            {purchase.items?.length || 0} items
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
                  Qty
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Unit Cost
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {purchase.items && purchase.items.length > 0 ? (
                purchase.items.map((item, idx) => {
                  const partNumber = getProductPartNumber(item);
                  const brandName = getProductBrand(item);
                  const productName = getProductName(item);
                  const price = parseFloat(item.unit_cost_bdt || 0);
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
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs">
                        {formatCurrency(price)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-xs text-gray-800">
                        {formatCurrency(item.total_cost_bdt)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="border border-gray-300 px-3 py-6 text-center text-gray-400 text-sm">
                    No products in this purchase.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan="6" className="border border-gray-300 px-2 py-1.5 text-right text-xs uppercase text-gray-600">
                  Subtotal
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono">
                  {formatCurrency(totals.subtotal)}
                </td>
              </tr>
              {totals.discount > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan="6" className="border border-gray-300 px-2 py-1.5 text-right text-xs uppercase text-red-600">
                    Discount
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-red-600">
                    -{formatCurrency(totals.discount)}
                  </td>
                </tr>
              )}
              <tr className="bg-green-50">
                <td colSpan="6" className="border border-gray-300 px-2 py-1.5 text-right text-sm uppercase text-green-700">
                  Grand Total
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-base text-green-700">
                  {formatCurrency(totals.total)}
                </td>
              </tr>
              {hasBalanceFields && (
                <>
                  <tr className="bg-amber-50">
                    <td colSpan="6" className="border border-gray-300 px-2 py-1.5 text-right text-xs text-amber-700">
                      Previous Balance
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-amber-700">
                      {formatCurrency(previousBalance)}
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td colSpan="6" className="border border-gray-300 px-2 py-1.5 text-right text-xs text-blue-700">
                      Paid
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-blue-700">
                      {formatCurrency(paid)}
                    </td>
                  </tr>
                  <tr className={`${currentBalance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <td colSpan="6" className={`border border-gray-300 px-2 py-1.5 text-right text-sm uppercase ${currentBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      Current Balance
                    </td>
                    <td className={`border border-gray-300 px-2 py-1.5 text-right font-mono text-base ${currentBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {formatCurrency(currentBalance)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Remarks */}
      {purchase.remarks && (
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Remarks
          </p>
          <p className="text-sm text-gray-700">{purchase.remarks}</p>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back to Purchases
        </button>
        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition disabled:opacity-50"
        >
          <FiFile />
          {exporting ? "Exporting..." : "Export to Excel"}
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