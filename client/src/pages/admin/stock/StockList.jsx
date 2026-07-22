import { useState, useEffect } from "react";
import axiosInstance from "../../../api/axios";
import { FiBox, FiSearch, FiAlertTriangle, FiRefreshCw, FiFilter, FiChevronDown, FiChevronRight, FiLayers } from "react-icons/fi";

export default function StockList() {
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showLowStock, setShowLowStock] = useState(false);

  // Expanded rows (batch breakdown)
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, prodRes] = await Promise.all([
        axiosInstance.get("stock/stocks/"),
        axiosInstance.get("products/")
      ]);

      setStocks(stockRes.data.results || stockRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load warehouse stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // --- DATA ENRICHMENT ---
  const enrichedStocks = stocks.map(stock => {
    const productDef = products.find(p => String(p.id) === String(stock.product)) || {};
    const batches = (stock.batches || []).filter(b => b.quantity > 0);
    return {
      ...stock,
      brand_name: stock.brand || productDef.brand || "Generic",
      category: productDef.category || "Uncategorized",
      min_stock_level: productDef.min_stock_level || 5,
      current_quantity: stock.current_quantity ?? 0,
      batches,
      average_mrp: stock.average_mrp,
      fifo_mrp: stock.fifo_mrp,
    };
  });

  // --- EXTRACT FILTER OPTIONS ---
  const availableBrands = ["All", ...new Set(enrichedStocks.map(s => s.brand_name).filter(Boolean))].sort();
  const availableCategories = ["All", ...new Set(enrichedStocks.map(s => s.category).filter(Boolean))].sort();

  // --- APPLY FILTERS ---
  const filteredStocks = enrichedStocks.filter((stock) => {
    const searchString = `${stock.product_name || ""} ${stock.part_number || ""} ${stock.category || ""}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    const matchesBrand = selectedBrand === "All" || stock.brand_name === selectedBrand;
    const matchesCategory = selectedCategory === "All" || stock.category === selectedCategory;
    const matchesLowStock = showLowStock ? stock.current_quantity <= stock.min_stock_level : true;

    return matchesSearch && matchesBrand && matchesCategory && matchesLowStock;
  });

  // --- GROUP BY BRAND ---
  const groupedStocks = filteredStocks.reduce((groups, stock) => {
    const brand = stock.brand_name;
    if (!groups[brand]) {
      groups[brand] = [];
    }
    groups[brand].push(stock);
    return groups;
  }, {});

  const inputClass = "w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-800 transition-colors shadow-sm";

  const fmtMoney = (val) => {
    if (val === null || val === undefined) return "-";
    const num = Number(val);
    return Number.isFinite(num) ? num.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-";
  };

  return (
    <div className="p-3 sm:p-4 text-gray-900 bg-white min-h-screen max-w-7xl mx-auto border-x border-gray-200">

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-gray-800 tracking-tight">
            <FiBox className="text-gray-600" /> Live Warehouse Stock
          </h1>
        </div>
        <button
          onClick={fetchData}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded mb-4 text-xs font-medium flex items-center gap-2">
          <FiAlertTriangle /> {error}
        </div>
      )}

      {/* Toolbar / Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-2.5 top-2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search parts or part numbers..."
            className={inputClass}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative w-full md:w-48">
          <FiFilter className="absolute left-2.5 top-2 text-gray-400" size={14} />
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            {availableBrands.map(b => <option key={b} value={b}>{b === "All" ? "All Brands" : b}</option>)}
          </select>
        </div>

        <div className="relative w-full md:w-48">
          <FiFilter className="absolute left-2.5 top-2 text-gray-400" size={14} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            {availableCategories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
        </div>

        <button
          onClick={() => setShowLowStock(!showLowStock)}
          className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 border shadow-sm w-full md:w-auto ${
            showLowStock
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <FiAlertTriangle size={14} /> {showLowStock ? "Low Stock Only" : "Filter Low Stock"}
        </button>
      </div>

      {/* Grouped Data Tables */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Scanning inventory...</div>
      ) : Object.keys(groupedStocks).length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm border border-gray-200 rounded bg-gray-50">
          No items match your filter criteria.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedStocks).map(([brandName, brandStocks]) => (
            <div key={brandName} className="border border-gray-200 rounded shadow-sm overflow-hidden">

              {/* Brand Header */}
              <div className="bg-black text-white border-b border-gray-800 p-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                <span>Brand: {brandName}</span>
                <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded border border-gray-600 text-gray-300">
                  {brandStocks.length} Items
                </span>
              </div>

              {/* Brand Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-white text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 font-semibold w-8"></th>
                      <th className="px-3 py-2 font-semibold w-8">SL</th>
                      <th className="px-3 py-2 font-semibold">Part No.</th>
                      <th className="px-3 py-2 font-semibold w-8 text-center">Status</th>
                      <th className="px-3 py-2 font-semibold">Product Name</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold text-right">In Stock</th>
                      <th className="px-3 py-2 font-semibold text-right">Avg. MRP</th>
                      <th className="px-3 py-2 font-semibold text-right">Next (FIFO)</th>
                      <th className="px-3 py-2 font-semibold text-right text-[10px] text-gray-400">Min.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {brandStocks.map((stock, idx) => {
                      const isOutOfStock = stock.current_quantity <= 0;
                      const isLowStock = !isOutOfStock && stock.current_quantity <= stock.min_stock_level;
                      const hasBatches = stock.batches && stock.batches.length > 0;
                      const isExpanded = expandedIds.has(stock.id);
                      const hasMultipleBatches = stock.batches && stock.batches.length > 1;

                      return (
                        <>
                          <tr
                            key={stock.id}
                            className={`hover:bg-gray-50 transition-colors ${hasBatches ? "cursor-pointer" : ""}`}
                            onClick={() => hasBatches && toggleExpand(stock.id)}
                          >
                            <td className="px-3 py-1.5 text-center text-gray-400">
                              {hasBatches ? (
                                isExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />
                              ) : null}
                            </td>
                            <td className="px-3 py-1.5 text-center text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-1.5 font-mono text-gray-500">{stock.part_number || "-"}</td>
                            <td className="px-3 py-1.5 text-center">
                              <div className={`w-2.5 h-2.5 rounded-full mx-auto shadow-sm ${
                                isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-amber-400' : 'bg-emerald-400'
                              }`} title={isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'} />
                            </td>
                            <td className="px-3 py-1.5 font-medium text-gray-800">
                              <div className="flex items-center gap-1.5">
                                {stock.product_name}
                                {hasMultipleBatches && (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[9px] bg-blue-50 text-blue-600 border border-blue-200 px-1 py-0.5 rounded"
                                    title={`${stock.batches.length} price batches`}
                                  >
                                    <FiLayers size={9} /> {stock.batches.length}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-gray-500">{stock.category}</td>
                            <td className="px-3 py-1.5 text-right font-bold">
                              <span className={isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-gray-800'}>
                                {stock.current_quantity}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-gray-700">
                              ৳{fmtMoney(stock.average_mrp)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-gray-500">
                              ৳{fmtMoney(stock.fifo_mrp)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-[10px] text-gray-400 font-mono">
                              {stock.min_stock_level}
                            </td>
                          </tr>

                          {isExpanded && hasBatches && (
                            <tr key={`${stock.id}-batches`} className="bg-gray-50">
                              <td colSpan={10} className="px-3 py-2">
                                <div className="ml-6 border border-gray-200 rounded bg-white overflow-hidden">
                                  <table className="w-full text-[11px]">
                                    <thead className="bg-gray-100 text-gray-500">
                                      <tr>
                                        <th className="px-2 py-1 text-left font-semibold">Batch Date</th>
                                        <th className="px-2 py-1 text-right font-semibold">MRP / Unit</th>
                                        <th className="px-2 py-1 text-right font-semibold">Remaining Qty</th>
                                        <th className="px-2 py-1 text-right font-semibold">Original Qty</th>
                                        <th className="px-2 py-1 text-right font-semibold">Batch Value</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {stock.batches
                                        .slice()
                                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                                        .map((batch) => (
                                          <tr key={batch.id}>
                                            <td className="px-2 py-1 text-gray-500">
                                              {batch.created_at ? new Date(batch.created_at).toLocaleDateString() : "-"}
                                            </td>
                                            <td className="px-2 py-1 text-right font-mono text-gray-800">
                                              ৳{fmtMoney(batch.mrp)}
                                            </td>
                                            <td className="px-2 py-1 text-right font-bold text-gray-800">
                                              {batch.quantity}
                                            </td>
                                            <td className="px-2 py-1 text-right text-gray-400">
                                              {batch.original_quantity}
                                            </td>
                                            <td className="px-2 py-1 text-right font-mono text-gray-600">
                                              ৳{fmtMoney(batch.quantity * batch.mrp)}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}