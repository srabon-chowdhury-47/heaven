import React, { useState, useEffect, useMemo } from "react";
import axios from "../../../api/axios";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiPrinter,
  FiUsers,
  FiUser,
  FiDollarSign,
  FiArrowUp,
  FiArrowDown,
  FiCalendar,
  FiX,
} from "react-icons/fi";

// ── Company Info for Print ──
const COMPANY = {
  name: "Heaven Autos",
  addressLine1: "77.R.N.Road, Noldanga Road (Heaven Building), Jashore-7400,",
  phone: "Tel 0421-66095, Mob 01924-331354, 01711-355328, 01778-117515",
  email: "heavenautojessore@gmail.com",
};

// Format number with commas (for on‑screen and total rows)
const formatNumber = (amount) => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Format number without commas (for print detail rows)
const formatNumberPlain = (amount) => {
  return (amount || 0).toFixed(2);
};

// Format with currency (for headers only)
const formatAmount = (amount) => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

// Helper: format date with time (for on‑screen view)
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper: short date without time (for print)
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

export default function CustomerLedger() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]); // full list
  const [transactions, setTransactions] = useState([]); // filtered list
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Date filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterApplied, setFilterApplied] = useState(false);

  const navigate = useNavigate();

  // Fetch all customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get("/person/customers/");
        setCustomers(res.data.results || res.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load customers.");
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.proprietor_name?.toLowerCase().includes(term) ||
        c.mobile1?.includes(term) ||
        c.customer_id?.toLowerCase().includes(term) ||
        (c.shop_name && c.shop_name.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Fetch all transactions for a customer (no date filter)
  const fetchAllTransactions = async (customerId) => {
    setLoading(true);
    setError("");
    try {
      const transRes = await axios.get(
        `/customerledger/transactions/customer/${customerId}/transactions/`
      );
      const txns = transRes.data || [];
      setAllTransactions(txns);
      // Apply current filter (if any) after fetching
      applyFilterToTransactions(txns, startDate, endDate);
    } catch (err) {
      setError("Could not load transaction history.");
      setAllTransactions([]);
      setTransactions([]);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  // Apply date filter to a transaction list
  const applyFilterToTransactions = (txns, from, to) => {
    let filtered = txns;
    if (from || to) {
      filtered = txns.filter((t) => {
        const tDate = new Date(t.transaction_date);
        // Normalize to compare dates only (ignore time)
        const tDateStr = tDate.toISOString().split('T')[0];
        if (from && tDateStr < from) return false;
        if (to && tDateStr > to) return false;
        return true;
      });
    }
    setTransactions(filtered);
    if (filtered.length > 0) {
      setBalance(filtered[filtered.length - 1].running_balance);
    } else {
      // If no transactions, we can still show the overall balance from the last of all transactions
      // Or we can set balance to 0, but better to get the latest balance from allTransactions
      if (txns.length > 0) {
        setBalance(txns[txns.length - 1].running_balance);
      } else {
        // Try balance endpoint
        fetchBalanceFallback(selectedCustomer.id);
      }
    }
  };

  // Fallback to balance endpoint if no transactions
  const fetchBalanceFallback = async (customerId) => {
    try {
      const balRes = await axios.get(
        `/customerledger/transactions/customer/${customerId}/balance/`
      );
      const balValue = balRes.data?.balance ?? balRes.data ?? 0;
      setBalance(balValue);
    } catch {
      setBalance(0);
    }
  };

  // Handle customer selection – fetch all transactions
  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setAllTransactions([]);
    setTransactions([]);
    setBalance(null);
    setStartDate("");
    setEndDate("");
    setFilterApplied(false);
    await fetchAllTransactions(customer.id);
  };

  // Apply date filter to already loaded transactions
  const applyFilter = () => {
    if (!selectedCustomer) {
      alert("Please select a customer first.");
      return;
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      alert("From date cannot be later than To date.");
      return;
    }
    setFilterApplied(true);
    applyFilterToTransactions(allTransactions, startDate, endDate);
  };

  // Clear date filter
  const clearFilter = () => {
    setStartDate("");
    setEndDate("");
    setFilterApplied(false);
    // Show all transactions
    setTransactions(allTransactions);
    if (allTransactions.length > 0) {
      setBalance(allTransactions[allTransactions.length - 1].running_balance);
    } else {
      if (selectedCustomer) fetchBalanceFallback(selectedCustomer.id);
    }
  };

  // Re-apply filter when dates change (optional, but we keep manual Apply button)
  // We'll use the Apply button to trigger the filter.

  const totalDebit = transactions
    .filter((t) => t.transaction_type === "DEBIT")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCredit = transactions
    .filter((t) => t.transaction_type === "CREDIT")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Print Function — no time, no color, no reference numbers, only TOTAL row bold with commas
  const handlePrint = () => {
    if (!selectedCustomer || transactions.length === 0) return;

    const printWin = window.open("", "", "width=1000,height=800");

    printWin.document.write(`
      <html>
        <head>
          <title>Customer Ledger - ${selectedCustomer.proprietor_name}</title>
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
            .col-date { width: 14%; text-align: center; }
            .col-desc { width: 41%; text-align: left; }
            .col-debit { width: 13%; text-align: center; }
            .col-credit { width: 13%; text-align: center; }
            .col-balance { width: 14%; text-align: center; }
            td.num { text-align: right; }
            td.ctr { text-align: center; }
            .totals-label {
              text-align: right;
              font-weight: normal;
              font-size: 12px;
              white-space: nowrap;
            }
            .received-note {
              font-size: 12px;
              margin: 10px 0 18px;
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
                <div class="title">CUSTOMER LEDGER</div>
                <div class="boxed"><b>ID:</b> ${selectedCustomer.customer_id}</div>
                <div class="boxed"><b>Printed:</b> ${formatDateShort(new Date())}</div>
                ${filterApplied ? `<div class="boxed"><b>Period:</b> ${startDate ? formatDateShort(startDate) : "Start"} - ${endDate ? formatDateShort(endDate) : "End"}</div>` : ""}
              </div>
            </div>

            <table class="customer-info">
              <tr>
                <td class="label">Customer:</td>
                <td colspan="3">${selectedCustomer.proprietor_name}${selectedCustomer.shop_name ? ` (${selectedCustomer.shop_name})` : ''}</td>
              </tr>
              <tr>
                <td class="label">Customer ID:</td>
                <td colspan="3">${selectedCustomer.customer_id}</td>
              </tr>
              <tr>
                <td class="label">Mobile:</td>
                <td colspan="3">${selectedCustomer.mobile1}</td>
              </tr>
            </table>

            <table class="items">
              <thead>
                <tr>
                  <th class="col-sl">Sl</th>
                  <th class="col-date">Date</th>
                  <th class="col-desc">Description</th>
                  <th class="col-debit">Debit (Dr)</th>
                  <th class="col-credit">Credit (Cr)</th>
                  <th class="col-balance">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map((txn, index) => `
                  <tr>
                    <td class="ctr">${index + 1}</td>
                    <td class="ctr" style="font-size:10px;">${formatDateShort(txn.transaction_date)}</td>
                    <td style="font-size:11px;">
                      ${txn.description || (txn.transaction_type === "DEBIT" ? "Sale" : "Payment")}
                    </td>
                    <td class="num">
                      ${txn.transaction_type === "DEBIT" ? formatNumberPlain(txn.amount) : "-"}
                    </td>
                    <td class="num">
                      ${txn.transaction_type === "CREDIT" ? formatNumberPlain(txn.amount) : "-"}
                    </td>
                    <td class="num">${formatNumberPlain(txn.running_balance)}</td>
                  </tr>
                `).join("")}
                <tr>
                  <td colspan="3" class="totals-label" style="font-weight:bold;">TOTAL</td>
                  <td class="num" style="font-weight:bold;">${formatNumber(totalDebit)}</td>
                  <td class="num" style="font-weight:bold;">${formatNumber(totalCredit)}</td>
                  <td class="num" style="font-weight:bold;">${formatNumber(balance)}</td>
                </tr>
              </tbody>
            </table>

            <div class="received-note"><b>Current Balance: ${formatAmount(balance)}</b></div>

            <div class="system-note">
              ** This is a system generated document, seal &amp; sign are not mandatory. **
            </div>

          </div>
        </body>
      </html>
    `);

    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 300);
  };

  if (loading && customers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
        <div className="p-8 text-center text-gray-400 text-sm">Loading customer database...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white; }
          }
        `}
      </style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FiDollarSign className="text-blue-600" /> Customer Ledger
        </h1>
        {selectedCustomer && transactions.length > 0 && (
          <button
            onClick={handlePrint}
            className="no-print bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-semibold transition flex items-center gap-1.5 border border-blue-700"
          >
            <FiPrinter size={16} /> Print / PDF
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      {/* Search / Customer Selection */}
      <div className="no-print mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" size={14} />
          </div>
          <input
            type="text"
            placeholder="Search by name, mobile, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        {filteredCustomers.length > 0 && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredCustomers.slice(0, 20).map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className={`text-left px-4 py-2 border rounded-md hover:bg-gray-100 transition ${
                  selectedCustomer?.id === customer.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <div className="font-medium">{customer.proprietor_name}</div>
                <div className="text-sm text-gray-500">
                  {customer.customer_id} • {customer.mobile1}
                  {customer.shop_name && ` • ${customer.shop_name}`}
                </div>
              </button>
            ))}
          </div>
        )}
        {filteredCustomers.length === 0 && searchTerm && (
          <p className="mt-2 text-sm text-gray-500">No customers found.</p>
        )}
      </div>

      {/* Date Filter Controls */}
      {selectedCustomer && (
        <div className="no-print mb-4 flex flex-wrap items-center gap-3 p-3 bg-white border border-gray-200 rounded-md">
          <div className="flex items-center gap-2">
            <FiCalendar className="text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={applyFilter}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold transition"
            >
              Apply Filter
            </button>
            {filterApplied && (
              <button
                onClick={clearFilter}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm font-semibold transition flex items-center gap-1"
              >
                <FiX size={14} /> Clear
              </button>
            )}
          </div>
          {filterApplied && (
            <div className="text-xs text-gray-500 ml-2">
              Showing transactions from {startDate ? formatDateShort(startDate) : "beginning"} to {endDate ? formatDateShort(endDate) : "now"}
            </div>
          )}
        </div>
      )}

      {/* Ledger Details */}
      {selectedCustomer && (
        <div>
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-gray-300 mb-4 bg-white">
            <div className="p-2 border-r border-gray-300 flex items-center gap-2">
              <FiArrowDown className="text-red-600 text-lg" />
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Total Debit (Sales)
                </p>
                <p className="text-lg font-bold text-red-700">{formatAmount(totalDebit)}</p>
              </div>
            </div>
            <div className="p-2 border-r border-gray-300 flex items-center gap-2">
              <FiArrowUp className="text-green-600 text-lg" />
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Total Credit (Payments)
                </p>
                <p className="text-lg font-bold text-green-700">{formatAmount(totalCredit)}</p>
              </div>
            </div>
            <div className="p-2 flex items-center gap-2">
              <FiUser className="text-blue-600 text-lg" />
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Current Balance
                </p>
                <p className={`text-lg font-bold ${balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-gray-600"}`}>
                  {balance !== null ? formatAmount(balance) : "—"}
                </p>
                <p className="text-xs text-gray-400">
                  {balance > 0 ? "Overpaid" : balance < 0 ? "Due" : "Settled"}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white border border-gray-300 rounded-md p-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800">
                {selectedCustomer.proprietor_name}
                {selectedCustomer.shop_name && ` (${selectedCustomer.shop_name})`}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedCustomer.customer_id} • {selectedCustomer.mobile1}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Balance</p>
              <p className={`text-sm font-bold ${balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-gray-600"}`}>
                {balance !== null ? formatAmount(balance) : "—"}
              </p>
            </div>
          </div>

          {/* Transaction Table */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && transactions.length === 0 && !error && (
            <p className="text-gray-500 text-center py-8">
              No transactions found for this customer{filterApplied ? " in the selected date range" : ""}.
            </p>
          )}

          {transactions.length > 0 && (
            <div className="bg-white border border-gray-300 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">SL</th>
                      <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">Date</th>
                      <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">Description</th>
                      <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">Debit (Dr) BDT</th>
                      <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">Credit (Cr) BDT</th>
                      <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">Balance BDT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, index) => (
                      <tr key={txn.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-500">{index + 1}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{formatDate(txn.transaction_date)}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-800">
                          {txn.description || (
                            <>
                              {txn.transaction_type === "DEBIT" ? "Sale" : "Payment"}
                              {txn.reference_sale && ` (INV: ${txn.reference_sale})`}
                              {txn.reference_payment && ` (PAY: ${txn.reference_payment})`}
                            </>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-right font-medium text-red-600">
                          {txn.transaction_type === "DEBIT" ? formatNumber(txn.amount) : "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-right font-medium text-green-600">
                          {txn.transaction_type === "CREDIT" ? formatNumber(txn.amount) : "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-right font-semibold">
                          {formatNumber(txn.running_balance)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-200 font-bold">
                      <td colSpan="3" className="border border-gray-300 px-2 py-1.5 text-xs text-right">TOTAL</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-red-600">{formatNumber(totalDebit)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-green-600">{formatNumber(totalCredit)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-right font-bold">{formatNumber(balance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}