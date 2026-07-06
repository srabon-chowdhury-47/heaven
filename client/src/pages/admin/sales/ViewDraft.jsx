import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import {
  FiArrowLeft,
  FiPrinter,
  FiEdit2,
  FiShoppingCart,
  FiCalendar,
  FiUser,
  FiFileText,
} from "react-icons/fi";

export default function ViewDraft() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [draft, setDraft] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper to get customer name
  const getCustomerName = (customerId) => {
    if (!customerId) return "Walk-in Customer";
    const cust = customers.find((c) => String(c.id) === String(customerId));
    return cust ? cust.shop_name || cust.proprietor_name || cust.name : "Walk-in Customer";
  };

  // Helper to get product part number
  const getProductPartNumber = (item) => {
    if (!item) return "N/A";
    let product = products.find((p) => String(p.id) === String(item.product));
    if (!product) {
      product = products.find((p) => p.product_name === item.product_name);
    }
    return product?.part_number || "N/A";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If draft data was passed via state, use it; otherwise fetch
        if (location.state?.draftData) {
          setDraft(location.state.draftData);
          // Still need customers/products for display helpers
          const [custRes, prodRes] = await Promise.all([
            axiosInstance.get("person/customers/"),
            axiosInstance.get("products/"),
          ]);
          setCustomers(custRes.data.results || custRes.data);
          setProducts(prodRes.data.results || prodRes.data);
          setLoading(false);
          return;
        }

        // Fetch draft and supporting data
        const [draftRes, custRes, prodRes] = await Promise.all([
          axiosInstance.get(`draft-sale/draft-sales/${id}/`),
          axiosInstance.get("person/customers/"),
          axiosInstance.get("products/"),
        ]);

        setDraft(draftRes.data);
        setCustomers(custRes.data.results || custRes.data);
        setProducts(prodRes.data.results || prodRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load draft details.");
        setLoading(false);
      }
    };

    fetchData();
  }, [id, location.state]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading draft...</div>
    );
  }

  if (error || !draft) {
    return (
      <div className="p-8 text-center text-red-500 text-sm">
        {error || "Draft not found."}
      </div>
    );
  }

  // Calculate totals (if not already present)
  const subtotal = draft.items?.reduce(
    (sum, item) => sum + parseFloat(item.total_price_bdt || 0),
    0
  ) || 0;
  const discount = parseFloat(draft.discount) || 0;
  const tax = parseFloat(draft.tax) || 0;
  const total = parseFloat(draft.total_amount) || subtotal - discount + tax;

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Edit handler: navigate to edit page with draft data
  const handleEdit = () => {
    navigate(`/dashboard/sales/draft/${draft.id}`, { state: { draftData: draft } });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen print:bg-white print:p-0">
      {/* Action Buttons (hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1.5 rounded text-sm"
        >
          <FiArrowLeft /> Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 text-amber-600 hover:text-amber-800 border border-amber-300 px-3 py-1.5 rounded text-sm"
          >
            <FiEdit2 /> Edit
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 border border-blue-300 px-3 py-1.5 rounded text-sm"
          >
            <FiPrinter /> Print
          </button>
        </div>
      </div>

      {/* Ledger / Invoice View */}
      <div className="bg-white border border-gray-300 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="border-b border-gray-300 px-6 py-4 print:py-2">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FiShoppingCart className="text-blue-600" /> Draft Invoice
              </h1>
              <p className="text-sm text-gray-500"># {draft.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                <FiCalendar className="inline mr-1" />
                {new Date(draft.sale_date).toLocaleDateString("en-BD", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 py-4 border-b border-gray-300 print:py-2">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Customer
            </h3>
            <p className="text-md font-medium text-gray-800 flex items-center gap-1">
              <FiUser className="text-gray-400" size={14} />
              {getCustomerName(draft.customer)}
            </p>
            {draft.customer && (
              <p className="text-xs text-gray-500">Customer ID: {draft.customer}</p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Draft Details
            </h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Status:</span> Draft
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Created:</span>{" "}
              {new Date(draft.created_at || draft.sale_date).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Product Table */}
        <div className="px-6 py-4 print:py-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Products
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-200">
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    SL
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Part No / Product
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                    Multiplier
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                    Unit Price (BDT)
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                    Total (BDT)
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.items && draft.items.length > 0 ? (
                  draft.items.map((item, idx) => {
                    const partNumber = getProductPartNumber(item);
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {idx + 1}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="font-medium text-gray-800">
                            {partNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.product_name}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {item.multiplier}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                          ৳ {parseFloat(item.unit_price_bdt).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                          ৳ {parseFloat(item.total_price_bdt).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="border border-gray-300 px-3 py-4 text-center text-gray-400">
                      No products in this draft.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="border border-gray-300 px-3 py-2 text-right font-semibold">
                    Subtotal
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                    ৳ {subtotal.toFixed(2)}
                  </td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td colSpan="4" className="border border-gray-300 px-3 py-2 text-right font-semibold text-green-700">
                      Discount (-)
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-mono text-green-700">
                      ৳ {discount.toFixed(2)}
                    </td>
                  </tr>
                )}
                {tax > 0 && (
                  <tr>
                    <td colSpan="4" className="border border-gray-300 px-3 py-2 text-right font-semibold text-purple-700">
                      Tax (+)
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-mono text-purple-700">
                      ৳ {tax.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-100 print:bg-gray-200">
                  <td colSpan="4" className="border border-gray-300 px-3 py-2 text-right font-bold text-lg">
                    Grand Total
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold text-lg">
                    ৳ {total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Additional Notes (if any) */}
        {draft.notes && (
          <div className="px-6 py-3 border-t border-gray-300 print:py-1">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Notes
            </h4>
            <p className="text-sm text-gray-700">{draft.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 px-6 py-3 text-xs text-gray-400 text-center print:py-1">
          <FiFileText className="inline mr-1" /> This is a draft sale – not yet finalised.
        </div>
      </div>
    </div>
  );
}