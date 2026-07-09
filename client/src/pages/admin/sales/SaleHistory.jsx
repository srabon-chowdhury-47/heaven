import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import {
  FiPlus,
  FiShoppingCart,
  FiSearch,
  FiX,
  FiSave,
  FiTrash2,
  FiEye,
  FiDollarSign,
  FiCalendar,
  FiList,
  FiEdit2,
} from "react-icons/fi";

export default function SaleHistory() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Edit/View Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [saleRes, prodRes, custRes, empRes, brandRes, usersRes] = await Promise.all([
        axiosInstance.get("sale/sales/"),
        axiosInstance.get("products/"),
        axiosInstance.get("person/customers/"),
        axiosInstance.get("person/employees/"),
        axiosInstance.get("brand/brands/"),
        axiosInstance.get("users/users/"),
      ]);

      setSales(saleRes.data.results || saleRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setCustomers(custRes.data.results || custRes.data);
      setEmployees(empRes.data.results || empRes.data);
      setBrands(brandRes.data.results || brandRes.data);
      setUsers(usersRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch sales data.");
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const getCustomerName = (id) => {
    if (!id) return "Walk-in Customer";
    const cust = customers.find((c) => String(c.id) === String(id));
    return cust ? cust.shop_name || cust.proprietor_name || cust.name : "Walk-in Customer";
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

  const getProductPartNumber = (item) => {
    if (!item) return "N/A";
    let product = products.find((p) => String(p.id) === String(item.product));
    if (!product) {
      product = products.find((p) => p.product_name === item.product_name);
    }
    return product?.part_number || "N/A";
  };

  // --- STATS ---
  const stats = useMemo(() => {
    const total = sales.reduce((sum, s) => {
      const amt = parseFloat(s.total_amount) || 0;
      return sum + amt;
    }, 0);
    const count = sales.length;
    const latest =
      sales.length > 0
        ? sales.reduce((latest, s) =>
            new Date(s.sale_date) > new Date(latest.sale_date) ? s : latest
          ).sale_date
        : null;
    return { total, count, latest };
  }, [sales]);

  // --- VIEW SALE (Navigate to detailed view) ---
  const handleViewSale = (saleId) => {
    navigate(`/dashboard/sales/view/${saleId}`);
  };

  // --- Navigate to Edit Page ---
  const handleEditSale = (saleId) => {
    navigate(`/dashboard/sales/edit/${saleId}`);
  };

  // --- EDIT / VIEW (Modal) ---
  const openEditModal = (sale) => {
    setEditFormData({
      id: sale.id,
      customer: sale.customer || "",
      sold_by: sale.sold_by || "",
      payment_status: sale.payment_status || "Unpaid",
      remarks: sale.remarks || "",
      invoice_number: sale.invoice_number,
    });
    setSelectedItems(sale.items || []);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      await axiosInstance.patch(`sale/sales/${editFormData.id}/`, {
        payment_status: editFormData.payment_status,
        remarks: editFormData.remarks,
      });
      fetchData();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update sale record.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this Sale? This will return the products to your warehouse stock!"
      )
    ) {
      try {
        await axiosInstance.delete(`sale/sales/${id}/`);
        fetchData();
      } catch (err) {
        alert("Failed to delete sale. Check server logs.");
      }
    }
  };

  // --- FILTER ---
  const filteredSales = sales.filter((s) => {
    const custName = getCustomerName(s.customer).toLowerCase();
    const productNames = s.items ? s.items.map((i) => i.product_name).join(" ").toLowerCase() : "";
    const search = searchTerm.toLowerCase();

    return (
      (s.invoice_number && s.invoice_number.toLowerCase().includes(search)) ||
      custName.includes(search) ||
      productNames.includes(search)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FiShoppingCart className="text-green-600" /> Sales Ledger
          </h1>
        </div>
        <Link
          to="/dashboard/sales/add"
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-semibold transition flex items-center gap-1.5 border border-green-700"
        >
          <FiPlus /> New Sale
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-gray-300 mb-4 bg-white">
        <div className="p-2 border-r border-gray-300 flex items-center gap-2">
          <FiDollarSign className="text-green-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Total Sales
            </p>
            <p className="text-lg font-bold text-gray-800">
              ৳ {stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="p-2 border-r border-gray-300 flex items-center gap-2">
          <FiList className="text-indigo-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Invoices
            </p>
            <p className="text-lg font-bold text-gray-800">{stats.count}</p>
          </div>
        </div>
        <div className="p-2 flex items-center gap-2">
          <FiCalendar className="text-purple-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Latest Sale
            </p>
            <p className="text-sm font-semibold text-gray-700">
              {stats.latest
                ? new Date(stats.latest).toLocaleDateString("en-BD", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-300 overflow-hidden">
        {/* Search Bar */}
        <div className="border-b border-gray-300 px-3 py-1.5 flex items-center gap-2 bg-gray-50">
          <FiSearch className="text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search by Invoice, Product, or Customer..."
            className="w-full bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading records...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                    Invoice / Date
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                    Customer / Sold By
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                    Items
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                    Total
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale, index) => {
                    const displayTotal =
                      parseFloat(sale.total_amount) > 0
                        ? parseFloat(sale.total_amount)
                        : sale.items?.reduce((sum, i) => sum + parseFloat(i.total_price_bdt || 0), 0);

                    return (
                      <tr
                        key={sale.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border border-gray-300 px-2 py-1.5 align-top">
                          <div className="font-medium text-gray-800 text-xs">
                            {sale.invoice_number}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {new Date(sale.sale_date).toLocaleDateString("en-BD", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5">
                          <div className="text-xs font-medium text-gray-800">
                            {getCustomerName(sale.customer)}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            By: {getEmployeeName(sale.sold_by)}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 max-w-[200px]">
                          <div className="text-xs font-medium text-gray-700">
                            {sale.items?.length || 0} products
                          </div>
                          <div
                            className="text-[10px] text-gray-500 truncate"
                            title={sale.items?.map((i) => i.product_name).join(", ")}
                          >
                            {sale.items?.map((i) => i.product_name).join(", ")}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sale.payment_status === "Paid"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : sale.payment_status === "Partial"
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-red-100 text-red-700 border border-red-200"
                            }`}
                          >
                            {sale.payment_status || "Unpaid"}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-gray-800">
                          ৳ {displayTotal.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          <div className="flex justify-center items-center gap-1">
                            <button
                              onClick={() => handleViewSale(sale.id)}
                              className="text-blue-600 hover:text-blue-800 transition p-0.5"
                              title="View Full Details"
                            >
                              <FiEye size={15} />
                            </button>
                            <button
                              onClick={() => handleEditSale(sale.id)}
                              className="text-indigo-600 hover:text-indigo-800 transition p-0.5"
                              title="Edit Sale"
                            >
                              <FiEdit2 size={15} />
                            </button>
                            <button
                              onClick={() => openEditModal(sale)}
                              className="text-green-600 hover:text-green-800 transition p-0.5"
                              title="Quick Update Status"
                            >
                              <FiSave size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="text-gray-400 hover:text-red-600 transition p-0.5"
                              title="Delete"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="border border-gray-300 px-3 py-6 text-center text-gray-400 text-sm">
                      No sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- EDIT / VIEW MODAL with SL, Part Number & Product Name --- */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-3">
          <div className="bg-white border border-gray-300 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-lg">
            {/* Header */}
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <FiShoppingCart className="text-green-600" /> {editFormData.invoice_number}
                </h2>
                <p className="text-[10px] text-gray-500">View products & update logistics</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-red-500"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body (scrollable) */}
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Products Table */}
              <div>
                <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Products Sold
                </h3>
                <div className="border border-gray-300 overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="border border-gray-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-center">
                          SL
                        </th>
                        <th className="border border-gray-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-left">
                          Part No / Product
                        </th>
                        <th className="border border-gray-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-center">
                          Qty
                        </th>
                        <th className="border border-gray-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-right">
                          Unit Price
                        </th>
                        <th className="border border-gray-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-right">
                          Total
                        </th>
                        <th className="border border-gray-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-right text-emerald-300">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, idx) => {
                        const partNumber = getProductPartNumber(item);
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                              {idx + 1}
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <div className="text-xs font-bold text-gray-800">
                                {partNumber}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {item.product_name}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                              {item.quantity}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right font-mono text-xs">
                              ৳ {parseFloat(item.unit_price_bdt).toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right font-mono font-bold text-xs">
                              ৳ {parseFloat(item.total_price_bdt).toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right font-mono font-bold text-emerald-600 text-xs">
                              {item.profit_bdt ? `৳ ${parseFloat(item.profit_bdt).toFixed(2)}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Logistics Form */}
              <form id="editForm" onSubmit={handleEditSubmit}>
                <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Update Logistics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-300 p-2 bg-gray-50">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                      Customer
                    </label>
                    <p className="text-sm font-medium text-gray-800">
                      {getCustomerName(editFormData.customer)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                      Sold By
                    </label>
                    <p className="text-sm font-medium text-gray-800">
                      {getEmployeeName(editFormData.sold_by)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                      Payment Status
                    </label>
                    <select
                      name="payment_status"
                      value={editFormData.payment_status}
                      onChange={handleEditChange}
                      className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 focus:ring-1 focus:ring-green-500 outline-none"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                      Remarks
                    </label>
                    <input
                      type="text"
                      name="remarks"
                      value={editFormData.remarks || ""}
                      onChange={handleEditChange}
                      className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 focus:ring-1 focus:ring-green-500 outline-none"
                      placeholder="Add note"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-200 border border-gray-300"
              >
                Close
              </button>
              <button
                form="editForm"
                type="submit"
                disabled={editLoading}
                className={`px-4 py-1.5 rounded text-sm font-bold text-white transition flex items-center gap-1.5 ${
                  editLoading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                <FiSave /> {editLoading ? "Saving..." : "Update Logistics"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}