import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiImage, FiX, FiUpload, FiFilter } from "react-icons/fi";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(20);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, brandRes] = await Promise.all([
        axiosInstance.get("products/"),
        axiosInstance.get("brand/brands/")
      ]);
      
      let dataArray = [];
      if (prodRes.data && Array.isArray(prodRes.data.results)) {
        dataArray = prodRes.data.results; 
      } else if (Array.isArray(prodRes.data)) {
        dataArray = prodRes.data; 
      }

      let brandsArray = [];
      if (brandRes.data && Array.isArray(brandRes.data.results)) {
        brandsArray = brandRes.data.results;
      } else if (Array.isArray(brandRes.data)) {
        brandsArray = brandRes.data;
      }

      setProducts(dataArray);
      setBrands(brandsArray);
      setLoading(false);
    } catch (err) {
      console.error("API Error:", err);
      setError(err.response?.data?.detail || "Failed to fetch data from the warehouse database.");
      setProducts([]); 
      setBrands([]);
      setLoading(false);
    }
  };

  const getBrandName = (brandId) => {
    if (!brandId) return "Generic";
    const brand = brands.find(b => String(b.id) === String(brandId));
    return brand ? brand.name : "Unknown";
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product permanently from stock records?")) {
      try {
        await axiosInstance.delete(`products/${id}/`);
        setProducts(products.filter((p) => p.id !== id));
      } catch (err) {
        alert("Failed to delete product. It might be linked to existing purchases/sales.");
      }
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const importData = new FormData();
    importData.append("excel_file", file);

    setImporting(true);
    setError("");

    try {
      const response = await axiosInstance.post("products/bulk-import/", importData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(response.data.message); 
      fetchData(); 
    } catch (err) {
      console.error(err);
      setError("Failed to import Excel. Ensure your column names match the system exactly.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, selectedCategory, selectedBrand]);

  const filteredProducts = products.filter((product) => {
    const searchLower = (searchTerm || "").toLowerCase();
    const actualBrandName = getBrandName(product.brand).toLowerCase();
    
    const matchesSearch =
      (product.product_name || "").toLowerCase().includes(searchLower) ||
      actualBrandName.includes(searchLower) ||
      (product.product_id || "").toLowerCase().includes(searchLower) ||
      (product.part_number || "").toLowerCase().includes(searchLower) ||
      (product.barcode || "").toLowerCase().includes(searchLower);
      
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesBrand = selectedBrand === "All" || String(product.brand) === String(selectedBrand);
    
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const categories = ["All", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  // Minimal input classes
  const inputClass = "w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-800 transition-colors shadow-sm";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-600 text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600 mr-2"></div>
        <span>Loading parts database...</span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 text-gray-900 bg-white min-h-screen max-w-7xl mx-auto border-x border-gray-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-800 flex items-center gap-2">
            Motorcycle Parts Master List
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleExcelImport} className="hidden" />
          
          <button onClick={() => fileInputRef.current.click()} disabled={importing} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold transition flex justify-center items-center gap-1.5 shadow-sm disabled:opacity-50">
            <FiUpload size={12} /> {importing ? "Importing..." : "Excel Import"}
          </button>

          <button onClick={() => navigate("/dashboard/products/add")} className="bg-gray-800 hover:bg-black text-white px-3 py-1.5 rounded text-xs font-bold transition flex justify-center items-center gap-1.5 shadow-sm">
            <FiPlus size={12} /> New Product
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded mb-4 text-xs font-medium">{error}</div>}

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-2.5 top-2 text-gray-400" size={14} />
          <input 
            type="text" 
            placeholder="Search parts, brands, barcodes..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className={inputClass} 
          />
        </div>
        
        <div className="relative w-full md:w-48">
          <FiFilter className="absolute left-2.5 top-2 text-gray-400" size={14} />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)} 
            className={`${inputClass} appearance-none`}
          >
            {categories.map((cat) => ( <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option> ))}
          </select>
        </div>

        <div className="relative w-full md:w-48">
          <FiFilter className="absolute left-2.5 top-2 text-gray-400" size={14} />
          <select 
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)} 
            className={`${inputClass} appearance-none`}
          >
            <option value="All">All Brands</option>
            {brands.map((b) => ( <option key={b.id} value={b.id}>{b.name}</option> ))}
          </select>
        </div>
      </div>

      {/* COMPACT TABLE */}
      <div className="overflow-x-auto rounded border border-gray-200 shadow-sm scrollbar-thin scrollbar-thumb-gray-300 mb-4">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 font-semibold w-10 text-center">Img</th>
              <th className="px-3 py-2 font-semibold">Part Number</th>
              <th className="px-3 py-2 font-semibold">Name & Details</th>
              <th className="px-3 py-2 font-semibold">Source/Status</th>
              <th className="px-3 py-2 font-semibold text-center">Weight (kg)</th>   {/* NEW COLUMN */}
              <th className="px-3 py-2 font-semibold text-right">Cost (৳)</th>
              <th className="px-3 py-2 font-semibold text-right">Retail (৳)</th>
              <th className="px-3 py-2 font-semibold text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleProducts.length === 0 ? (
              <tr><td colSpan="8" className="p-6 text-center text-gray-500 text-xs">No matching products found.</td></tr>
            ) : (
              visibleProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-1.5 text-center">
                    {product.image_1 ? (
                      <img src={product.image_1} alt={product.product_name} onClick={() => setFullScreenImage(product.image_1)} className="w-8 h-8 object-cover rounded border border-gray-200 mx-auto cursor-pointer hover:opacity-75" title="View image" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 flex items-center justify-center rounded border border-gray-200 mx-auto"><FiImage className="text-gray-400" size={14} /></div>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="font-mono text-gray-800 font-bold">{product.product_number}</div>
                    <div className="text-[10px] text-gray-500">{product.part_number || "No Part #"}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="font-semibold text-gray-900 whitespace-normal min-w-[150px] leading-tight">{product.product_name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{getBrandName(product.brand)} | {product.category || "No Category"}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="text-gray-600 font-medium text-[10px]">{product.source}</div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-block ${product.product_status === 'Active' ? 'bg-green-100 text-green-700' : product.product_status === 'Damaged' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                      {product.product_status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center font-mono text-gray-700">
                    {product.weight ? `${product.weight}` : '-'}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-right text-gray-600">{parseFloat(product.purchase_cost_bdt || 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 font-mono text-right font-bold text-gray-800">{parseFloat(product.retail_price_bdt || 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setSelectedProduct(product)} className="p-1 text-gray-500 hover:text-gray-900 transition" title="View"><FiEye size={14} /></button>
                      <button onClick={() => navigate(`/dashboard/products/edit/${product.id}`)} className="p-1 text-blue-500 hover:text-blue-700 transition" title="Edit"><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(product.id)} className="p-1 text-red-500 hover:text-red-700 transition" title="Delete"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* LOAD MORE */}
      {visibleCount < filteredProducts.length && (
        <div className="flex justify-center mb-4">
          <button 
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded transition border border-gray-300"
          >
            Load 20 More ({filteredProducts.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* COMPACT SLIDE-OUT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full p-4 shadow-2xl border-l border-gray-200 overflow-y-auto animate-slide-in-right">
            
            <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-gray-800 px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">{selectedProduct.product_id}</span>
                  <span className="text-[10px] font-bold text-gray-600 px-1.5 py-0.5 bg-gray-100 rounded uppercase">{selectedProduct.product_status}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedProduct.product_name}</h3>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-red-600 p-1.5 bg-gray-50 hover:bg-red-50 rounded transition">
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <section>
                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">Core Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 bg-gray-50 p-3 rounded border border-gray-200 text-xs">
                  <div><span className="block text-[9px] text-gray-400 uppercase">Part Number</span><span className="font-mono font-medium">{selectedProduct.part_number}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Brand</span><span className="font-bold">{getBrandName(selectedProduct.brand)}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Category</span><span>{selectedProduct.category || "-"}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Barcode</span><span className="font-mono">{selectedProduct.barcode || "-"}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Primary Unit</span><span>{selectedProduct.unit}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Alt Units</span><span>{selectedProduct.alternative_units || "-"}</span></div>
                  {/* NEW: Weight field */}
                  <div><span className="block text-[9px] text-gray-400 uppercase">Weight (kg)</span><span>{selectedProduct.weight ? `${selectedProduct.weight}` : "-"}</span></div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">Sourcing & Financials</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 bg-gray-50 p-3 rounded border border-gray-200 text-xs">
                  <div><span className="block text-[9px] text-gray-400 uppercase">Source</span><span className="font-semibold">{selectedProduct.source}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">HS Code</span><span className="font-mono">{selectedProduct.hs_code || "-"}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Markup</span><span>{selectedProduct.markup_percentage}%</span></div>
                  
                  <div className="pt-2 border-t border-gray-200"><span className="block text-[9px] text-gray-400 uppercase">Purchase (BDT)</span><span className="font-bold text-gray-700">{selectedProduct.purchase_cost_bdt}</span></div>
                  <div className="pt-2 border-t border-gray-200"><span className="block text-[9px] text-gray-400 uppercase">Wholesale (BDT)</span><span className="font-bold text-gray-700">{selectedProduct.wholesale_price_bdt}</span></div>
                  <div className="pt-2 border-t border-gray-200"><span className="block text-[9px] text-gray-400 uppercase">Retail (BDT)</span><span className="font-bold text-gray-900">{selectedProduct.retail_price_bdt}</span></div>

                  {selectedProduct.source === 'Import' && (
                    <>
                      <div className="pt-2 border-t border-gray-200"><span className="block text-[9px] text-gray-400 uppercase">Indian MRP</span><span>₹ {selectedProduct.mrp_inr}</span></div>
                      <div className="pt-2 border-t border-gray-200"><span className="block text-[9px] text-gray-400 uppercase">Conv. MRP</span><span>৳ {selectedProduct.mrp_bdt || "-"}</span></div>
                    </>
                  )}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">Taxes & Logistics</h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-gray-50 p-3 rounded border border-gray-200 text-xs">
                  <div><span className="block text-[9px] text-gray-400 uppercase">VAT Code</span><span>{selectedProduct.vat_code || "-"}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Warranty</span><span>{selectedProduct.warranty_period} Months</span></div>
                  <div className="col-span-2"><span className="block text-[9px] text-gray-400 uppercase">Compatibility</span><span className="whitespace-pre-wrap">{selectedProduct.vehicle_compatibility || "-"}</span></div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">Stock Rules</h4>
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded border border-gray-200 text-xs">
                  <div><span className="block text-[9px] text-gray-400 uppercase">Min Alert</span><span className="font-bold text-red-600">{selectedProduct.min_stock_level}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Max Limit</span><span className="font-bold text-gray-700">{selectedProduct.max_stock_level || "-"}</span></div>
                  <div><span className="block text-[9px] text-gray-400 uppercase">Auto-Reorder</span><span className="font-bold text-blue-600">{selectedProduct.reorder_point}</span></div>
                </div>
              </section>

              {(selectedProduct.damage_discount_price > 0 || selectedProduct.damage_remark) && (
                <section>
                  <h4 className="text-[10px] uppercase font-bold text-red-500 mb-2 border-b border-red-100 pb-1">Damage Info</h4>
                  <div className="grid grid-cols-2 gap-2 bg-red-50 p-3 rounded border border-red-100 text-xs">
                    <div><span className="block text-[9px] text-red-400 uppercase">Discount Price</span><span className="font-bold text-red-700">{selectedProduct.damage_discount_price} ৳</span></div>
                    <div><span className="block text-[9px] text-red-400 uppercase">Remarks</span><span className="text-red-900">{selectedProduct.damage_remark}</span></div>
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">Media</h4>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
                  {[selectedProduct.image_1, selectedProduct.image_2, selectedProduct.image_3, selectedProduct.image_4, selectedProduct.image_5].map((img, idx) => {
                    if (!img) return null;
                    return (
                      <button key={idx} onClick={() => setFullScreenImage(img)} title="View Image" className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-white rounded border border-gray-300 hover:border-gray-500 transition">
                        <FiImage className="text-gray-400 mb-1" size={16} />
                        <span className="text-[9px] text-gray-500">Img {idx + 1}</span>
                      </button>
                    );
                  })}
                  {!selectedProduct.image_1 && <span className="text-xs text-gray-400 italic">No images.</span>}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex justify-center items-center p-4 transition-opacity" onClick={() => setFullScreenImage(null)}>
          <div className="relative max-w-4xl max-h-full flex justify-center items-center group">
            <button onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }} className="absolute top-2 right-2 bg-white text-black p-2 rounded-full shadow-lg z-10 hover:bg-gray-200">
              <FiX size={20} />
            </button>
            <img src={fullScreenImage} alt="Product" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}