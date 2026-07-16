import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { FiSave, FiArrowLeft, FiUpload } from "react-icons/fi";

export default function AddProduct() {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [showAllFields, setShowAllFields] = useState(false);

  const [formData, setFormData] = useState({
    part_number: "", product_name: "", brand: "", category: "", source: "Local",
    hs_code: "", mrp_inr: 0, mrp_bdt: 0, purchase_cost_bdt: 0, markup_percentage: 0,
    wholesale_price_bdt: 0, retail_price_bdt: 0, unit: "piece", alternative_units: "",
    barcode: "", warranty_period: 0, vat_code: "", vehicle_compatibility: "",
    min_stock_level: 5, max_stock_level: "", reorder_point: 5, product_status: "Active",
    damage_discount_price: 0, damage_remark: "",
    image_1: null, image_2: null, image_3: null, image_4: null, image_5: null,
    weight: "",
  });

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState("");

  const necessaryFields = new Set([
    "part_number", "product_name", "brand",
    "purchase_cost_bdt", "hs_code", "weight", "vat_code"
  ]);

  const shouldShowField = (fieldName) => showAllFields || necessaryFields.has(fieldName);

  useEffect(() => {
    fetchBrands();
    if (isEditMode) fetchExistingProduct();
  }, [id]);

  const fetchBrands = async () => {
    try {
      const response = await axiosInstance.get("brand/brands/");
      const data = response.data;
      if (Array.isArray(data)) setBrands(data);
      else if (data?.results) setBrands(data.results);
      else if (data?.data) setBrands(data.data);
      else setBrands([]);
    } catch (err) {
      console.error("Failed to load brands", err);
      setBrands([]);
    }
  };

  const fetchExistingProduct = async () => {
    setFetchingData(true);
    try {
      const response = await axiosInstance.get(`products/${id}/`);
      setFormData({
        ...response.data,
        image_1: null, image_2: null, image_3: null, image_4: null, image_5: null,
      });
      setFetchingData(false);
    } catch (err) {
      setError("Failed to load product details.");
      setFetchingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
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
      navigate("/dashboard/products");
    } catch (err) {
      setError("Excel Import Failed. Check column names.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Download template with only necessary fields
  const handleDownloadTemplate = () => {
    const headers = Array.from(necessaryFields);
    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const submitData = new FormData();
    for (const key in formData) {
      if (formData[key] !== null && formData[key] !== "") {
        submitData.append(key, formData[key]);
      }
    }

    try {
      if (isEditMode) {
        await axiosInstance.put(`products/${id}/`, submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axiosInstance.post("products/", submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      navigate("/dashboard/products");
    } catch (err) {
      setError(err.response?.data?.detail || "Error saving product. Check unique fields.");
      setLoading(false);
    }
  };

  if (fetchingData) return <div className="p-4 text-center text-gray-500">Loading master record...</div>;

  // Styling
  const inputClass = "w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-800 transition-colors";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-0.5";
  const sectionHeaderClass = "col-span-full text-xs font-bold text-gray-800 border-b border-gray-200 mt-2 pb-1 mb-1 uppercase tracking-wider";

  // Helper to render a label with an optional required asterisk
  const renderLabel = (text, required = false) => (
    <label className={labelClass}>
      {text}
      {required && <span className="text-red-500 text-[12px] ml-0.5">*</span>}
    </label>
  );

  return (
    <div className="bg-white text-gray-900 p-3 sm:p-4 rounded shadow-sm border border-gray-200 max-w-7xl mx-auto w-full">
      {/* Header with toggle buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard/products")} className="text-gray-400 hover:text-gray-800 transition">
            <FiArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold tracking-tight text-gray-800 leading-none">
            {isEditMode ? "Edit Product" : "New Product"}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle buttons */}
          <div className="flex rounded overflow-hidden border border-gray-300 text-xs font-medium">
            <button
              type="button"
              className={`px-3 py-1 ${!showAllFields ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setShowAllFields(false)}
            >
              Necessary
            </button>
            <button
              type="button"
              className={`px-3 py-1 ${showAllFields ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setShowAllFields(true)}
            >
              All Fields
            </button>
          </div>

          <div className="flex gap-2">
            <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleExcelImport} className="hidden" />
            {!isEditMode && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  disabled={importing || loading}
                  className="flex justify-center items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded transition"
                >
                  <FiUpload size={14} /> {importing ? "Importing..." : "Excel Import"}
                </button>
                {/* NEW: Download Template button */}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex justify-center items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded transition"
                >
                  Download Template
                </button>
              </>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || importing}
              className="flex justify-center items-center gap-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold px-4 py-1.5 rounded shadow-sm transition"
            >
              <FiSave size={14} /> {loading ? "Saving..." : "Save Product"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-3 text-xs border border-red-100">{error}</div>}

      <form className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-2" onSubmit={handleSubmit}>
        {/* ===== SECTION 1: Identity ===== */}
        {(showAllFields ||
          necessaryFields.has("part_number") ||
          necessaryFields.has("product_name") ||
          necessaryFields.has("brand") ||
          necessaryFields.has("category") ||
          necessaryFields.has("barcode")) && (
          <div className={sectionHeaderClass}>1. Identity</div>
        )}

        {shouldShowField("part_number") && (
          <div className="col-span-1">
            {renderLabel("Part Number", true)}
            <input
              type="text"
              name="part_number"
              required
              value={formData.part_number}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("product_name") && (
          <div className="col-span-2">
            {renderLabel("Product Name", true)}
            <input
              type="text"
              name="product_name"
              required
              value={formData.product_name}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("brand") && (
          <div className="col-span-1">
            {renderLabel("Brand", true)}
            <select
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="">Select Brand...</option>
              {Array.isArray(brands) && brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {shouldShowField("category") && (
          <div className="col-span-1">
            {renderLabel("Category")}
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("barcode") && (
          <div className="col-span-1">
            {renderLabel("Barcode")}
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              className={`${inputClass} font-mono`}
            />
          </div>
        )}

        {/* ===== SECTION 2: Pricing & Sourcing ===== */}
        {(showAllFields ||
          necessaryFields.has("source") ||
          necessaryFields.has("purchase_cost_bdt") ||
          necessaryFields.has("wholesale_price_bdt") ||
          necessaryFields.has("retail_price_bdt") ||
          necessaryFields.has("mrp_inr") ||
          necessaryFields.has("markup_percentage")) && (
          <div className={sectionHeaderClass}>2. Pricing & Sourcing</div>
        )}

        {shouldShowField("source") && (
          <div className="col-span-1">
            {renderLabel("Source")}
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="Local">Local Purchase</option>
              <option value="Import">Import (India)</option>
            </select>
          </div>
        )}

        {shouldShowField("purchase_cost_bdt") && (
          <div className="col-span-1">
            {renderLabel("Purchase Cost (BDT)", true)}
            <input
              type="number"
              step="0.01"
              name="purchase_cost_bdt"
              required
              value={formData.purchase_cost_bdt}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("wholesale_price_bdt") && (
          <div className="col-span-1">
            {renderLabel("Wholesale (BDT)")}
            <input
              type="number"
              step="0.01"
              name="wholesale_price_bdt"
              value={formData.wholesale_price_bdt}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("retail_price_bdt") && (
          <div className="col-span-1">
            {renderLabel("Retail (BDT)")}
            <input
              type="number"
              step="0.01"
              name="retail_price_bdt"
              value={formData.retail_price_bdt}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("mrp_inr") && (
          <div className="col-span-1">
            {renderLabel("Indian MRP (INR)")}
            <input
              type="number"
              step="0.01"
              name="mrp_inr"
              value={formData.mrp_inr}
              disabled={formData.source !== "Import"}
              onChange={handleChange}
              className={`${inputClass} ${formData.source !== "Import" && "bg-gray-100 text-gray-400"}`}
            />
          </div>
        )}

        {shouldShowField("markup_percentage") && (
          <div className="col-span-1">
            {renderLabel("Markup %")}
            <input
              type="number"
              step="0.01"
              name="markup_percentage"
              value={formData.markup_percentage}
              disabled={formData.source !== "Import"}
              onChange={handleChange}
              className={`${inputClass} ${formData.source !== "Import" && "bg-gray-100 text-gray-400"}`}
            />
          </div>
        )}

        {/* ===== SECTION 3: Units & Specs ===== */}
        {(showAllFields ||
          necessaryFields.has("unit") ||
          necessaryFields.has("alternative_units") ||
          necessaryFields.has("weight") ||
          necessaryFields.has("hs_code") ||
          necessaryFields.has("vat_code") ||
          necessaryFields.has("vehicle_compatibility")) && (
          <div className={sectionHeaderClass}>3. Units & Specs</div>
        )}

        {shouldShowField("unit") && (
          <div className="col-span-1">
            {renderLabel("Unit")}
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("alternative_units") && (
          <div className="col-span-1">
            {renderLabel("Alt Units")}
            <input
              type="text"
              name="alternative_units"
              value={formData.alternative_units}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("weight") && (
          <div className="col-span-1">
            {renderLabel("Weight (kg/g)")}
            <input
              type="number"
              step="0.01"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. 1.25"
            />
          </div>
        )}

        {shouldShowField("hs_code") && (
          <div className="col-span-1">
            {renderLabel("HS Code", true)}
            <input
              type="text"
              name="hs_code"
              required
              value={formData.hs_code}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("vat_code") && (
          <div className="col-span-1">
            {renderLabel("VAT Code", true)}
            <input
              type="text"
              name="vat_code"
              required
              value={formData.vat_code}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("vehicle_compatibility") && (
          <div className="col-span-2">
            {renderLabel("Vehicle Compatibility")}
            <input
              type="text"
              name="vehicle_compatibility"
              value={formData.vehicle_compatibility}
              onChange={handleChange}
              placeholder="e.g., Honda CB 125"
              className={inputClass}
            />
          </div>
        )}

        {/* ===== SECTION 4: Stock & Status ===== */}
        {(showAllFields ||
          necessaryFields.has("min_stock_level") ||
          necessaryFields.has("reorder_point") ||
          necessaryFields.has("max_stock_level") ||
          necessaryFields.has("product_status") ||
          necessaryFields.has("damage_discount_price") ||
          necessaryFields.has("damage_remark")) && (
          <div className={sectionHeaderClass}>4. Stock & Status</div>
        )}

        {shouldShowField("min_stock_level") && (
          <div className="col-span-1">
            {renderLabel("Min Stock")}
            <input
              type="number"
              name="min_stock_level"
              value={formData.min_stock_level}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("reorder_point") && (
          <div className="col-span-1">
            {renderLabel("Reorder Point")}
            <input
              type="number"
              name="reorder_point"
              value={formData.reorder_point}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("max_stock_level") && (
          <div className="col-span-1">
            {renderLabel("Max Stock")}
            <input
              type="number"
              name="max_stock_level"
              value={formData.max_stock_level}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        )}

        {shouldShowField("product_status") && (
          <div className="col-span-1">
            {renderLabel("Status")}
            <select
              name="product_status"
              value={formData.product_status}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="Active">Active</option>
              <option value="Discontinued">Discontinued</option>
              <option value="Seasonal">Seasonal</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>
        )}

        {shouldShowField("damage_discount_price") && (
          <div className="col-span-1">
            {renderLabel("Damage Price")}
            <input
              type="number"
              step="0.01"
              name="damage_discount_price"
              value={formData.damage_discount_price}
              disabled={formData.product_status !== "Damaged"}
              onChange={handleChange}
              className={`${inputClass} ${formData.product_status !== "Damaged" && "bg-gray-100 text-gray-400"}`}
            />
          </div>
        )}

        {shouldShowField("damage_remark") && (
          <div className="col-span-1">
            {renderLabel("Damage Remark")}
            <input
              type="text"
              name="damage_remark"
              value={formData.damage_remark}
              disabled={formData.product_status !== "Damaged"}
              onChange={handleChange}
              className={`${inputClass} ${formData.product_status !== "Damaged" && "bg-gray-100 text-gray-400"}`}
            />
          </div>
        )}

        {/* ===== SECTION 5: Media ===== */}
        {showAllFields && (
          <>
            <div className={sectionHeaderClass}>5. Media</div>
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={`img-${num}`} className="col-span-1">
                {renderLabel(`Image ${num}`)}
                <input
                  type="file"
                  accept="image/*"
                  name={`image_${num}`}
                  onChange={handleChange}
                  className="w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                />
              </div>
            ))}
          </>
        )}
      </form>
    </div>
  );
}