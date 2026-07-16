import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { FiArrowLeft, FiBox, FiDollarSign, FiCalendar, FiUser, FiTag } from "react-icons/fi";

export default function ViewPurchase() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [purRes, prodRes, supRes, empRes, usersRes, brandRes] = await Promise.all([
        axiosInstance.get(`purchase/purchases/${id}/`),
        axiosInstance.get("products/"),
        axiosInstance.get("supplier/suppliers/"),
        axiosInstance.get("person/employees/"),
        axiosInstance.get("users/users/"),
        axiosInstance.get("brand/brands/"),
      ]);

      setPurchase(purRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setSuppliers(supRes.data.results || supRes.data);
      setEmployees(empRes.data.results || empRes.data);
      setUsers(usersRes.data || []);
      setBrands(brandRes.data.results || brandRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load purchase details.");
      setLoading(false);
    }
  };

  // --- Helpers (same as in PurchaseHistory) ---
  const getSupplierName = (id) => {
    if (!id) return "Unknown Supplier";
    const sup = suppliers.find((s) => String(s.id) === String(id));
    return sup ? sup.name || sup.company_name : "Unknown Supplier";
  };

  const getEmployeeName = (id) => {
    if (!id) return "Unknown";
    const user = users.find((u) => String(u.id) === String(id));
    if (user) return user.full_name || user.username || user.first_name || `User #${user.id}`;
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading purchase details...</div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-sm">{error || "Purchase not found."}</div>
      </div>
    );
  }

  const totalAmount = parseFloat(purchase.total_amount) || 
    purchase.items?.reduce((sum, i) => sum + parseFloat(i.total_cost_bdt || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/purchase"
            className="text-gray-600 hover:text-gray-800 transition p-1 rounded border border-gray-300"
          >
            <FiArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FiBox className="text-blue-600" /> Purchase Details
          </h1>
        </div>
        <span className="text-sm bg-gray-200 px-3 py-1 rounded font-mono">
          {purchase.po_number}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-white border border-gray-300 p-2 flex items-center gap-2">
          <FiCalendar className="text-blue-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</p>
            <p className="text-sm font-medium text-gray-800">
              {new Date(purchase.purchase_date).toLocaleDateString("en-BD", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-300 p-2 flex items-center gap-2">
          <FiUser className="text-indigo-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Supplier</p>
            <p className="text-sm font-medium text-gray-800">{getSupplierName(purchase.supplier)}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-300 p-2 flex items-center gap-2">
          <FiTag className="text-purple-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</p>
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                purchase.payment_status === "Paid"
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : purchase.payment_status === "Partial"
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {purchase.payment_status || "Unpaid"}
            </span>
          </div>
        </div>
        <div className="bg-white border border-gray-300 p-2 flex items-center gap-2">
          <FiDollarSign className="text-green-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-gray-800">৳ {totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-300 overflow-hidden">
        {/* Purchase Meta Info */}
        <div className="border-b border-gray-300 px-3 py-2 bg-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Invoice #</span>
            <p className="text-gray-800">{purchase.invoice_number || "—"}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Entry By</span>
            <p className="text-gray-800">{getEmployeeName(purchase.entry_by)}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Remarks</span>
            <p className="text-gray-800">{purchase.remarks || "—"}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  SL
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                  Part No / Product
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Qty
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                  Unit Cost
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {purchase.items && purchase.items.length > 0 ? (
                purchase.items.map((item, idx) => {
                  const partNumber = getProductPartNumber(item);
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="text-xs font-bold text-gray-800">{partNumber}</div>
                        <div className="text-[10px] text-gray-500">{item.product_name}</div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs">
                        ৳ {parseFloat(item.unit_cost_bdt).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-xs">
                        ৳ {parseFloat(item.total_cost_bdt).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="border border-gray-300 px-3 py-4 text-center text-gray-400 text-sm">
                    No items in this purchase.
                  </td>
                </tr>
              )}
            </tbody>
            {purchase.items && purchase.items.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="4" className="border border-gray-300 px-2 py-1.5 text-right text-xs uppercase text-gray-600">
                    Grand Total
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-sm text-gray-800">
                    ৳ {totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}