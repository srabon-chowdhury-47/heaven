import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import {
  FiArrowLeft,
  FiPrinter,
  FiFileText,
  FiUserCheck,
  FiCalendar,
  FiDollarSign,
  FiPackage,
  FiFile,
} from "react-icons/fi";
import * as XLSX from "xlsx";

// ── Company info shown on the printed bill ──
const COMPANY = {
  name: "Heaven Autos",
  addressLine1: "77.R.N.Road, Noldanga Road (Heaven Building), Jashore-7400,",
  addressLine2: "Address Line 2,",
  addressLine3: "City, Bangladesh",
  phone: "Tel 0421-66095, Mob 01924-331354, 01711-355328, 01778-117515",
  email: "Email: heavenautojessore@gmail.com Website: www.heavenautos.com.bd",
};

// ── Calculation Helpers (mirroring AddDraftPurchase) ──
const calcCurrentRate = (unitCost, discountPct) => {
  const cost = parseFloat(unitCost) || 0;
  const disc = parseFloat(discountPct) || 0;
  return cost - (cost * disc) / 100;
};

const calcNetDuty = (weight, duty) => {
  const w = parseFloat(weight) || 0;
  const d = parseFloat(duty) || 0;
  return w > 0 ? w * d : d;
};

const calcCost = (unitCost, discountPct, weight, duty) => {
  const currentRate = calcCurrentRate(unitCost, discountPct);
  const netDuty = calcNetDuty(weight, duty);
  return currentRate + netDuty;
};

// ── Convert amount to words ──
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

export default function ViewDraftPurchase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [draft, setDraft] = useState(null);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchDraftData();
  }, [id]);

  const fetchDraftData = async () => {
    try {
      setLoading(true);
      const [draftRes, prodRes, brandRes, empRes, usersRes] = await Promise.all([
        axiosInstance.get(`draft-purchase/draft-orders/${id}/`),
        axiosInstance.get("products/"),
        axiosInstance.get("brand/brands/"),
        axiosInstance.get("person/employees/"),
        axiosInstance.get("users/users/"),
      ]);

      setDraft(draftRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setBrands(brandRes.data.results || brandRes.data);
      setEmployees(empRes.data.results || empRes.data);
      setUsers(usersRes.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to fetch draft details.");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
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

  const getProductWeight = (item) => {
    const product = getProductDetails(item);
    return product?.weight || 0;
  };

  const getProductHsCode = (item) => {
    const product = getProductDetails(item);
    return product?.hs_code || "N/A";
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
    return ` ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatNumber = (amount) => {
    return parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateTotals = () => {
  if (!draft) return { total: 0, totalMrp: 0 };
  const items = draft.items || [];
  let totalCost = 0;
  let totalMrp = 0;
  items.forEach((item) => {
    const unitCost = parseFloat(item.unit_cost_bdt || 0);
    const discount = parseFloat(item.discount || 0);
    const duty = parseFloat(item.duty || 0);
    const qty = parseFloat(item.quantity) || 0;
    // Use the same helper functions as the rows
    const weight = getProductWeight(item);        // gets weight from product list
    const currentRate = calcCurrentRate(unitCost, discount);
    const netDuty = calcNetDuty(weight, duty);
    const cost = calcCost(unitCost, discount, weight, duty);
    totalCost += cost * qty;
    totalMrp += unitCost * qty;
  });
  return { total: totalCost, totalMrp };
};

  // ── Export to Excel (only table data) ──
  const handleExportExcel = () => {
    if (typeof XLSX === "undefined") {
      alert("Excel export library not loaded.");
      return;
    }

    setExporting(true);

    try {
      // Build rows: headers + product rows
      const rows = [];

      // Headers
      const headers = [
        "Sl", "Part No.", "Brand", "Product Name",
        "Weight (kg)", "HS Code",
        "Unit Cost", "Discount %", "Current Rate",
        "Duty", "Net Duty", "Cost",
        "Qty", "Total Cost", "Total MRP"
      ];
      rows.push(headers);

      // Product rows
      (draft?.items || []).forEach((item, idx) => {
        const partNumber = getProductPartNumber(item);
        const brandName = getProductBrand(item);
        const productName = getProductName(item);
        const weight = getProductWeight(item);
        const hsCode = getProductHsCode(item);

        const unitCost = parseFloat(item.unit_cost_bdt || 0);
        const discount = parseFloat(item.discount || 0);
        const duty = parseFloat(item.duty || 0);
        const qty = parseFloat(item.quantity) || 0;

        const currentRate = calcCurrentRate(unitCost, discount);
        const netDuty = calcNetDuty(weight, duty);
        const cost = calcCost(unitCost, discount, weight, duty);
        const totalCost = cost * qty;
        const totalMrp = unitCost * qty;

        rows.push([
          idx + 1,
          partNumber,
          brandName,
          productName,
          weight,
          hsCode,
          unitCost,
          discount,
          currentRate,
          duty,
          netDuty,
          cost,
          qty,
          totalCost,
          totalMrp,
        ]);
      });

      // If no items, still export headers only
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Set column widths
      ws["!cols"] = [
        { wch: 6 },   // Sl
        { wch: 16 },  // Part No.
        { wch: 14 },  // Brand
        { wch: 30 },  // Product Name
        { wch: 12 },  // Weight
        { wch: 14 },  // HS Code
        { wch: 14 },  // Unit Cost
        { wch: 12 },  // Discount %
        { wch: 14 },  // Current Rate
        { wch: 10 },  // Duty
        { wch: 12 },  // Net Duty
        { wch: 12 },  // Cost
        { wch: 10 },  // Qty
        { wch: 16 },  // Total Cost
        { wch: 16 },  // Total MRP
      ];

      // Apply number formatting to numeric cells
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (!cell) continue;
          if (typeof cell.v === "number") {
            cell.z = "#,##0.00";
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "DraftPurchaseItems");
      const fileName = `DraftPurchase_Items_${draft?.draft_number || "draft"}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel.");
    } finally {
      setExporting(false);
    }
  };

  // ── Print Bill ──
  const handlePrint = async () => {
    setPrinting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const WinPrint = window.open("", "", "width=900,height=650");

      if (!WinPrint) {
        alert("Please allow pop-ups to print.");
        setPrinting(false);
        return;
      }

      const totals = calculateTotals();

      WinPrint.document.write(`
        <html>
          <head>
            <title>Draft Purchase #${draft?.draft_number || "N/A"}</title>
            <style>
              @page { size: A4; margin: 8mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 11px;
                color: #000;
                background: #fff;
                padding: 8px;
              }
              .invoice-container { max-width: 900px; margin: 0 auto; padding: 5px; }
              .top-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
                width: 100%;
              }
              .company-block { flex: 1; }
              .company-block .logo {
                font-size: 28px;
                font-weight: bold;
                font-style: italic;
                letter-spacing: 1px;
                margin-bottom: 6px;
              }
              .company-block .company-name { font-weight: bold; font-size: 13px; margin-bottom: 2px; }
              .company-block .company-line { font-size: 10px; line-height: 1.4; }
              .invoice-box { text-align: left; min-width: 180px; margin-left: 20px; }
              .invoice-box .title { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
              .invoice-box .boxed {
                border: 1px solid #000;
                padding: 2px 6px;
                font-size: 11px;
                margin-bottom: 3px;
                width: 100%;
              }
              table.entry-info {
                width: 50%;
                border-collapse: collapse;
                margin-bottom: 12px;
                border: 1px solid #000;
                font-size: 10px;
              }
              table.entry-info td {
                border: 1px solid #000;
                padding: 2px 6px;
                font-size: 10px;
              }
              table.entry-info .label { font-weight: bold; width: 25%; }
              table.items {
                width: 100%;
                border-collapse: collapse;
                font-size: 9px;
                border: 1px solid #000;
                table-layout: fixed;
              }
              table.items th,
              table.items td {
                border: 1px solid #000;
                padding: 3px 4px;
                vertical-align: middle;
                word-wrap: break-word;
              }
              table.items th {
                font-weight: bold;
                text-align: center;
                background: #f0f0f0;
                text-transform: capitalize;
                font-size: 8px;
              }
              .col-sl { width: 4%; text-align: center; }
              .col-part-no { width: 12%; text-align: center; }
              .col-brand { width: 10%; text-align: center; }
              .col-part-name { width: 18%; text-align: center; }
              .col-weight { width: 6%; text-align: center; }
              .col-hs { width: 9%; text-align: center; }
              .col-unit-cost { width: 8%; text-align: center; }
              .col-discount { width: 6%; text-align: center; }
              .col-current-rate { width: 8%; text-align: center; }
              .col-duty { width: 6%; text-align: center; }
              .col-net-duty { width: 8%; text-align: center; }
              .col-cost { width: 8%; text-align: center; }
              .col-qty { width: 5%; text-align: center; }
              .col-total-cost { width: 8%; text-align: center; }
              .col-total-mrp { width: 8%; text-align: center; }
              td.num { text-align: right; }
              td.ctr { text-align: center; }
              td.part-no { text-align: left; }
              .item-name { font-weight: normal; }
              .words-cell {
                font-weight: bold;
                border: 1px solid #000;
                font-size: 10px;
                vertical-align: bottom;
                padding: 6px;
              }
              .totals-label { text-align: right; font-weight: normal; font-size: 11px; }
              .received-note { font-size: 11px; margin: 8px 0 14px; }
              .terms-title { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
              .terms ol { padding-left: 18px; font-size: 10px; line-height: 1.4; }
              .system-note { margin-top: 12px; font-size: 10px; font-style: italic; }
              .grand-total-row { font-weight: bold; background: #f9f9f9; }
              @media print {
                body { padding: 0; margin: 0; }
                .invoice-container { padding: 8px; }
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
                  <div class="title">DRAFT PURCHASE</div>
                  <div class="boxed"><b>Draft #:</b> ${draft?.draft_number || "N/A"}</div>
                  <div class="boxed"><b>Date:</b> ${formatDateShort(draft?.purchase_date)}</div>
                </div>
              </div>

              <table class="entry-info">
                <tr>
                  <td class="label">Entry By:</td>
                  <td colspan="3">${getEmployeeName(draft?.entry_by)}</td>
                </tr>
              </table>

              <table class="items">
                <thead>
                  <tr>
                    <th class="col-sl">Sl</th>
                    <th class="col-part-no">Part No.</th>
                    <th class="col-brand">Brand</th>
                    <th class="col-part-name">Product Name</th>
                    <th class="col-weight">Wt (kg)</th>
                    <th class="col-hs">HS Code</th>
                    <th class="col-unit-cost">Unit Cost</th>
                    <th class="col-discount">Disc %</th>
                    <th class="col-current-rate">Curr Rate</th>
                    <th class="col-duty">Duty</th>
                    <th class="col-net-duty">Net Duty</th>
                    <th class="col-cost">Cost</th>
                    <th class="col-qty">Qty</th>
                    <th class="col-total-cost">Total Cost</th>
                    <th class="col-total-mrp">Total MRP</th>
                  </tr>
                </thead>
                <tbody>
                  ${draft?.items?.map((item, index) => {
                    const partNumber = getProductPartNumber(item);
                    const brandName = getProductBrand(item);
                    const productName = getProductName(item);
                    const weight = getProductWeight(item);
                    const hsCode = getProductHsCode(item);
                    const unitCost = parseFloat(item.unit_cost_bdt || 0);
                    const discount = parseFloat(item.discount || 0);
                    const duty = parseFloat(item.duty || 0);
                    const qty = parseFloat(item.quantity) || 0;
                    const currentRate = calcCurrentRate(unitCost, discount);
                    const netDuty = calcNetDuty(weight, duty);
                    const cost = calcCost(unitCost, discount, weight, duty);
                    const totalCost = cost * qty;
                    const totalMrp = unitCost * qty;
                    return `
                  <tr>
                    <td class="ctr">${index + 1}</td>
                    <td class="part-no" style="font-size:10px;">${partNumber}</td>
                    <td class="ctr" style="font-size:10px;">${brandName}</td>
                    <td><span class="item-name">${productName}</span></td>
                    <td class="ctr">${weight}</td>
                    <td class="ctr" style="font-size:9px;">${hsCode}</td>
                    <td class="num">${formatNumber(unitCost)}</td>
                    <td class="num">${discount}</td>
                    <td class="num">${formatNumber(currentRate)}</td>
                    <td class="num">${formatNumber(duty)}</td>
                    <td class="num">${formatNumber(netDuty)}</td>
                    <td class="num">${formatNumber(cost)}</td>
                    <td class="ctr">${qty}</td>
                    <td class="num">${formatNumber(totalCost)}</td>
                    <td class="num">${formatNumber(totalMrp)}</td>
                  </tr>
                  `;
                  }).join("") || '<tr><td colspan="15" style="text-align:center;">No items found</td></tr>'}
                  <tr class="grand-total-row">
                    <td colspan="13" class="words-cell">
                      <b>Amount In Words:</b> BDT ${numberToWords(totals.total)} Only
                    </td>
                    <td class="num" style="font-weight:bold; font-size:14px;">${formatNumber(totals.total)}</td>
                    <td class="num" style="font-weight:bold; font-size:14px;">${formatNumber(totals.totalMrp)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="received-note">✓ This is a draft purchase estimate. No stock impact.</div>

              ${draft?.remarks ? `<div style="margin-bottom:6px;"><b>Remarks:</b> ${draft.remarks}</div>` : ""}

              <div class="terms">
                <div class="terms-title">Terms &amp; Conditions:</div>
                <ol>
                  <li>This is a draft for estimation purposes only.</li>
                  <li>Final purchase will be processed separately.</li>
                </ol>
              </div>

              <div class="system-note">
                ** System generated draft – seal &amp; sign not required. **
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
      alert("Failed to generate print preview.");
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white border border-gray-300 p-8 text-center">
          <div className="animate-pulse text-gray-400">Loading draft details...</div>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white border border-red-300 p-8 text-center">
          <p className="text-red-600">{error || "Draft not found"}</p>
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
    <div className="max-w-7xl mx-auto p-3">
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
              Product Order Sheet
            </h1>
            <p className="text-xs text-gray-500">Draft #{draft.draft_number}</p>
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
            {printing ? "Preparing..." : "Print / PDF"}
          </button>
        </div>
      </div>

      {/* Entry Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiUserCheck size={12} /> Entry By
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {getEmployeeName(draft.entry_by)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiCalendar size={12} /> Date
          </p>
          <p className="text-sm font-bold text-gray-800 truncate">
            {formatDate(draft.purchase_date)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiDollarSign size={12} /> Total Cost
          </p>
          <p className="text-sm font-bold text-green-600 truncate">
            {formatCurrency(totals.total)}
          </p>
        </div>
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <FiDollarSign size={12} /> Total MRP
          </p>
          <p className="text-sm font-bold text-blue-600 truncate">
            {formatCurrency(totals.totalMrp)}
          </p>
        </div>
      </div>

      {/* Products Table with all fields */}
      <div className="bg-white border border-gray-300 overflow-hidden mb-4">
        <div className="border-b border-gray-300 px-3 py-2 bg-gray-50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <FiPackage /> Products in Draft
          </h3>
          <span className="text-xs text-gray-500">
            {draft.items?.length || 0} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Sl</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Part No.</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Brand</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Product Name</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Weight (kg)</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">HS Code</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Unit Cost</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Disc %</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Curr Rate</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Duty</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Net Duty</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Cost</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Qty</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Total Cost</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Total MRP</th>
              </tr>
            </thead>
            <tbody>
              {draft.items && draft.items.length > 0 ? (
                draft.items.map((item, idx) => {
                  const partNumber = getProductPartNumber(item);
                  const brandName = getProductBrand(item);
                  const productName = getProductName(item);
                  const weight = getProductWeight(item);
                  const hsCode = getProductHsCode(item);
                  const unitCost = parseFloat(item.unit_cost_bdt || 0);
                  const discount = parseFloat(item.discount || 0);
                  const duty = parseFloat(item.duty || 0);
                  const qty = parseFloat(item.quantity) || 0;
                  const currentRate = calcCurrentRate(unitCost, discount);
                  const netDuty = calcNetDuty(weight, duty);
                  const cost = calcCost(unitCost, discount, weight, duty);
                  const totalCost = cost * qty;
                  const totalMrp = unitCost * qty;

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">{idx + 1}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-left text-xs font-mono text-blue-700">{partNumber}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-700">{brandName}</td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="text-xs font-semibold text-gray-800">{productName}</div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">{weight}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">{hsCode}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs">{formatCurrency(unitCost)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">{discount}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs">{formatCurrency(currentRate)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">{duty}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs">{formatCurrency(netDuty)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs font-semibold text-gray-800">{formatCurrency(cost)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold">{qty}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-gray-800">{formatCurrency(totalCost)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-gray-600">{formatCurrency(totalMrp)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="15" className="border border-gray-300 px-3 py-6 text-center text-gray-400 text-sm">
                    No products in this draft.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-green-50">
                <td colSpan="13" className="border border-gray-300 px-2 py-1.5 text-right text-sm uppercase text-green-700 font-bold">
                  Grand Total Cost
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-base text-green-700 font-bold">
                  {formatCurrency(totals.total)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-base text-blue-600 font-bold">
                  {formatCurrency(totals.totalMrp)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Remarks */}
      {draft.remarks && (
        <div className="bg-white border border-gray-300 p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Remarks</p>
          <p className="text-sm text-gray-700">{draft.remarks}</p>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back to Drafts
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