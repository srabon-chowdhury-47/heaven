import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { userService } from "../../../api/user";
import {
  FiArrowLeft,
  FiFileText,
  FiLoader,
  FiClock,
  FiDollarSign,
  FiTag,
  FiCreditCard,
  FiUser,
  FiMessageSquare,
  FiPrinter,
} from "react-icons/fi";

export default function ViewPaymentdetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  const [orderItems, setOrderItems] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
  }, [id]);

  const fetchPaymentDetails = async () => {
    try {
      const res = await axiosInstance.get(`payment/payments/${id}/`);
      setPayment(res.data);
      fetchOrderItems(res.data);
      
      // Fetch users for getting user details
      const usersRes = await axiosInstance.get("users/users/");
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load payment details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (paymentData) => {
    setOrderLoading(true);
    try {
      let orderId = null;
      let endpoint = "";

      if (paymentData.payment_type === "IN" && paymentData.sale) {
        orderId = paymentData.sale;
        endpoint = `sale/sales/${orderId}/`;
      } else if (paymentData.payment_type === "OUT" && paymentData.purchase) {
        orderId = paymentData.purchase;
        endpoint = `purchase/purchases/${orderId}/`;
      } else {
        setOrderLoading(false);
        return;
      }

      const res = await axiosInstance.get(endpoint);
      setOrderItems(res.data.items || []);
    } catch (err) {
      console.error("Failed to fetch order items", err);
      setOrderItems([]);
    } finally {
      setOrderLoading(false);
    }
  };

  // Get user name by ID
  const getUserName = (userId) => {
    if (!userId) return "Unknown";
    const user = users.find((u) => String(u.id) === String(userId));
    if (user) {
      return user.full_name || user.username || user.first_name || `User #${user.id}`;
    }
    return "Unknown";
  };

  // --- PRINT FUNCTION ---
  const handlePrint = () => {
    if (!payment) return;

    const printWindow = window.open("", "_blank");
    const totalAmount = parseFloat(payment.amount).toFixed(2);
    const totalItems = orderItems.reduce(
      (sum, item) => sum + parseFloat(item.total_price_bdt || item.total_cost_bdt || 0),
      0
    );

    // Get user name for print
    const handledByName = payment.handled_by ? getUserName(payment.handled_by) : "—";

    let productRows = "";
    orderItems.forEach((item, index) => {
      const unitPrice = parseFloat(item.unit_price_bdt || item.unit_cost_bdt || 0).toFixed(2);
      const totalPrice = parseFloat(item.total_price_bdt || item.total_cost_bdt || 0).toFixed(2);
      productRows += `
        <tr>
          <td style="text-align:center; padding:4px 6px; border:1px solid #ddd;">${index + 1}</td>
          <td style="padding:4px 6px; border:1px solid #ddd; width:80px;">${item.part_number || "—"}</td>
          <td style="padding:4px 6px; border:1px solid #ddd;">
            ${item.product_name || "Product"}
            ${item.brand_name ? `<br/><span style="font-size:11px; color:#666;">${item.brand_name}</span>` : ""}
          </td>
          <td style="text-align:center; padding:4px 6px; border:1px solid #ddd;">${item.quantity}</td>
          <td style="text-align:right; padding:4px 6px; border:1px solid #ddd; font-family:monospace;">৳ ${unitPrice}</td>
          <td style="text-align:right; padding:4px 6px; border:1px solid #ddd; font-family:monospace; font-weight:bold;">৳ ${totalPrice}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <title>Transaction ${payment.payment_id} - Heaven Autos</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 30px;
              color: #222;
              background: #fff;
              max-width: 1100px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px solid #1f2937;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header-left h1 {
              font-size: 22px;
              color: #1f2937;
              margin: 0 0 4px 0;
            }
            .header-left p {
              color: #6b7280;
              font-size: 14px;
            }
            .header-right {
              text-align: right;
              font-size: 13px;
              color: #4b5563;
            }
            .header-right strong {
              color: #1f2937;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: 12px 16px;
              margin-bottom: 20px;
              border-radius: 4px;
            }
            .info-grid .item {
              display: flex;
              flex-direction: column;
            }
            .info-grid .label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
              font-weight: 600;
            }
            .info-grid .value {
              font-size: 15px;
              font-weight: 500;
              margin-top: 2px;
            }
            .payment-method {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: 12px 16px;
              border-radius: 4px;
              margin-bottom: 20px;
            }
            .payment-method .method-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
              font-weight: 600;
            }
            .payment-method .method-name {
              font-size: 16px;
              font-weight: 600;
              margin-top: 2px;
            }
            .payment-method .details {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 8px;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
              font-size: 13px;
            }
            .payment-method .details .label {
              font-size: 10px;
              text-transform: uppercase;
              color: #6b7280;
              font-weight: 600;
            }
            .payment-method .details .value {
              font-weight: 500;
            }
            .remarks-box {
              background: #fffbeb;
              border: 1px solid #fcd34d;
              padding: 8px 12px;
              border-radius: 4px;
              margin-bottom: 20px;
              font-size: 14px;
              color: #78350f;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0 24px 0;
              font-size: 13px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            th {
              background: #1f2937;
              color: #ffffff !important;
              font-weight: 700 !important;
              opacity: 1 !important;
              padding: 8px 10px;
              text-align: left;
              border: 1px solid #374151;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th.text-right {
              text-align: right;
            }
            th.text-center {
              text-align: center;
            }
            td {
              padding: 4px 6px;
              border: 1px solid #e5e7eb;
            }
            .total-row {
              background: #f3f4f6;
              font-weight: bold;
            }
            .total-row td {
              border-top: 2px solid #1f2937;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #e5e7eb;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              color: #6b7280;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>Heaven Autos</h1>
              <p>Official Payment Ledger – Transaction Detail</p>
            </div>
            <div class="header-right">
              <strong>Transaction ID:</strong> ${payment.payment_id}<br/>
              <strong>Date:</strong> ${new Date(payment.payment_date).toLocaleString()}
            </div>
          </div>

          <div class="info-grid">
            <div class="item">
              <span class="label">Amount</span>
              <span class="value" style="color:${payment.payment_type === "IN" ? "#16a34a" : "#dc2626"};">
                ৳ ${totalAmount}
              </span>
            </div>
            <div class="item">
              <span class="label">Type</span>
              <span class="value">${payment.payment_type === "IN" ? "Received (Sale)" : "Paid (Purchase)"}</span>
            </div>
            <div class="item">
              <span class="label">Reference</span>
              <span class="value" style="font-weight:600; color:#4f46e5;">
                ${payment.payment_type === "IN" ? payment.sale_invoice : payment.purchase_po}
              </span>
            </div>
            <div class="item">
              <span class="label">Processed By</span>
              <span class="value">${handledByName}</span>
            </div>
          </div>

          <div class="payment-method">
            <div class="method-label">Payment Method</div>
            <div class="method-name">${payment.payment_method}</div>
            ${payment.payment_method === "Bank" ? `
              <div class="details">
                <div><span class="label">Bank</span><div class="value">${payment.bank_name}</div></div>
                <div><span class="label">A/C Name</span><div class="value">${payment.bank_account_name}</div></div>
                <div><span class="label">A/C No</span><div class="value" style="font-family:monospace;">${payment.bank_account_number}</div></div>
                ${payment.bank_branch_name ? `<div><span class="label">Branch</span><div class="value">${payment.bank_branch_name}</div></div>` : ""}
              </div>
            ` : ""}
            ${["Bkash","Nagad","Rocket"].includes(payment.payment_method) ? `
              <div class="details">
                <div><span class="label">Mobile Number</span><div class="value" style="font-family:monospace;">${payment.mfs_mobile_number}</div></div>
                ${payment.transaction_id ? `<div><span class="label">Transaction ID</span><div class="value" style="font-family:monospace;">${payment.transaction_id}</div></div>` : ""}
              </div>
            ` : ""}
            ${payment.payment_method === "Cash" ? `
              <div style="margin-top:6px; font-style:italic; color:#6b7280;">Hand Cash processed over counter.</div>
            ` : ""}
          </div>

          ${payment.remarks ? `
            <div class="remarks-box">
              <strong>Remarks:</strong> ${payment.remarks}
            </div>
          ` : ""}

          <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color:#4b5563; margin:16px 0 8px 0;">
            ${payment.payment_type === "IN" ? "Products Sold" : "Products Purchased"}
          </h3>

          ${orderItems.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th style="text-align:center; width:40px;">SL</th>
                  <th style="text-align:left; width:80px;">Part Number</th>
                  <th style="text-align:left;">Product Name</th>
                  <th style="text-align:center; width:60px;">Qty</th>
                  <th style="text-align:right; width:100px;">Unit Cost</th>
                  <th style="text-align:right; width:120px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${productRows}
                <tr class="total-row">
                  <td colspan="5" style="text-align:right; padding-right:12px;">Total Amount</td>
                  <td style="text-align:right; font-family:monospace;">৳ ${totalItems.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          ` : `
            <p style="color:#6b7280; text-align:center; padding:16px; border:1px solid #e5e7eb; border-radius:4px;">
              No product details available.
            </p>
          `}

          <div class="footer">
            <span>Generated on: ${new Date().toLocaleString()}</span>
            <span>Heaven Autos – Official Ledger</span>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-indigo-600 text-3xl" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200">
          {error || "Payment not found."}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-indigo-600 flex items-center gap-2"
        >
          <FiArrowLeft /> Back to Ledger
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header with Print Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 transition"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <FiFileText className="text-indigo-600" /> Transaction {payment.payment_id}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date(payment.payment_date).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold flex items-center gap-2 border border-indigo-700 transition"
        >
          <FiPrinter /> Print Ledger
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-300 overflow-hidden">
        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-300">
          <div className="p-3 border-r border-gray-300 flex items-center gap-2">
            <FiDollarSign
              className={`text-lg ${
                payment.payment_type === "IN" ? "text-green-600" : "text-red-600"
              }`}
            />
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </p>
              <p
                className={`text-lg font-bold ${
                  payment.payment_type === "IN" ? "text-green-700" : "text-red-700"
                }`}
              >
                ৳ {parseFloat(payment.amount).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="p-3 border-r border-gray-300 flex items-center gap-2">
            <FiTag className="text-indigo-600 text-lg" />
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </p>
              <p className="font-medium text-sm">
                {payment.payment_type === "IN" ? "Received (Sale)" : "Paid (Purchase)"}
              </p>
            </div>
          </div>
          <div className="p-3 border-r border-gray-300 flex items-center gap-2">
            <FiFileText className="text-indigo-600 text-lg" />
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Reference
              </p>
              <p className="font-mono text-sm font-bold text-indigo-600">
                {payment.payment_type === "IN" ? payment.sale_invoice : payment.purchase_po}
              </p>
            </div>
          </div>
          <div className="p-3 flex items-center gap-2">
            <FiClock className="text-indigo-600 text-lg" />
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </p>
              <p className="font-medium text-sm">
                {new Date(payment.payment_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="border-b border-gray-300 p-3 bg-gray-50">
          <div className="flex items-start gap-2">
            <FiCreditCard className="text-gray-500 text-lg mt-0.5" />
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Payment Method
              </p>
              <p className="font-semibold text-base">{payment.payment_method}</p>

              {payment.payment_method === "Bank" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-200 text-sm">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Bank</span>
                    <p className="font-medium">{payment.bank_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">A/C Name</span>
                    <p className="font-medium">{payment.bank_account_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">A/C No</span>
                    <p className="font-mono">{payment.bank_account_number}</p>
                  </div>
                  {payment.bank_branch_name && (
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Branch</span>
                      <p>{payment.bank_branch_name}</p>
                    </div>
                  )}
                </div>
              )}

              {["Bkash", "Nagad", "Rocket"].includes(payment.payment_method) && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200 text-sm">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      Mobile Number
                    </span>
                    <p className="font-mono font-bold">{payment.mfs_mobile_number}</p>
                  </div>
                  {payment.transaction_id && (
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        Transaction ID
                      </span>
                      <p className="font-mono">{payment.transaction_id}</p>
                    </div>
                  )}
                </div>
              )}

              {payment.payment_method === "Cash" && (
                <div className="text-sm text-gray-500 italic mt-1">
                  Hand Cash processed over counter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Processed By & Remarks */}
        <div className="p-3 border-b border-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <FiUser className="text-gray-500 text-lg mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Processed By
              </p>
              <p className="font-medium text-gray-800">
                {payment.handled_by ? getUserName(payment.handled_by) : "—"}
              </p>
              {payment.handled_by && (
                <div className="text-[9px] text-gray-400">
                  ID: {payment.handled_by}
                </div>
              )}
            </div>
          </div>
          {payment.remarks && (
            <div className="flex items-start gap-2">
              <FiMessageSquare className="text-gray-500 text-lg mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Remarks
                </p>
                <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-yellow-800 text-sm">
                  {payment.remarks}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Table */}
        <div className="p-3">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
            {payment.payment_type === "IN" ? "Products Sold" : "Products Purchased"}
          </h3>

          {orderLoading ? (
            <div className="flex justify-center items-center p-4 bg-gray-50 border border-gray-200 text-gray-500 text-sm">
              <FiLoader className="animate-spin mr-2" /> Loading products...
            </div>
          ) : orderItems.length > 0 ? (
            <div className="border border-gray-300 overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="border border-gray-600 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-center w-10">
                      SL
                    </th>
                    <th className="border border-gray-600 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-left w-32">
                      Part Number
                    </th>
                    <th className="border border-gray-600 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-left">
                      Product Name
                    </th>
                    <th className="border border-gray-600 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-center w-16">
                      Qty
                    </th>
                    <th className="border border-gray-600 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-right w-24">
                      {payment.payment_type === "IN" ? "Unit Price" : "Unit Cost"}
                    </th>
                    <th className="border border-gray-600 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-right w-28">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-2 py-2 text-center text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-gray-800">
                        {item.part_number || "—"}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <div>{item.product_name || "Product"}</div>
                        {item.brand_name && (
                          <div className="text-xs text-gray-400">{item.brand_name}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center font-medium text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right font-mono text-gray-700">
                        ৳{" "}
                        {parseFloat(
                          item.unit_price_bdt || item.unit_cost_bdt || 0
                        ).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right font-mono font-bold text-gray-900">
                        ৳{" "}
                        {parseFloat(
                          item.total_price_bdt || item.total_cost_bdt || 0
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan="5" className="border border-gray-300 px-2 py-2 text-right text-gray-700">
                      Total
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right font-mono text-gray-900">
                      ৳{" "}
                      {orderItems
                        .reduce(
                          (sum, item) =>
                            sum +
                            parseFloat(
                              item.total_price_bdt || item.total_cost_bdt || 0
                            ),
                          0
                        )
                        .toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4 bg-gray-50 border border-gray-200 rounded text-sm">
              No product details available for this transaction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}