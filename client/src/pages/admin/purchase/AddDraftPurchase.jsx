import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { userService } from "../../../api/user";
import {
  FiPlus,
  FiTrash2,
  FiLayers,
  FiEdit2,
  FiX,
  FiShoppingBag,
  FiSave,
  FiArrowLeft,
  FiSearch,
  FiUpload,
  FiDownload,
} from "react-icons/fi";
import { FaLocationArrow } from "react-icons/fa6";
import * as XLSX from "xlsx";

// --- CALCULATION HELPERS ---
const calcCurrentRate = (unitCost, discountPct) => {
  const cost = parseFloat(unitCost) || 0;
  const disc = parseFloat(discountPct) || 0;
  return cost - (cost * disc) / 100;
};

const calcNetDuty = (weight, duty) => {
  const w = parseFloat(weight) || 0;
  const d = parseFloat(duty) || 0;
  return w > 0 ? w * d : d;
};

const calcCost = (unitCost, discountPct, weight, duty) => {
  const currentRate = calcCurrentRate(unitCost, discountPct);
  const netDuty = calcNetDuty(weight, duty);
  return currentRate + netDuty;
};

const emptyManualItem = () => ({
  product: "",
  unit_cost_bdt: "",
  discount: "",
  duty: "",
  quantity: "",
  search: "",
  showDropdown: false,
});

export default function AddDraftPurchase() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [fetchingDraft, setFetchingDraft] = useState(isEditing);
  const [error, setError] = useState("");

  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [entryMode, setEntryMode] = useState("manual");
  const [selectedBrands, setSelectedBrands] = useState([]);

  const [orderData, setOrderData] = useState({
    remarks: "",
    entry_by: "",
  });

  const [manualItems, setManualItems] = useState([emptyManualItem()]);
  const [brandItems, setBrandItems] = useState([]);

  const dropdownRefs = useRef({});
  const fileInputRef = useRef(null);

  // --- Load Current User ---
  const loadCurrentUser = async (usersData) => {
    try {
      const storedUser = userService.getCurrentUserFromStorage();
      if (storedUser && storedUser.id) {
        const user = usersData?.find(u => u.id === storedUser.id);
        if (user) {
          setCurrentUser(user);
          if (!isEditing) {
            setOrderData(prev => ({ ...prev, entry_by: user.id }));
          }
          return;
        }
      }
      try {
        const user = await userService.getCurrentUser();
        if (user && user.id) {
          setCurrentUser(user);
          if (!isEditing) {
            setOrderData(prev => ({ ...prev, entry_by: user.id }));
          }
          localStorage.setItem('user', JSON.stringify(user));
          return;
        }
      } catch (err) {
        console.error("Failed to fetch current user from API", err);
      }
      if (usersData && usersData.length > 0) {
        const firstUser = usersData[0];
        setCurrentUser(firstUser);
        if (!isEditing) {
          setOrderData(prev => ({ ...prev, entry_by: firstUser.id }));
        }
      }
    } catch (err) {
      console.error("Error loading current user:", err);
    }
  };

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      const [prodRes, empRes, brandRes, stockRes, usersRes] = await Promise.all([
        axiosInstance.get("products/"),
        axiosInstance.get("person/employees/"),
        axiosInstance.get("brand/brands/"),
        axiosInstance.get("stock/stocks/"),
        axiosInstance.get("users/users/"),
      ]);

      // Keep a local reference to the freshly-fetched product list so we don't
      // depend on the `products` state variable being updated in time (React
      // batches state updates, so reading `products` from closure right after
      // setProducts() can still return the old/empty array).
      const productList = prodRes.data.results || prodRes.data;

      setProducts(productList);
      setEmployees(empRes.data.results || empRes.data);
      setBrands(brandRes.data.results || brandRes.data);
      setStocks(stockRes.data.results || stockRes.data);
      setUsers(usersRes.data || []);

      await loadCurrentUser(usersRes.data);

      if (isEditing) {
        // Pass the fresh product list directly instead of relying on state.
        await fetchDraftData(productList);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      setError("Warning: Could not load initial data. Check server connection.");
      setFetchingDraft(false);
    }
  };

  // --- FETCH DRAFT DATA FOR EDITING ---
  const fetchDraftData = async (productList) => {
    try {
      console.log("Fetching draft with ID:", id);
      const response = await axiosInstance.get(`draft-purchase/draft-orders/${id}/`);
      const draft = response.data;
      console.log("Draft data:", draft);

      const entryBy = currentUser?.id || draft.entry_by || "";

      setOrderData({
        remarks: draft.remarks || "",
        entry_by: entryBy,
      });

      if (draft.items && draft.items.length > 0) {
        // Use the product list passed in (fresh from the API call), falling
        // back to the `products` state in case this is ever called without
        // an explicit list.
        const list = productList || products;

        const items = draft.items.map((item) => {
          const product = list.find((p) => String(p.id) === String(item.product));
          // The search box only ever holds the part number — never the
          // product name. The name is rendered separately in its own column.
          const searchDisplay = product?.part_number || "";

          return {
            product: item.product,
            unit_cost_bdt: parseFloat(item.unit_cost_bdt).toFixed(2),
            discount: item.discount != null ? String(item.discount) : "",
            duty: item.duty != null ? String(item.duty) : "",
            quantity: item.quantity,
            search: searchDisplay,
            showDropdown: false,
          };
        });
        setManualItems(items);
        setManualItems((prev) => [...prev, emptyManualItem()]);
      }

      setFetchingDraft(false);
    } catch (err) {
      console.error("Failed to fetch draft", err);
      setError("Could not load draft for editing. The draft may not exist or you may not have permission.");
      setFetchingDraft(false);
      setTimeout(() => {
        navigate("/dashboard/draft-purchase");
      }, 2000);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // --- EXCEL IMPORT (works in both modes; switches to manual) ---
  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          setError("The Excel file is empty.");
          return;
        }

        const headers = Object.keys(jsonData[0]).map(h => h.toLowerCase().trim());
        const partNoIndex = headers.findIndex(h => h.includes('part') || h.includes('partno'));
        const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
        const mrpIndex = headers.findIndex(h => h.includes('mrp') || h.includes('price') || h.includes('cost'));
        const discountIndex = headers.findIndex(h => h.includes('discount'));
        const dutyIndex = headers.findIndex(h => h.includes('duty'));

        if (partNoIndex === -1 || quantityIndex === -1 || mrpIndex === -1) {
          setError("Excel must contain 'Part No', 'Quantity', and 'MRP' columns.");
          return;
        }

        const columnKeys = Object.keys(jsonData[0]);
        const partNoKey = columnKeys[partNoIndex];
        const quantityKey = columnKeys[quantityIndex];
        const mrpKey = columnKeys[mrpIndex];
        const discountKey = discountIndex !== -1 ? columnKeys[discountIndex] : null;
        const dutyKey = dutyIndex !== -1 ? columnKeys[dutyIndex] : null;

        const newItems = [];
        let hasError = false;

        jsonData.forEach((row, idx) => {
          const partNo = String(row[partNoKey] || "").trim();
          const quantity = parseFloat(row[quantityKey]);
          const mrp = parseFloat(row[mrpKey]);
          const discount = discountKey ? parseFloat(row[discountKey]) : 0;
          const duty = dutyKey ? parseFloat(row[dutyKey]) : 0;

          if (!partNo || isNaN(quantity) || isNaN(mrp)) {
            console.warn(`Skipping row ${idx + 2}: Invalid data`);
            return;
          }

          const product = products.find(p =>
            p.part_number && p.part_number.toLowerCase() === partNo.toLowerCase()
          );

          if (!product) {
            hasError = true;
            setError(`Product with Part No "${partNo}" not found in the system. Please check the part number.`);
            return;
          }

          const isDuplicate = manualItems.some(item =>
            String(item.product) === String(product.id)
          );

          if (!isDuplicate) {
            newItems.push({
              product: product.id,
              unit_cost_bdt: mrp.toFixed(2),
              discount: !isNaN(discount) && discount ? String(discount) : "",
              duty: !isNaN(duty) && duty ? String(duty) : "",
              quantity: quantity.toString(),
              search: product.part_number || "",  // use part number
              showDropdown: false,
            });
          }
        });

        if (hasError) return;

        if (newItems.length === 0) {
          setError("No valid products found in the Excel file.");
          return;
        }

        // Remove trailing empty row if any
        const updatedItems = [...manualItems];
        const lastItem = updatedItems[updatedItems.length - 1];
        if (lastItem && !lastItem.product && !lastItem.quantity && !lastItem.unit_cost_bdt) {
          updatedItems.pop();
        }

        setManualItems([...updatedItems, ...newItems, emptyManualItem()]);
        // Switch to manual mode so imported items are visible
        setEntryMode("manual");
        setError("");
        alert(`Successfully imported ${newItems.length} products from Excel.`);

      } catch (err) {
        console.error("Error reading Excel file:", err);
        setError("Failed to read Excel file. Please ensure it's a valid .xlsx or .xls file.");
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- DOWNLOAD TEMPLATE (unchanged) ---
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'Part No': '1100223/C', 'Quantity': 5, 'MRP': 618, 'Discount': 30, 'Duty': 300 },
        { 'Part No': '1570209/E', 'Quantity': 4, 'MRP': 502, 'Discount': 20, 'Duty': 250 },
        { 'Part No': '1570250/D', 'Quantity': 30, 'MRP': 160, 'Discount': 10, 'Duty': 100 },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "draft_purchase_import_template.xlsx");
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template.");
    }
  };

  // --- EXPORT ACTIVE ITEMS (both modes) ---
  const handleExportPurchase = () => {
    try {
      const activeItems = entryMode === "manual" ? manualItems : brandItems;
      const itemsToExport = activeItems.filter(
        (i) => i.product && parseFloat(i.quantity) > 0 && parseFloat(i.unit_cost_bdt) >= 0
      );

      if (itemsToExport.length === 0) {
        alert("No products to export. Please add products to the draft first.");
        return;
      }

      const exportData = itemsToExport.map((item, idx) => {
        const product = products.find((p) => String(p.id) === String(item.product));
        const unitCost = parseFloat(item.unit_cost_bdt || 0);
        const discount = parseFloat(item.discount || 0);
        const duty = parseFloat(item.duty || 0);
        const weight = parseFloat(entryMode === "manual" ? product?.weight : item.weight) || 0;
        const qty = parseFloat(item.quantity || 0);

        const currentRate = calcCurrentRate(unitCost, discount);
        const netDuty = calcNetDuty(weight, duty);
        const cost = calcCost(unitCost, discount, weight, duty);

        return {
          '#': idx + 1,
          'Part No': product?.part_number || "N/A",
          'Product Name': product?.product_name || product?.name || "Unknown",
          'Brand': product ? getBrandName(product.brand) : "N/A",
          'Unit Cost (BDT)': unitCost.toFixed(2),
          'Discount (%)': discount || 0,
          'Current Rate': currentRate.toFixed(2),
          'HS Code': product?.hs_code || "N/A",
          'Weight (kg)': product?.weight || "N/A",
          'Duty': duty || 0,
          'Net Duty': netDuty.toFixed(2),
          'Cost': cost.toFixed(2),
          'Quantity': qty,
          'Total': (cost * qty).toFixed(2),
          'Total MRP': (unitCost * qty).toFixed(2),
        };
      });

      // Grand total
      const grandTotal = itemsToExport.reduce((sum, item) => {
        const product = products.find((p) => String(p.id) === String(item.product));
        const weight = entryMode === "manual" ? product?.weight : item.weight;
        const cost = calcCost(item.unit_cost_bdt, item.discount, weight, item.duty);
        return sum + cost * (parseFloat(item.quantity) || 0);
      }, 0);

      const grandTotalMrp = itemsToExport.reduce((sum, item) => {
        return sum + (parseFloat(item.unit_cost_bdt) || 0) * (parseFloat(item.quantity) || 0);
      }, 0);

      const footerRow = {
        '#': '', 'Part No': '', 'Product Name': '', 'Brand': '',
        'Unit Cost (BDT)': '', 'Discount (%)': '', 'Current Rate': '',
        'HS Code': '', 'Weight (kg)': '', 'Duty': '', 'Net Duty': '',
        'Cost': '', 'Quantity': '',
        'Total': 'Grand Total: ৳ ' + grandTotal.toFixed(2),
        'Total MRP': 'Grand Total MRP: ৳ ' + grandTotalMrp.toFixed(2),
      };

      const finalData = [...exportData, footerRow];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(finalData);
      ws['!cols'] = [
        { wch: 5 }, { wch: 16 }, { wch: 26 }, { wch: 14 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
        { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
        { wch: 8 }, { wch: 18 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Draft Purchase Order");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `draft_purchase_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Error exporting draft:", err);
      alert("Failed to export draft to Excel.");
    }
  };

  // --- HELPERS ---
  const getProductStock = (productId) => {
    const stockItem = stocks.find((s) => String(s.product) === String(productId));
    return stockItem ? stockItem.current_quantity ?? 0 : 0;
  };

  const getBrandName = (brandId) => {
    if (!brandId) return "Generic";
    const brand = brands.find((b) => String(b.id) === String(brandId));
    return brand ? brand.name : "Unknown Brand";
  };

  // --- Apply discount/duty to all products of the same brand (Brand mode) ---
  const applyDiscountToBrand = (index) => {
    const item = brandItems[index];
    const product = products.find(p => String(p.id) === String(item.product));
    if (!product) return;
    const brandId = product.brand;
    const discountValue = item.discount;
    const newItems = brandItems.map((it) => {
      const prod = products.find(p => String(p.id) === String(it.product));
      if (prod && prod.brand === brandId) {
        return { ...it, discount: discountValue };
      }
      return it;
    });
    setBrandItems(newItems);
  };

  const applyDutyToBrand = (index) => {
    const item = brandItems[index];
    const product = products.find(p => String(p.id) === String(item.product));
    if (!product) return;
    const brandId = product.brand;
    const dutyValue = item.duty;
    const newItems = brandItems.map((it) => {
      const prod = products.find(p => String(p.id) === String(it.product));
      if (prod && prod.brand === brandId) {
        return { ...it, duty: dutyValue };
      }
      return it;
    });
    setBrandItems(newItems);
  };

  // --- HEADER HANDLERS ---
  const handleOrderChange = (e) => {
    setOrderData({ ...orderData, [e.target.name]: e.target.value });
  };

  // --- MANUAL MODE ---
  const handleManualItemChange = (index, field, value) => {
    const newItems = [...manualItems];
    if (field === "search") {
      newItems[index].search = value;
      newItems[index].showDropdown = true;
      setManualItems(newItems);
      return;
    }

    if (field === "product") {
      const isDuplicate = manualItems.some(
        (item, i) => i !== index && String(item.product) === String(value)
      );
      if (isDuplicate) {
        alert("This product is already added to the list!");
        return;
      }

      const selectedProduct = products.find((p) => String(p.id) === String(value));
      if (selectedProduct) {
        newItems[index].product = value;
        newItems[index].unit_cost_bdt = selectedProduct.purchase_cost_bdt || "";
        // Set search field to part number (or empty if none)
        newItems[index].search = selectedProduct.part_number || "";
        newItems[index].showDropdown = false;
      }
      if (index === newItems.length - 1) {
        newItems.push(emptyManualItem());
      }
    } else {
      newItems[index][field] = value;
    }
    setManualItems(newItems);
  };

  const removeManualRow = (index) => {
    if (manualItems.length > 1) {
      setManualItems(manualItems.filter((_, i) => i !== index));
    } else {
      setManualItems([emptyManualItem()]);
    }
  };

  const getFilteredProducts = (searchText) => {
    const lowerSearch = searchText.toLowerCase();
    const selectedProductIds = manualItems
      .map((item) => String(item.product))
      .filter((id) => id !== "");

    return products.filter((p) => {
      if (selectedProductIds.includes(String(p.id))) return false;
      const name = (p.product_name || p.name || "").toLowerCase();
      const brand = getBrandName(p.brand).toLowerCase();
      const part = (p.part_number || "").toLowerCase();
      return name.includes(lowerSearch) || brand.includes(lowerSearch) || part.includes(lowerSearch);
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      let outside = true;
      Object.keys(dropdownRefs.current).forEach((key) => {
        if (dropdownRefs.current[key] && dropdownRefs.current[key].contains(event.target)) {
          outside = false;
        }
      });
      if (outside) {
        setManualItems((prev) =>
          prev.map((item) => ({ ...item, showDropdown: false }))
        );
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- BRAND MODE ---
  const handleBrandDropdownSelect = (e) => {
    const brandId = Number(e.target.value);
    if (!brandId) return;
    if (!selectedBrands.includes(brandId)) {
      toggleBrandSelection(brandId);
    }
    e.target.value = "";
  };

  const toggleBrandSelection = (brandId) => {
    setSelectedBrands((prev) => {
      if (prev.includes(brandId)) {
        const newBrands = prev.filter((id) => id !== brandId);
        setBrandItems((currentItems) => {
          const removedProductIds = products
            .filter((p) => String(p.brand) === String(brandId))
            .map((p) => String(p.id));
          return currentItems.filter(
            (item) => !removedProductIds.includes(String(item.product))
          );
        });
        return newBrands;
      } else {
        const newBrands = [...prev, brandId];
        const productsToAdd = products.filter((p) => String(p.brand) === String(brandId));
        const newBatchItems = productsToAdd.map((p) => ({
          product: p.id,
          product_name: p.product_name || p.name,
          part_number: p.part_number || "",
          brand_name: getBrandName(p.brand),
          unit_cost_bdt: p.purchase_cost_bdt || "",
          discount: "",
          duty: "",
          quantity: "",
          current_stock: getProductStock(p.id),
          weight: p.weight || "",
          hs_code: p.hs_code || "",
        }));
        setBrandItems((currentItems) => {
          const existingProductIds = currentItems.map((item) => String(item.product));
          const uniqueNewItems = newBatchItems.filter(
            (item) => !existingProductIds.includes(String(item.product))
          );
          return [...currentItems, ...uniqueNewItems];
        });
        return newBrands;
      }
    });
  };

  const handleBrandItemChange = (index, field, value) => {
    const newItems = [...brandItems];
    newItems[index][field] = value;
    setBrandItems(newItems);
  };

  const removeBrandRow = (index) => {
    setBrandItems(brandItems.filter((_, i) => i !== index));
  };

  const clearEntireBatch = () => {
    setBrandItems([]);
    setSelectedBrands([]);
  };

  // --- CALCULATIONS (grand totals across active mode) ---
  const activeItems = entryMode === "manual" ? manualItems : brandItems;

  const grandTotal = activeItems.reduce((sum, item) => {
    const product = products.find((p) => String(p.id) === String(item.product));
    const weight = entryMode === "manual" ? product?.weight : item.weight;
    const qty = parseFloat(item.quantity) || 0;
    const cost = calcCost(item.unit_cost_bdt, item.discount, weight, item.duty);
    return sum + cost * qty;
  }, 0);

  const grandTotalMrp = activeItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const unitCost = parseFloat(item.unit_cost_bdt) || 0;
    return sum + unitCost * qty;
  }, 0);

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const entryBy = currentUser?.id || orderData.entry_by;
    if (!entryBy) {
      setError("Please ensure you are logged in to create a draft.");
      setLoading(false);
      return;
    }

    let itemsToSubmit = [];
    if (entryMode === "manual") {
      itemsToSubmit = manualItems.filter(
        (i) => i.product && parseFloat(i.quantity) > 0 && parseFloat(i.unit_cost_bdt) >= 0
      );
    } else {
      itemsToSubmit = brandItems.filter(
        (i) => parseFloat(i.quantity) > 0 && parseFloat(i.unit_cost_bdt) >= 0
      );
    }

    if (itemsToSubmit.length === 0) {
      setError("Please enter valid quantities and costs for at least one product.");
      setLoading(false);
      return;
    }

    const payload = {
      remarks: orderData.remarks || "",
      entry_by: parseInt(entryBy),
      items: itemsToSubmit.map((item) => ({
        product: item.product,
        quantity: parseInt(item.quantity, 10),
        unit_cost_bdt: parseFloat(item.unit_cost_bdt).toFixed(2),
        discount: item.discount ? parseFloat(item.discount) : 0,
        duty: item.duty ? parseFloat(item.duty) : 0,
      })),
    };

    try {
      if (isEditing) {
        await axiosInstance.put(`draft-purchase/draft-orders/${id}/`, payload);
      } else {
        await axiosInstance.post("draft-purchase/draft-orders/", payload);
      }
      navigate("/dashboard/draft-purchase");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to save draft entry. Check inputs.");
      setLoading(false);
    }
  };

  if (fetchingDraft) {
    return (
      <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen flex justify-center items-center">
        <p className="text-gray-500">Loading draft...</p>
      </div>
    );
  }

  // Check if any active item has quantity > 0 to show export button
  const hasActiveItems = activeItems.some(item => parseFloat(item.quantity) > 0 && item.product);

  return (
    <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded border border-gray-300"
          >
            <FiArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FiShoppingBag className="text-blue-600" /> {isEditing ? "Edit Draft Purchase" : "New Product Order Sheet"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {hasActiveItems && (
            <button
              type="button"
              onClick={handleExportPurchase}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
            >
              <FiDownload size={14} /> Export to Excel
            </button>
          )}
          <div className="text-right">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total (Cost)</span>
            <div className="text-xl font-bold text-blue-600">৳ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total MRP</span>
            <div className="text-xl font-bold text-gray-500">৳ {grandTotalMrp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-300 overflow-hidden">
        {/* --- ORDER HEADER --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2 bg-gray-50 border-b border-gray-300">
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Entry By (Auto)</label>
            <div className="w-full bg-gray-100 border border-gray-300 rounded p-1 text-sm text-gray-800">
              {currentUser ? (
                <span>{currentUser.full_name || currentUser.username || currentUser.first_name || "User"}</span>
              ) : (
                <span className="text-gray-400">Loading user...</span>
              )}
            </div>
            {currentUser && (
              <div className="mt-0.5 text-[9px] text-gray-400">
                ID: {currentUser.id} • {currentUser.email || "No email"}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Draft Number</label>
            <div className="w-full bg-gray-100 border border-gray-300 rounded p-1 text-sm text-gray-800">
              {isEditing ? "Auto-generated" : "Will be auto-generated"}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Remarks</label>
            <input
              type="text"
              name="remarks"
              value={orderData.remarks}
              onChange={handleOrderChange}
              className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* --- ENTRY MODE TOGGLE + IMPORT --- */}
        <div className="bg-gray-50 border-b border-gray-300 px-3 py-1.5 flex gap-2 flex-wrap items-center">
          <button
            type="button"
            onClick={() => setEntryMode("manual")}
            disabled={isEditing}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border transition ${
              entryMode === "manual"
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            } ${isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FiEdit2 size={14} /> Manual
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("brand")}
            disabled={isEditing}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border transition ${
              entryMode === "brand"
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            } ${isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FiLayers size={14} /> Batch by Brand
          </button>

          {/* Import Excel - always visible */}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelImport}
              accept=".xlsx,.xls"
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer transition"
            >
              <FiUpload size={14} /> Import Excel
            </label>
            <span className="text-[9px] text-gray-400">(Part No, Qty, MRP, Discount, Duty)</span>
          </div>

          {isEditing && entryMode === "brand" && (
            <span className="text-xs text-gray-500 ml-2">(Brand mode disabled for editing)</span>
          )}
        </div>

        {/* --- BRAND SELECTOR (only in brand mode) --- */}
        {!isEditing && entryMode === "brand" && (
          <div className="bg-blue-50/50 border-b border-gray-300 px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex-1 max-w-sm">
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">Add Brands</label>
              <select
                onChange={handleBrandDropdownSelect}
                defaultValue=""
                className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>-- Choose a Brand --</option>
                {brands.filter((b) => !selectedBrands.includes(b.id)).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {selectedBrands.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedBrands.map((id) => {
                    const b = brands.find((brand) => brand.id === id);
                    return b ? (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded border border-blue-200">
                        {b.name}
                        <button type="button" onClick={() => toggleBrandSelection(id)} className="text-blue-600 hover:text-blue-900 bg-white rounded-full p-0.5">
                          <FiX size={12} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            {brandItems.length > 0 && (
              <button type="button" onClick={clearEntireBatch} className="text-xs font-bold text-red-500 hover:text-red-700 underline whitespace-nowrap">
                Clear All
              </button>
            )}
          </div>
        )}

        {/* --- ITEMS TABLE --- */}
        <div className="overflow-x-auto overflow-y-visible pb-24">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">#</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">Part Number</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">Product Name</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Stock</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Unit Cost</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Discount %</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Curr. Rate</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">HS Code</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Weight</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Duty</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Net Duty</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Cost</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Qty</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">Total</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">Total MRP</th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Brand mode rows */}
              {!isEditing && entryMode === "brand" &&
                brandItems.map((item, index) => {
                  const unitCost = parseFloat(item.unit_cost_bdt) || 0;
                  const discount = parseFloat(item.discount) || 0;
                  const duty = parseFloat(item.duty) || 0;
                  const weight = parseFloat(item.weight) || 0;
                  const qty = parseFloat(item.quantity) || 0;

                  const currentRate = calcCurrentRate(unitCost, discount);
                  const netDuty = calcNetDuty(weight, duty);
                  const cost = calcCost(unitCost, discount, weight, duty);
                  const rowTotal = cost * qty;
                  const rowTotalMrp = unitCost * qty;

                  const product = products.find(p => String(p.id) === String(item.product));
                  const brandId = product?.brand;
                  const hasSameBrandItems = brandItems.some((it, idx) => {
                    if (idx === index) return false;
                    const p = products.find(pr => String(pr.id) === String(it.product));
                    return p && p.brand === brandId;
                  });

                  return (
                    <tr key={item.product} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-500">{index + 1}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono text-blue-600">{item.part_number || "-"}</td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="font-medium text-gray-800 text-xs">{item.product_name}</div>
                        <div className="text-[9px] text-gray-500 uppercase">{item.brand_name}</div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.current_stock <= 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                          {item.current_stock}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.unit_cost_bdt}
                          onChange={(e) => handleBrandItemChange(index, "unit_cost_bdt", e.target.value)}
                          className="w-20 bg-white border border-gray-300 rounded p-0.5 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none font-semibold text-blue-700"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={item.discount}
                            onChange={(e) => handleBrandItemChange(index, "discount", e.target.value)}
                            className="w-14 bg-white border border-gray-300 rounded p-0.5 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          {hasSameBrandItems && (
                            <button
                              type="button"
                              onClick={() => applyDiscountToBrand(index)}
                              className="text-gray-400 hover:text-blue-600 transition p-0.5"
                              title="Apply this discount to all products of the same brand"
                            >
                              <FaLocationArrow size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-xs text-gray-700">
                        {currentRate.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-600">
                        {item.hs_code || "-"}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-600">
                        {item.weight || "-"}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={item.duty}
                            onChange={(e) => handleBrandItemChange(index, "duty", e.target.value)}
                            className="w-14 bg-white border border-gray-300 rounded p-0.5 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          {hasSameBrandItems && (
                            <button
                              type="button"
                              onClick={() => applyDutyToBrand(index)}
                              className="text-gray-400 hover:text-blue-600 transition p-0.5"
                              title="Apply this duty to all products of the same brand"
                            >
                              <FaLocationArrow size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-xs text-gray-700">
                        {netDuty.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-xs font-semibold text-gray-800">
                        {cost.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => handleBrandItemChange(index, "quantity", e.target.value)}
                          className="w-16 bg-white border border-gray-300 rounded p-0.5 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-gray-700 text-xs">
                        {rowTotal.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-gray-500 text-xs">
                        {rowTotalMrp.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        <button type="button" onClick={() => removeBrandRow(index)} className="text-gray-400 hover:text-red-600 transition p-0.5">
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {/* Manual mode rows */}
              {entryMode === "manual" &&
                manualItems.map((item, index) => {
                  const selectedProd = products.find((p) => String(p.id) === String(item.product));
                  const currentStock = selectedProd ? getProductStock(selectedProd.id) : "-";
                  const partNumber = selectedProd?.part_number || "";
                  const productName = selectedProd ? (selectedProd.product_name || selectedProd.name) : "";
                  const filteredProducts = getFilteredProducts(item.search || "");
                  const weight = selectedProd?.weight || "";
                  const hsCode = selectedProd?.hs_code || "";

                  const unitCost = parseFloat(item.unit_cost_bdt) || 0;
                  const discount = parseFloat(item.discount) || 0;
                  const duty = parseFloat(item.duty) || 0;
                  const qty = parseFloat(item.quantity) || 0;

                  const currentRate = calcCurrentRate(unitCost, discount);
                  const netDuty = calcNetDuty(weight, duty);
                  const cost = calcCost(unitCost, discount, weight, duty);
                  const rowTotal = cost * qty;
                  const rowTotalMrp = unitCost * qty;

                  return (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-3 text-center text-xs text-gray-500">{index + 1}</td>

                      <td className={`border border-gray-300 px-2 py-3 overflow-visible ${item.showDropdown ? 'relative z-50' : 'relative z-10'}`}>
                        <div ref={(el) => (dropdownRefs.current[index] = el)}>
                          <div className="flex items-center border border-gray-300 rounded bg-white focus-within:ring-1 focus-within:ring-blue-500">
                            <FiSearch className="ml-1.5 text-gray-400" size={12} />
                            <input
                              type="text"
                              placeholder="Search part no..."
                              value={item.search || ""}
                              onChange={(e) => handleManualItemChange(index, "search", e.target.value)}
                              onFocus={() => {
                                const newItems = [...manualItems];
                                newItems[index].showDropdown = true;
                                setManualItems(newItems);
                              }}
                              className="w-28 bg-transparent p-1 text-xs text-gray-800 focus:outline-none font-mono"
                              autoComplete="off"
                            />
                            {item.product && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [...manualItems];
                                  newItems[index].product = "";
                                  newItems[index].search = "";
                                  newItems[index].unit_cost_bdt = "";
                                  newItems[index].showDropdown = false;
                                  setManualItems(newItems);
                                }}
                                className="mr-1 text-gray-400 hover:text-red-500"
                              >
                                <FiX size={12} />
                              </button>
                            )}
                          </div>
                          {item.showDropdown && (
                            <div className="absolute left-0 top-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto z-50 min-w-[280px]">
                              {filteredProducts.length > 0 ? (
                                <ul>
                                  {filteredProducts.map((p) => (
                                    <li
                                      key={p.id}
                                      className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-xs flex justify-between items-center"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleManualItemChange(index, "product", p.id);
                                      }}
                                    >
                                      <span>
                                        <span className="font-mono text-blue-600">{p.part_number || ""}</span>{" "}
                                        {p.product_name || p.name}{" "}
                                        <span className="text-[10px] text-gray-500">({getBrandName(p.brand)})</span>
                                      </span>
                                      <span className="text-[10px] text-gray-400">Stock: {getProductStock(p.id)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="p-2 text-xs text-gray-400">No products found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-xs text-gray-800">
                        {productName || <span className="text-gray-300">-</span>}
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentStock !== "-" && currentStock <= 5 ? "bg-red-100 text-red-600" : "text-gray-600"}`}>
                          {currentStock}
                        </span>
                      </td>

                      <td className="border border-gray-300 px-2 py-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          placeholder="0.00"
                          value={item.unit_cost_bdt}
                          onChange={(e) => handleManualItemChange(index, "unit_cost_bdt", e.target.value)}
                          className="w-20 bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none font-semibold text-blue-700"
                        />
                      </td>

                      <td className="border border-gray-300 px-2 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={item.discount}
                          onChange={(e) => handleManualItemChange(index, "discount", e.target.value)}
                          className="w-16 bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-center font-mono text-xs text-gray-700">
                        {currentRate.toFixed(2)}
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-center text-xs text-gray-600">
                        {hsCode || "-"}
                      </td>
                      <td className="border border-gray-300 px-2 py-3 text-center text-xs text-gray-600">
                        {weight || "-"}
                      </td>

                      <td className="border border-gray-300 px-2 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={item.duty}
                          onChange={(e) => handleManualItemChange(index, "duty", e.target.value)}
                          className="w-16 bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-center font-mono text-xs text-gray-700">
                        {netDuty.toFixed(2)}
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-center font-mono text-xs font-semibold text-gray-800">
                        {cost.toFixed(2)}
                      </td>

                      <td className="border border-gray-300 px-2 py-3">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => handleManualItemChange(index, "quantity", e.target.value)}
                          className="w-16 bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-right font-mono font-bold text-gray-700 text-xs">
                        {rowTotal.toFixed(2)}
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-right font-mono text-gray-500 text-xs">
                        {rowTotalMrp.toFixed(2)}
                      </td>

                      <td className="border border-gray-300 px-2 py-3 text-center">
                        <button type="button" onClick={() => removeManualRow(index)} className="text-gray-400 hover:text-red-600 transition p-0.5" title="Remove row">
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!isEditing && entryMode === "brand" && brandItems.length === 0 && (
                <tr>
                  <td colSpan="16" className="border border-gray-300 px-3 py-4 text-center text-gray-400 text-sm">
                    Use the brand selector above to load products.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- ADD ROW BUTTON (Manual only) --- */}
        {entryMode === "manual" && (
          <div className="p-2 border-t border-gray-200 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setManualItems([...manualItems, emptyManualItem()])}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              <FiPlus size={14} /> Add Row
            </button>
            <div className="text-[10px] text-gray-400">
              <span className="font-medium">Tip:</span> Import Excel to add multiple products at once
            </div>
          </div>
        )}

        {/* --- SUBMIT BAR --- */}
        <div className="p-3 bg-gray-50 border-t border-gray-300 flex flex-col sm:flex-row justify-end gap-2">
          <button type="button" onClick={() => navigate("/dashboard/draft-purchase")} className="px-4 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-200 transition border border-gray-300">
            Cancel
          </button>
          <button type="submit" disabled={loading} className={`px-6 py-1.5 rounded text-sm font-bold text-white transition ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
            {loading ? "Saving..." : isEditing ? "Update Draft" : "Save Draft"}
          </button>
        </div>
      </form>
    </div>
  );
} 
//