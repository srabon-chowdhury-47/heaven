import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { userService } from "../../../api/user";
import {
  FiDollarSign,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiFileText,
  FiClock,
  FiEye,
  FiX,
  FiBox,
  FiUser,
  FiShoppingBag,
  FiLoader,
  FiSearch,
  FiChevronRight,
  FiChevronDown,
} from "react-icons/fi";

export default function Payments() {
  const location = useLocation();
  const saleIdParam = new URLSearchParams(location.search).get('saleId');

  const [type, setType] = useState("IN");
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderSummary, setOrderSummary] = useState({ total: 0, paid: 0, due: 0 });
  const [customerBalance, setCustomerBalance] = useState(null);
  const [netPayable, setNetPayable] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  // Load more state
  const [showAll, setShowAll] = useState(false);

  // Modal State
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const initialFormState = {
    amount: "",
    payment_method: "Cash",
    handled_by: "",
    transaction_id: "",
    remarks: "",
    bank_account_number: "",
    bank_account_name: "",
    bank_name: "",
    bank_branch_name: "",
    bank_routing_number: "",
    mfs_mobile_number: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBank = formData.payment_method === "Bank";
  const isMFS = ["Bkash", "Nagad", "Rocket"].includes(formData.payment_method);

  // ── Load current user ──
  const loadCurrentUser = async () => {
    try {
      const storedUser = userService.getCurrentUserFromStorage();
      if (storedUser && storedUser.id) {
        setCurrentUser(storedUser);
        setFormData((prev) => ({ ...prev, handled_by: storedUser.id.toString() }));
        return;
      }

      try {
        const user = await userService.getCurrentUser();
        if (user && user.id) {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
          setFormData((prev) => ({ ...prev, handled_by: user.id.toString() }));
          return;
        }
      } catch (err) {
        console.error("Failed to fetch current user from API", err);
      }

      if (users.length > 0) {
        const firstUser = users[0];
        setCurrentUser(firstUser);
        setFormData((prev) => ({ ...prev, handled_by: firstUser.id.toString() }));
      }
    } catch (err) {
      console.error("Error loading current user:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRecentPayments();
    loadCurrentUser();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("users/users/");
      const usersData = res.data || [];
      setUsers(usersData);

      if (!currentUser) {
        const storedUser = userService.getCurrentUserFromStorage();
        if (storedUser && storedUser.id) {
          const user = usersData.find((u) => u.id === storedUser.id);
          if (user) {
            setCurrentUser(user);
            setFormData((prev) => ({ ...prev, handled_by: user.id.toString() }));
            return;
          }
        }
        if (usersData.length > 0) {
          const firstUser = usersData[0];
          setCurrentUser(firstUser);
          setFormData((prev) => ({ ...prev, handled_by: firstUser.id.toString() }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const res = await axiosInstance.get("payment/payments/");
      setRecentPayments(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch payments", err);
    }
  };

  // ── Fetch orders & sort latest first ──
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const endpoint = type === "IN" ? "sale/sales/" : "purchase/purchases/";
      const res = await axiosInstance.get(endpoint);
      const allOrders = res.data.results || res.data;
      const pendingOrders = allOrders.filter((o) => o.payment_status !== "Paid");
      const sorted = pendingOrders.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA;
      });
      setOrders(sorted);
      // Reset showAll when orders refresh
      setShowAll(false);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Filter orders based on search term ──
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const customerField = type === "IN" ? order.customer_name : order.supplier_name;
    const refField = type === "IN" ? order.invoice_number : order.po_number;
    return (
      (customerField && customerField.toLowerCase().includes(term)) ||
      (refField && refField.toLowerCase().includes(term))
    );
  });

  // ── Determine which orders to display ──
  const getDisplayedOrders = () => {
    if (searchTerm.trim() !== "") {
      // When searching, show all matches (ignore showAll)
      return filteredOrders;
    }
    // No search: show limited unless showAll is true
    return showAll ? filteredOrders : filteredOrders.slice(0, 3);
  };

  const displayedOrders = getDisplayedOrders();

  // Reset showAll when search term changes
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      setShowAll(false);
    }
  }, [searchTerm]);

  // Reset showAll when type changes (already done in fetchOrders)
  useEffect(() => {
    fetchOrders();
    setSelectedOrderId("");
    setActiveOrder(null);
    setOrderSummary({ total: 0, paid: 0, due: 0 });
    setCustomerBalance(null);
    setNetPayable(null);
    setSearchTerm("");
    setShowAll(false);
    setFormData((prev) => ({
      ...initialFormState,
      handled_by: prev.handled_by,
      payment_method: prev.payment_method,
    }));
  }, [type]);

  // ── AUTO‑SELECT SALE FROM QUERY PARAM ──
  useEffect(() => {
    if (saleIdParam && orders.length > 0 && !selectedOrderId) {
      const found = orders.find((o) => o.id.toString() === saleIdParam.toString());
      if (found) {
        setSelectedOrderId(saleIdParam.toString());
      }
    }
  }, [saleIdParam, orders, selectedOrderId]);

  useEffect(() => {
    if (selectedOrderId) {
      calculateDueAndBalance(selectedOrderId);
      const order = orders.find((o) => o.id.toString() === selectedOrderId.toString());
      setActiveOrder(order || null);
    } else {
      setActiveOrder(null);
      setCustomerBalance(null);
      setNetPayable(null);
    }
  }, [selectedOrderId, recentPayments, orders]);

  const calculateDueAndBalance = async (orderId) => {
    const order = orders.find((o) => o.id.toString() === orderId.toString());
    if (!order) return;

    const total = parseFloat(order.total_amount || 0);
    const relatedPayments = recentPayments.filter((p) => {
      if (type === "IN") return p.sale?.toString() === orderId.toString();
      return p.purchase?.toString() === orderId.toString();
    });
    const paid = relatedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const due = total - paid;
    setOrderSummary({ total, paid, due });

    const customerId = order.customer?.id || order.customer || order.customer_id;
    if (customerId) {
      try {
        const transRes = await axiosInstance.get(
          `/customerledger/transactions/customer/${customerId}/transactions/`
        );
        const txns = transRes.data || [];
        let balance = 0;
        if (txns.length > 0) {
          balance = parseFloat(txns[txns.length - 1].running_balance) || 0;
        } else {
          const balRes = await axiosInstance.get(
            `/customerledger/transactions/customer/${customerId}/balance/`
          );
          balance = parseFloat(balRes.data?.balance ?? balRes.data ?? 0) || 0;
        }
        setCustomerBalance(balance);

        const credit = balance > 0 ? balance : 0;
        const net = due - credit;
        const netValue = net > 0 ? net : 0;
        setNetPayable(netValue);
        setFormData((prev) => ({ ...prev, amount: netValue.toFixed(2) }));
      } catch (err) {
        console.error("Failed to fetch customer balance", err);
        setCustomerBalance(null);
        setNetPayable(due);
        setFormData((prev) => ({ ...prev, amount: due.toFixed(2) }));
      }
    } else {
      setCustomerBalance(null);
      setNetPayable(due);
      setFormData((prev) => ({ ...prev, amount: due.toFixed(2) }));
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderId || !formData.amount) {
      alert("Select an order and enter an amount.");
      return;
    }

    if (!currentUser || !currentUser.id) {
      alert("No logged-in user found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_type: type,
        handled_by: currentUser.id,
        remarks: formData.remarks || "",
        transaction_id: formData.transaction_id || null,
      };

      if (type === "IN") payload.sale = parseInt(selectedOrderId, 10);
      if (type === "OUT") payload.purchase = parseInt(selectedOrderId, 10);

      if (isBank) {
        payload.bank_account_number = formData.bank_account_number || null;
        payload.bank_account_name = formData.bank_account_name || null;
        payload.bank_name = formData.bank_name || null;
        payload.bank_branch_name = formData.bank_branch_name || null;
        payload.bank_routing_number = formData.bank_routing_number || null;
      }

      if (isMFS) {
        payload.mfs_mobile_number = formData.mfs_mobile_number || null;
      }

      Object.keys(payload).forEach((key) => {
        if (payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log("Submitting payment payload:", payload);

      await axiosInstance.post("payment/payments/", payload);

      await fetchRecentPayments();
      await fetchOrders();

      setSelectedOrderId("");
      setFormData((prev) => ({
        ...initialFormState,
        handled_by: prev.handled_by,
      }));
      alert("Payment recorded successfully!");
    } catch (err) {
      console.error("Payment failed", err);
      const errorMsg = err.response?.data || "Failed to process payment.";
      alert(`Error: ${JSON.stringify(errorMsg)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserName = (userId) => {
    if (!userId) return "Unknown";
    const user = users.find((u) => String(u.id) === String(userId));
    if (user) {
      return user.full_name || user.username || user.first_name || `User #${user.id}`;
    }
    return "Unknown";
  };

  const openViewModal = async (payment) => {
    setSelectedPaymentDetails(payment);
    setOrderDetails(null);
    setOrderLoading(true);

    try {
      const orderId = payment.sale || payment.purchase;
      if (!orderId) {
        setOrderLoading(false);
        return;
      }

      const endpoint =
        payment.payment_type === "IN"
          ? `sale/sales/${orderId}/`
          : `purchase/purchases/${orderId}/`;
      const res = await axiosInstance.get(endpoint);
      setOrderDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch order details", err);
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
          <FiDollarSign className="text-xl" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payment Center</h1>
          <p className="text-xs text-gray-500">Process incoming revenues and outgoing payments.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">
        {/* Form Column */}
        <div className="lg:col-span-4 bg-white border border-gray-300 overflow-hidden">
          <div className="bg-gray-100 border-b border-gray-300 px-3 py-1.5 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FiDollarSign className="text-indigo-600" />
              New Payment
            </h2>
          </div>

          <div className="p-3">
            <div className="flex border border-gray-300 rounded mb-4 overflow-hidden">
              <button
                onClick={() => setType("IN")}
                className={`flex-1 py-1.5 text-sm font-semibold flex items-center justify-center gap-1 transition ${
                  type === "IN"
                    ? "bg-green-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FiArrowDownLeft /> Receive
              </button>
              <button
                onClick={() => setType("OUT")}
                className={`flex-1 py-1.5 text-sm font-semibold flex items-center justify-center gap-1 transition ${
                  type === "OUT"
                    ? "bg-red-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FiArrowUpRight /> Pay
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Search Input */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <FiSearch size={12} />
                  Search {type === "IN" ? "Customer / Invoice" : "Supplier / PO"}
                </label>
                <input
                  type="text"
                  placeholder="Type to filter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* ─── ORDER LIST ─── */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  {searchTerm.trim() !== ""
                    ? `${filteredOrders.length} Matching ${type === "IN" ? "Invoices" : "Orders"}`
                    : showAll
                    ? `All ${filteredOrders.length} Pending ${type === "IN" ? "Invoices" : "Orders"}`
                    : `Latest ${Math.min(3, filteredOrders.length)} Pending ${type === "IN" ? "Invoices" : "Orders"}`}
                </label>
                {loading ? (
                  <div className="flex justify-center py-4 text-gray-400">
                    <FiLoader className="animate-spin mr-2" /> Loading...
                  </div>
                ) : displayedOrders.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm border border-dashed border-gray-300 rounded">
                    No pending orders found
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
                    {displayedOrders.map((order) => {
                      const isSelected = selectedOrderId === order.id.toString();
                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id.toString())}
                          className={`px-3 py-2 cursor-pointer transition-colors flex justify-between items-center ${
                            isSelected
                              ? "bg-indigo-50 border-l-4 border-indigo-500"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-700">
                                {type === "IN" ? order.invoice_number : order.po_number}
                              </span>
                              <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600">
                                {order.payment_status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {type === "IN"
                                ? order.customer_name || "Walk-in"
                                : order.supplier_name || `Supplier #${order.supplier}`}
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <div className="font-bold text-sm text-gray-800">
                              ৳{parseFloat(order.total_amount).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(order.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          {isSelected && <FiChevronRight className="text-indigo-500 ml-1" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ─── LOAD MORE BUTTON ─── */}
                {!searchTerm.trim() && !showAll && filteredOrders.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded border border-gray-300 transition flex items-center justify-center gap-1"
                  >
                    <FiChevronDown size={14} />
                    Load More ({filteredOrders.length - 3} more)
                  </button>
                )}
                {!searchTerm.trim() && showAll && filteredOrders.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded border border-gray-300 transition flex items-center justify-center gap-1"
                  >
                    <FiChevronDown size={14} className="rotate-180" />
                    Show Less
                  </button>
                )}
              </div>

              {/* Order Summary (when selected) */}
              {activeOrder && (
                <div className="bg-gray-50 border border-gray-200 rounded p-2.5">
                  <div className="flex items-center text-xs font-semibold text-gray-700 border-b border-gray-200 pb-1.5 mb-1.5">
                    <FiUser className="mr-1.5 text-indigo-500" />
                    {type === "IN"
                      ? `Customer: ${activeOrder.customer_name || "Walk-in"}`
                      : `Supplier ID: ${activeOrder.supplier}`}
                  </div>

                  {activeOrder.items && activeOrder.items.length > 0 && (
                    <div className="mb-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center">
                        <FiBox className="mr-1" /> Items
                      </p>
                      <ul className="text-[11px] text-gray-600 list-disc list-inside pl-3 space-y-0.5">
                        {activeOrder.items.slice(0, 3).map((item) => (
                          <li key={item.id}>
                            {item.quantity}x {item.product_name}
                          </li>
                        ))}
                        {activeOrder.items.length > 3 && (
                          <li className="text-gray-400">+{activeOrder.items.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1 text-center pt-1.5 border-t border-gray-200 text-xs">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Order Total</p>
                      <p className="font-bold text-gray-900">৳{orderSummary.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Paid</p>
                      <p className="font-bold text-green-600">৳{orderSummary.paid.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase">Order Due</p>
                      <p className="font-bold text-red-600">৳{orderSummary.due.toFixed(2)}</p>
                    </div>
                  </div>

                  {customerBalance !== null && !isNaN(customerBalance) && (
                    <div className="mt-2 p-1.5 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer Balance (Ledger):</span>
                        <span className={`font-bold ${customerBalance > 0 ? 'text-green-600' : customerBalance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          ৳{customerBalance.toFixed(2)}
                        </span>
                      </div>
                      {customerBalance > 0 && (
                        <>
                          <div className="text-green-700 text-[10px] mt-0.5">
                            * Credit available – net payable adjusted below.
                          </div>
                          <div className="text-yellow-700 text-[9px] mt-0.5">
                            ⚠️ Order will remain "Partial" until credit is officially applied.
                          </div>
                        </>
                      )}
                      {netPayable !== null && !isNaN(netPayable) && netPayable !== orderSummary.due && (
                        <div className="flex justify-between mt-0.5 border-t border-blue-200 pt-0.5">
                          <span className="text-gray-600">Net Payable (after credit):</span>
                          <span className="font-bold text-indigo-700">৳{netPayable.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Amount (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm font-mono font-bold text-gray-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Method
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Bkash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                  </select>
                </div>
              </div>

              {isMFS && (
                <div className="border border-purple-200 bg-purple-50/50 rounded p-2.5 space-y-2">
                  <p className="text-[10px] text-purple-700 uppercase font-bold tracking-wide">
                    MFS Details
                  </p>
                  <input
                    type="text"
                    name="mfs_mobile_number"
                    placeholder="Mobile Number (e.g., 017...)"
                    value={formData.mfs_mobile_number}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-purple-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-purple-400 outline-none"
                    required
                  />
                  <input
                    type="text"
                    name="transaction_id"
                    placeholder="Transaction ID (TxnID)"
                    value={formData.transaction_id}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-purple-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-purple-400 outline-none"
                    required
                  />
                </div>
              )}

              {isBank && (
                <div className="border border-blue-200 bg-blue-50/50 rounded p-2.5 space-y-2">
                  <p className="text-[10px] text-blue-700 uppercase font-bold tracking-wide">
                    Bank Transfer Details
                  </p>
                  <input
                    type="text"
                    name="bank_account_number"
                    placeholder="Account Number *"
                    value={formData.bank_account_number}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-blue-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none"
                    required
                  />
                  <input
                    type="text"
                    name="bank_account_name"
                    placeholder="Account Name *"
                    value={formData.bank_account_name}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-blue-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none"
                    required
                  />
                  <input
                    type="text"
                    name="bank_name"
                    placeholder="Bank Name *"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-blue-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none"
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      name="bank_branch_name"
                      placeholder="Branch (Opt)"
                      value={formData.bank_branch_name}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-blue-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none"
                    />
                    <input
                      type="text"
                      name="bank_routing_number"
                      placeholder="Routing (Opt)"
                      value={formData.bank_routing_number}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-blue-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    name="transaction_id"
                    placeholder="Check/Trx ID (Opt)"
                    value={formData.transaction_id}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-blue-200 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-blue-400 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                  Processed By (Auto)
                </label>
                <div className="w-full bg-gray-100 border border-gray-300 rounded p-1.5 text-sm text-gray-800">
                  {currentUser ? (
                    <span>{currentUser.full_name || currentUser.username || currentUser.first_name || "User"}</span>
                  ) : (
                    <span className="text-gray-400">Loading user...</span>
                  )}
                </div>
                {currentUser && (
                  <div className="mt-0.5 text-[9px] text-gray-400">
                    User ID: {currentUser.id} • {currentUser.email || "No email"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm text-gray-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedOrderId || !currentUser}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isSubmitting ? "Processing..." : `Process ${type === "IN" ? "Receipt" : "Payment"}`}
              </button>
            </form>
          </div>
        </div>

        {/* Ledger Column */}
        <div className="lg:col-span-8 bg-white border border-gray-300 overflow-hidden">
          <div className="bg-gray-100 border-b border-gray-300 px-3 py-1.5 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FiFileText className="text-indigo-600" />
              Payment Ledger
            </h2>
            <span className="text-xs text-gray-500">
              {recentPayments.length} record{recentPayments.length !== 1 && "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                    ID / Date
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                    Type
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                    Ref Order
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                    Method
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
                    Processed By
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                    Amount
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="border border-gray-300 px-3 py-6 text-center text-gray-400 text-sm">
                      No recent transactions.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((pay, index) => (
                    <tr
                      key={pay.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-2 py-1.5 align-top">
                        <div className="font-medium text-gray-800 text-xs">
                          {pay.payment_id}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
                          <FiClock className="mr-1" size={10} />
                          {new Date(pay.payment_date).toLocaleDateString("en-BD", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        {pay.payment_type === "IN" ? (
                          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-green-200">
                            Received
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-red-200">
                            Paid Out
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-700 font-medium text-xs">
                        {pay.payment_type === "IN" ? pay.sale_invoice : pay.purchase_po}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-800 text-xs">
                        {pay.payment_method}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-800">
                        {pay.handled_by ? getUserName(pay.handled_by) : "—"}
                      </td>
                      <td
                        className={`border border-gray-300 px-2 py-1.5 text-right font-black ${
                          pay.payment_type === "IN" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {pay.payment_type === "IN" ? "+" : "-"} ৳
                        {parseFloat(pay.amount).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        <button
                          onClick={() => openViewModal(pay)}
                          className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 p-1 rounded transition"
                          title="View Full Details"
                        >
                          <FiEye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── PAYMENT DETAILS MODAL ─── */}
      {selectedPaymentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-3">
          <div className="bg-white w-full max-w-2xl rounded-lg border border-gray-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <FiFileText className="text-indigo-600" />
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedPaymentDetails(null)}
                className="text-gray-500 hover:text-red-500"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 border-b border-gray-200 pb-2">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Payment ID</p>
                  <p className="font-bold text-gray-900">{selectedPaymentDetails.payment_id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Date</p>
                  <p className="font-bold">
                    {new Date(selectedPaymentDetails.payment_date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-gray-200 pb-2">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Order Ref</p>
                  <p className="font-mono text-indigo-600 font-bold">
                    {selectedPaymentDetails.payment_type === "IN"
                      ? selectedPaymentDetails.sale_invoice
                      : selectedPaymentDetails.purchase_po}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Amount</p>
                  <p
                    className={`font-black text-lg ${
                      selectedPaymentDetails.payment_type === "IN"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    ৳{parseFloat(selectedPaymentDetails.amount).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded bg-gray-50 p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <FiUser className="text-indigo-500" size={14} />
                  <span className="text-xs font-semibold text-gray-700">
                    {selectedPaymentDetails.payment_type === "IN" ? "Customer" : "Supplier"}
                  </span>
                </div>
                {orderLoading ? (
                  <div className="flex items-center justify-center py-4 text-gray-500 text-xs">
                    <FiLoader className="animate-spin mr-2" /> Loading order details...
                  </div>
                ) : orderDetails ? (
                  <>
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      {selectedPaymentDetails.payment_type === "IN"
                        ? orderDetails.customer_name || "Walk-in"
                        : orderDetails.supplier_name || `Supplier ID: ${orderDetails.supplier}`}
                    </p>
                    <div className="border-t border-gray-200 pt-2 mt-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                        <FiShoppingBag size={12} /> Items
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-200 text-gray-700">
                              <th className="border border-gray-300 px-1.5 py-0.5 text-left font-semibold">Product</th>
                              <th className="border border-gray-300 px-1.5 py-0.5 text-center font-semibold">Qty</th>
                              <th className="border border-gray-300 px-1.5 py-0.5 text-right font-semibold">Price</th>
                              <th className="border border-gray-300 px-1.5 py-0.5 text-right font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderDetails.items && orderDetails.items.length > 0 ? (
                              orderDetails.items.map((item) => (
                                <tr key={item.id} className="bg-white">
                                  <td className="border border-gray-300 px-1.5 py-0.5">{item.product_name}</td>
                                  <td className="border border-gray-300 px-1.5 py-0.5 text-center">{item.quantity}</td>
                                  <td className="border border-gray-300 px-1.5 py-0.5 text-right font-mono">৳{parseFloat(item.price).toFixed(2)}</td>
                                  <td className="border border-gray-300 px-1.5 py-0.5 text-right font-mono font-bold">৳{parseFloat(item.total_price).toFixed(2)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="border border-gray-300 px-1.5 py-1 text-center text-gray-400">No items</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-100 font-semibold">
                              <td colSpan="3" className="border border-gray-300 px-1.5 py-0.5 text-right">Order Total</td>
                              <td className="border border-gray-300 px-1.5 py-0.5 text-right font-mono">৳{parseFloat(orderDetails.total_amount).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-xs">Order details not available</p>
                )}
              </div>

              <div className="border border-gray-200 bg-gray-50 rounded p-2.5 space-y-1">
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  Method: <span className="text-gray-800">{selectedPaymentDetails.payment_method}</span>
                </p>
                {selectedPaymentDetails.payment_method === "Bank" && (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <p><span className="text-gray-500">Bank:</span> {selectedPaymentDetails.bank_name || "—"}</p>
                    <p><span className="text-gray-500">A/C Name:</span> {selectedPaymentDetails.bank_account_name || "—"}</p>
                    <p className="col-span-2"><span className="text-gray-500">A/C No:</span> <span className="font-mono">{selectedPaymentDetails.bank_account_number || "—"}</span></p>
                    {selectedPaymentDetails.bank_branch_name && (
                      <p className="col-span-2"><span className="text-gray-500">Branch:</span> {selectedPaymentDetails.bank_branch_name}</p>
                    )}
                  </div>
                )}
                {["Bkash", "Nagad", "Rocket"].includes(selectedPaymentDetails.payment_method) && (
                  <p><span className="text-gray-500">Mobile No:</span> <span className="font-mono font-bold">{selectedPaymentDetails.mfs_mobile_number || "—"}</span></p>
                )}
                {selectedPaymentDetails.transaction_id && (
                  <p><span className="text-gray-500">Transaction ID:</span> <span className="font-mono">{selectedPaymentDetails.transaction_id}</span></p>
                )}
                {selectedPaymentDetails.payment_method === "Cash" && (
                  <p className="text-gray-500 italic text-xs">Standard Hand Cash</p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Processed By</p>
                <p className="font-medium text-gray-800">
                  {selectedPaymentDetails.handled_by ? getUserName(selectedPaymentDetails.handled_by) : "Unknown"}
                </p>
              </div>

              {selectedPaymentDetails.remarks && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Remarks</p>
                  <div className="bg-yellow-50 p-2 rounded text-yellow-800 border border-yellow-200 text-xs">
                    {selectedPaymentDetails.remarks}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-right">
              <button
                onClick={() => setSelectedPaymentDetails(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-1.5 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}