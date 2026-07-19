import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import {
  FiPlus,
  FiBox,
  FiSearch,
  FiX,
  FiTrash2,
  FiEye,
  FiDollarSign,
  FiCalendar,
  FiList,
  FiEdit2,
} from "react-icons/fi";

export default function DraftPurchaseList() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [draftRes, prodRes, empRes, brandRes, usersRes] = await Promise.all([
        axiosInstance.get("draft-purchase/draft-orders/"),
        axiosInstance.get("products/"),
        axiosInstance.get("person/employees/"),
        axiosInstance.get("brand/brands/"),
        axiosInstance.get("users/users/"),
      ]);

      setDrafts(draftRes.data.results || draftRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setEmployees(empRes.data.results || empRes.data);
      setBrands(brandRes.data.results || brandRes.data);
      setUsers(usersRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch draft purchase data.");
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const getEmployeeName = (id) => {
    if (!id) return "Unknown";
    const user = users.find((u) => String(u.id) === String(id));
    if (user) {
      return user.full_name || user.username || user.first_name || `User #${user.id}`;
    }
    const emp = employees.find((e) => String(e.id) === String(id));
    if (!emp) return "Unknown";
    return emp.first_name
      ? `${emp.first_name} ${emp.last_name || ""}`.trim()
      : emp.full_name || emp.name || emp.employee_id;
  };

  const getProductName = (item) => {
    if (!item) return "Unknown";
    const product = products.find((p) => String(p.id) === String(item.product));
    return product?.product_name || product?.name || item.product_name || "Unknown";
  };

  // --- STATS ---
  const stats = useMemo(() => {
    const total = drafts.reduce((sum, d) => {
      const amt = parseFloat(d.total_amount) || 0;
      return sum + amt;
    }, 0);
    const count = drafts.length;
    const latest =
      drafts.length > 0
        ? drafts.reduce((latest, d) =>
            new Date(d.purchase_date) > new Date(latest.purchase_date) ? d : latest
          ).purchase_date
        : null;
    return { total, count, latest };
  }, [drafts]);

  // --- NAVIGATION FUNCTIONS ---
  const handleView = (id) => {
    navigate(`/dashboard/draft-purchase/view/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/dashboard/draft-purchase/edit/${id}`);
  };

  // --- DELETE ---
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this draft purchase?")) {
      try {
        await axiosInstance.delete(`draft-purchase/draft-orders/${id}/`);
        fetchData();
      } catch (err) {
        alert("Failed to delete draft. Check server logs.");
      }
    }
  };

  // --- FILTER ---
  const filteredDrafts = drafts.filter((d) => {
    const draftNumber = (d.draft_number || "").toLowerCase();
    const remarks = (d.remarks || "").toLowerCase();
    const productNames = d.items ? d.items.map((i) => getProductName(i)).join(" ").toLowerCase() : "";
    const search = searchTerm.toLowerCase();

    return (
      draftNumber.includes(search) ||
      remarks.includes(search) ||
      productNames.includes(search)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FiBox className="text-blue-600" /> Draft Purchase Ledger
          </h1>
        </div>
        <Link
          to="/dashboard/draft-purchase/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-semibold transition flex items-center gap-1.5 border border-blue-700"
        >
          <FiPlus /> New Draft
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-gray-300 mb-4 bg-white">
        <div className="p-2 border-r border-gray-300 flex items-center gap-2">
          <FiDollarSign className="text-blue-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Total Draft Value
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
              Draft Orders
            </p>
            <p className="text-lg font-bold text-gray-800">{stats.count}</p>
          </div>
        </div>
        <div className="p-2 flex items-center gap-2">
          <FiCalendar className="text-purple-600 text-lg" />
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Latest Draft
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
            placeholder="Search by Draft #, Remarks, or Product name..."
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
                    Draft # / Date
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                    Entry By
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                    Remarks
                  </th>
                  <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                    Items
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
                {filteredDrafts.length > 0 ? (
                  filteredDrafts.map((draft, index) => {
                    const displayTotal =
                      parseFloat(draft.total_amount) > 0
                        ? parseFloat(draft.total_amount)
                        : draft.items?.reduce((sum, i) => sum + parseFloat(i.total_cost_bdt || 0), 0);

                    return (
                      <tr
                        key={draft.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border border-gray-300 px-2 py-1.5 align-top">
                          <div className="font-medium text-gray-800 text-xs">
                            {draft.draft_number}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {new Date(draft.purchase_date).toLocaleDateString("en-BD", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                          {getEmployeeName(draft.entry_by)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600 max-w-[150px] truncate">
                          {draft.remarks || "—"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 max-w-[200px]">
                          <div className="text-xs font-medium text-gray-700">
                            {draft.items?.length || 0} products
                          </div>
                          <div
                            className="text-[10px] text-gray-500 truncate"
                            title={draft.items?.map((i) => getProductName(i)).join(", ")}
                          >
                            {draft.items?.map((i) => getProductName(i)).join(", ")}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-gray-800">
                          ৳ {displayTotal.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          <div className="flex justify-center items-center gap-1">
                            {/* View - Navigate to dedicated view page */}
                            <button
                              onClick={() => handleView(draft.id)}
                              className="text-gray-500 hover:text-blue-600 transition p-0.5"
                              title="View Details"
                            >
                              <FiEye size={15} />
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => handleEdit(draft.id)}
                              className="text-blue-600 hover:text-blue-800 transition p-0.5"
                              title="Edit Draft"
                            >
                              <FiEdit2 size={15} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(draft.id)}
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
                      No draft purchase records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}