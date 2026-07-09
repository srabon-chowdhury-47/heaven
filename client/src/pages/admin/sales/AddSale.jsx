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
  FiShoppingCart,
  FiUserPlus,
  FiSave,
  FiArrowLeft,
  FiSearch,
  FiUpload,
  FiTrendingUp,
} from "react-icons/fi";

export default function AddSale() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [fetchingSale, setFetchingSale] = useState(isEditing);
  const [error, setError] = useState("");

  // --- CORE DATA STATES ---
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // --- UI TOGGLE STATE ---
  const [entryMode, setEntryMode] = useState("manual");
  const [selectedBrands, setSelectedBrands] = useState([]);

  // --- ORDER HEADER ---
  const [orderData, setOrderData] = useState({
    customer: "",
    sold_by: "",
    invoice_number: "",
    payment_status: "Paid",
    remarks: "",
  });

  // --- Customer search/autocomplete ---
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [selectedCustomerDisplayName, setSelectedCustomerDisplayName] = useState("");
  const customerDropdownRef = useRef(null);

  // --- ITEM STATES ---
  const [manualItems, setManualItems] = useState([
    { 
      product: "", 
      purchase_price_bdt: "",
      multiplier: "",
      unit_price_bdt: "", 
      quantity: "", 
      search: "", 
      showDropdown: false 
    },
  ]);
  const [brandItems, setBrandItems] = useState([]);

  // --- CUSTOMER MODAL ---
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    shop_name: "",
    proprietor_name: "",
    mobile1: "",
    division: "",
    district: "",
    town_village: "",
  });

  // --- DRAFT IMPORT MODAL ---
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftList, setDraftList] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  // Refs for dropdown outside click handling
  const dropdownRefs = useRef({});

  // --- Load Current User ---
  const loadCurrentUser = async (usersData) => {
    try {
      const storedUser = userService.getCurrentUserFromStorage();
      if (storedUser && storedUser.id) {
        const user = usersData?.find(u => u.id === storedUser.id);
        if (user) {
          setCurrentUser(user);
          if (!isEditing) {
            setOrderData(prev => ({
              ...prev,
              sold_by: user.id
            }));
          }
          return;
        }
      }

      try {
        const user = await userService.getCurrentUser();
        if (user && user.id) {
          setCurrentUser(user);
          if (!isEditing) {
            setOrderData(prev => ({
              ...prev,
              sold_by: user.id
            }));
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
          setOrderData(prev => ({
            ...prev,
            sold_by: firstUser.id
          }));
        }
      }
    } catch (err) {
      console.error("Error loading current user:", err);
    }
  };

  // --- FETCH SALE DATA FOR EDITING ---
  const fetchSaleData = async () => {
    try {
      const response = await axiosInstance.get(`sale/sales/${id}/`);
      const sale = response.data;

      // Set the current user as the sold_by when editing
      const soldBy = currentUser?.id || sale.sold_by || "";

      setOrderData({
        customer: sale.customer || "",
        sold_by: soldBy,
        payment_status: sale.payment_status || "Paid",
        remarks: sale.remarks || "",
      });

      // Set customer name for display
      if (sale.customer) {
        const cust = customers.find((c) => String(c.id) === String(sale.customer));
        if (cust) {
          const displayName = cust.shop_name || cust.proprietor_name || cust.name || "Unknown";
          setSelectedCustomerName(displayName);
          setSelectedCustomerDisplayName(displayName);
          setCustomerSearchTerm(displayName);
        }
      }

      if (sale.items && sale.items.length > 0) {
        const items = sale.items.map((item) => {
          // Find the product - try multiple ways
          let product = products.find((p) => String(p.id) === String(item.product));
          
          if (!product && item.product_id) {
            product = products.find((p) => String(p.id) === String(item.product_id));
          }
          
          if (!product && item.product_name) {
            product = products.find((p) => 
              (p.product_name || p.name || "").toLowerCase() === item.product_name.toLowerCase()
            );
          }

          const partNumber = product?.part_number || "";
          const productName = item.product_name || product?.product_name || product?.name || "";
          const searchText = partNumber ? `${partNumber} - ${productName}` : productName;
          
          // IMPORTANT: Get purchase price from product
          const purchasePrice = product?.purchase_cost_bdt || 0;

          let multiplier = item.multiplier || "";
          if (!multiplier && purchasePrice > 0 && parseFloat(item.unit_price_bdt) > 0) {
            const salePrice = parseFloat(item.unit_price_bdt);
            multiplier = (salePrice / purchasePrice).toFixed(2);
          }

          return {
            product: item.product,
            purchase_price_bdt: purchasePrice,
            multiplier: multiplier,
            unit_price_bdt: parseFloat(item.unit_price_bdt).toFixed(2),
            quantity: item.quantity,
            search: searchText,
            showDropdown: false,
          };
        });
        
        setManualItems(items);
        // Add an empty row at the end
        setManualItems((prev) => [...prev, { 
          product: "", 
          purchase_price_bdt: "", 
          multiplier: "", 
          unit_price_bdt: "", 
          quantity: "", 
          search: "", 
          showDropdown: false 
        }]);
      }

      setFetchingSale(false);
    } catch (err) {
      console.error("Failed to fetch sale", err);
      setError("Could not load sale for editing. The sale may not exist or you may not have permission.");
      setFetchingSale(false);
      setTimeout(() => {
        navigate("/dashboard/sales");
      }, 2000);
    }
  };

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, empRes, custRes, brandRes, stockRes, usersRes] = await Promise.all([
          axiosInstance.get("products/"),
          axiosInstance.get("person/employees/"),
          axiosInstance.get("person/customers/"),
          axiosInstance.get("brand/brands/"),
          axiosInstance.get("stock/stocks/"),
          axiosInstance.get("users/users/"),
        ]);

        const productsData = prodRes.data.results || prodRes.data;
        setProducts(productsData);
        setEmployees(empRes.data.results || empRes.data);
        setCustomers(custRes.data.results || custRes.data);
        setBrands(brandRes.data.results || brandRes.data);
        setStocks(stockRes.data.results || stockRes.data);
        setUsers(usersRes.data || []);

        await loadCurrentUser(usersRes.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
        setError("Warning: Could not load initial data. Check server connection.");
        setFetchingSale(false);
      }
    };
    fetchData();
  }, [id]);

  // --- SEPARATE USEFFECT FOR FETCHING SALE DATA (LIKE DRAFT SALE) ---
  useEffect(() => {
    if (!isEditing) return;
    if (products.length === 0) return;
    if (customers.length === 0) return;

    fetchSaleData();
  }, [isEditing, products, customers]);

  // --- Debounced customer search ---
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (customerSearchTerm.trim() === selectedCustomerDisplayName) {
        setCustomerOptions([]);
        setIsCustomerDropdownOpen(false);
        return;
      }
      if (customerSearchTerm.trim().length > 0) {
        fetchCustomerOptions(customerSearchTerm.trim());
      } else {
        setCustomerOptions([]);
        setIsCustomerDropdownOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [customerSearchTerm, selectedCustomerDisplayName]);

  const fetchCustomerOptions = async (search) => {
    try {
      const response = await axiosInstance.get("person/customers/", {
        params: { search: search },
      });
      const results = response.data.results || response.data || [];
      setCustomerOptions(results);
      setIsCustomerDropdownOpen(results.length > 0);
    } catch (err) {
      console.error("Customer search failed", err);
      setCustomerOptions([]);
      setIsCustomerDropdownOpen(false);
    }
  };

  const selectCustomer = (customer) => {
    setOrderData({ ...orderData, customer: customer.id });
    const displayName = customer.shop_name || customer.proprietor_name || customer.name || "Unknown";
    setSelectedCustomerName(displayName);
    setSelectedCustomerDisplayName(displayName);
    setCustomerSearchTerm(displayName);
    setCustomerOptions([]);
    setIsCustomerDropdownOpen(false);
  };

  const clearCustomer = () => {
    setOrderData({ ...orderData, customer: "" });
    setSelectedCustomerName("");
    setSelectedCustomerDisplayName("");
    setCustomerSearchTerm("");
    setCustomerOptions([]);
    setIsCustomerDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleOrderChange = (e) => {
    setOrderData({ ...orderData, [e.target.name]: e.target.value });
  };

  // --- Calculate sale price from purchase price and multiplier ---
  const calculateSalePrice = (purchasePrice, multiplier) => {
    if (!purchasePrice || !multiplier) return "";
    const price = parseFloat(purchasePrice);
    const mult = parseFloat(multiplier);
    if (isNaN(price) || isNaN(mult) || price <= 0 || mult <= 0) return "";
    return (price * mult).toFixed(2);
  };

  // --- Calculate multiplier from purchase price and sale price ---
  const calculateMultiplier = (purchasePrice, salePrice) => {
    if (!purchasePrice || !salePrice) return "";
    const cost = parseFloat(purchasePrice);
    const price = parseFloat(salePrice);
    if (isNaN(cost) || isNaN(price) || cost <= 0 || price <= 0) return "";
    return (price / cost).toFixed(2);
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
        const purchasePrice = selectedProduct.purchase_cost_bdt || 0;
        newItems[index].purchase_price_bdt = purchasePrice;
        newItems[index].multiplier = "";
        newItems[index].unit_price_bdt = "";
        const partNum = selectedProduct.part_number || "";
        const name = selectedProduct.product_name || selectedProduct.name || "";
        newItems[index].search = partNum ? `${partNum} - ${name}` : name;
        newItems[index].showDropdown = false;
      }
      if (index === newItems.length - 1) {
        newItems.push({ 
          product: "", 
          purchase_price_bdt: "", 
          multiplier: "", 
          unit_price_bdt: "", 
          quantity: "", 
          search: "", 
          showDropdown: false 
        });
      }
    } else if (field === "multiplier") {
      newItems[index].multiplier = value;
      const salePrice = calculateSalePrice(newItems[index].purchase_price_bdt, value);
      newItems[index].unit_price_bdt = salePrice;
    } else if (field === "unit_price_bdt") {
      newItems[index].unit_price_bdt = value;
      const multiplier = calculateMultiplier(newItems[index].purchase_price_bdt, value);
      newItems[index].multiplier = multiplier;
    } else if (field === "purchase_price_bdt") {
      newItems[index].purchase_price_bdt = value;
      if (newItems[index].multiplier) {
        const salePrice = calculateSalePrice(value, newItems[index].multiplier);
        newItems[index].unit_price_bdt = salePrice;
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
      setManualItems([{ 
        product: "", 
        purchase_price_bdt: "", 
        multiplier: "", 
        unit_price_bdt: "", 
        quantity: "", 
        search: "", 
        showDropdown: false 
      }]);
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
          purchase_cost_bdt: p.purchase_cost_bdt || 0,
          multiplier: "",
          unit_price_bdt: "",
          quantity: "",
          current_stock: getProductStock(p.id),
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
    
    if (field === "multiplier") {
      newItems[index].multiplier = value;
      const salePrice = calculateSalePrice(newItems[index].purchase_cost_bdt, value);
      newItems[index].unit_price_bdt = salePrice;
    } else if (field === "unit_price_bdt") {
      newItems[index].unit_price_bdt = value;
      const multiplier = calculateMultiplier(newItems[index].purchase_cost_bdt, value);
      newItems[index].multiplier = multiplier;
    } else if (field === "purchase_cost_bdt") {
      newItems[index].purchase_cost_bdt = value;
      if (newItems[index].multiplier) {
        const salePrice = calculateSalePrice(value, newItems[index].multiplier);
        newItems[index].unit_price_bdt = salePrice;
      }
    } else {
      newItems[index][field] = value;
    }
    
    setBrandItems(newItems);
  };

  const removeBrandRow = (index) => {
    setBrandItems(brandItems.filter((_, i) => i !== index));
  };

  const clearEntireBatch = () => {
    setBrandItems([]);
    setSelectedBrands([]);
  };

  // --- CREATE CUSTOMER ---
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustomerLoading(true);
    const customerPayload = { ...newCustomerData, customer_type: "Retail" };
    try {
      const response = await axiosInstance.post("person/customers/", customerPayload);
      const newlyCreatedCustomer = response.data;
      setCustomers((prev) => [...prev, newlyCreatedCustomer]);
      selectCustomer(newlyCreatedCustomer);
      setIsCustomerModalOpen(false);
      setNewCustomerData({
        shop_name: "",
        proprietor_name: "",
        mobile1: "",
        division: "",
        district: "",
        town_village: "",
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to add customer. Check unique fields (mobile).");
    } finally {
      setCustomerLoading(false);
    }
  };

  // --- DRAFT IMPORT FUNCTIONS ---
  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await axiosInstance.get("draft-sale/draft-sales/");
      setDraftList(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load drafts.");
    } finally {
      setLoadingDrafts(false);
    }
  };

  const importDraft = (draft) => {
    if (draft.customer) {
      const cust = customers.find((c) => String(c.id) === String(draft.customer));
      if (cust) {
        const displayName = cust.shop_name || cust.proprietor_name || cust.name || "Unknown";
        setSelectedCustomerName(displayName);
        setSelectedCustomerDisplayName(displayName);
        setCustomerSearchTerm(displayName);
      } else {
        setSelectedCustomerName(`Customer #${draft.customer}`);
        setSelectedCustomerDisplayName(`Customer #${draft.customer}`);
        setCustomerSearchTerm(`Customer #${draft.customer}`);
      }
      setOrderData((prev) => ({
        ...prev,
        customer: draft.customer,
        remarks: draft.remarks || "",
      }));
    } else {
      setOrderData((prev) => ({
        ...prev,
        customer: "",
        remarks: draft.remarks || "",
      }));
    }

    const items = draft.items.map((item) => {
      const product = products.find((p) => String(p.id) === String(item.product));
      const partNumber = product?.part_number || "";
      const productName = item.product_name || product?.product_name || product?.name || "";
      const searchText = partNumber ? `${partNumber} - ${productName}` : productName;
      const purchasePrice = product?.purchase_cost_bdt || 0;
      
      let multiplier = item.multiplier || "";
      if (!multiplier && purchasePrice > 0 && parseFloat(item.unit_price_bdt) > 0) {
        const salePrice = parseFloat(item.unit_price_bdt);
        multiplier = (salePrice / purchasePrice).toFixed(2);
      }

      return {
        product: item.product,
        purchase_price_bdt: purchasePrice,
        multiplier: multiplier,
        unit_price_bdt: parseFloat(item.unit_price_bdt).toFixed(2),
        quantity: item.quantity,
        search: searchText,
        showDropdown: false,
      };
    });
    items.push({ 
      product: "", 
      purchase_price_bdt: "", 
      multiplier: "", 
      unit_price_bdt: "", 
      quantity: "", 
      search: "", 
      showDropdown: false 
    });
    setManualItems(items);
    setShowDraftModal(false);
  };

  // --- CALCULATIONS ---
  const activeItems = entryMode === "manual" ? manualItems : brandItems;
  const grandTotal = activeItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price_bdt) || 0;
    return sum + qty * price;
  }, 0);

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Ensure sold_by is set to current user
    const soldBy = currentUser?.id || orderData.sold_by;
    if (!soldBy) {
      setError("Please select the Employee making this sale.");
      setLoading(false);
      return;
    }

    let itemsToSubmit = [];
    if (entryMode === "manual") {
      itemsToSubmit = manualItems.filter(
        (i) => i.product && parseFloat(i.quantity) > 0 && parseFloat(i.unit_price_bdt) >= 0
      );
    } else {
      itemsToSubmit = brandItems.filter(
        (i) => parseFloat(i.quantity) > 0 && parseFloat(i.unit_price_bdt) >= 0
      );
    }

    if (itemsToSubmit.length === 0) {
      setError("Please enter valid quantities and prices for at least one product.");
      setLoading(false);
      return;
    }

    const payload = {
      customer: orderData.customer ? parseInt(orderData.customer) : null,
      sold_by: parseInt(soldBy),
      payment_status: orderData.payment_status || "Paid",
      remarks: orderData.remarks || "",
      items: itemsToSubmit.map((item) => ({
        product: item.product,
        quantity: parseInt(item.quantity, 10),
        unit_price_bdt: parseFloat(item.unit_price_bdt).toFixed(2),
        multiplier: item.multiplier ? parseFloat(item.multiplier).toFixed(2) : null,
      })),
    };

    try {
      if (isEditing) {
        await axiosInstance.put(`sale/sales/${id}/`, payload);
      } else {
        await axiosInstance.post("sale/sales/", payload);
      }
      navigate("/dashboard/sales");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to process sale. Check stock levels and inputs.");
      setLoading(false);
    }
  };

  if (fetchingSale) {
    return (
      <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen flex justify-center items-center">
        <p className="text-gray-500">Loading sale...</p>
      </div>
    );
  }

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
            <FiShoppingCart className="text-green-600" /> {isEditing ? "Edit Sale Order" : "New Sale Order"}
          </h1>
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setShowDraftModal(true);
                fetchDrafts();
              }}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded border border-blue-700 transition"
            >
              <FiUpload size={14} /> Import Draft
            </button>
          )}
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total Value</span>
          <div className="text-xl font-bold text-green-600">৳ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-300 overflow-hidden">
        {/* --- ORDER HEADER (Compact Grid) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-2 bg-gray-50 border-b border-gray-300">
          {/* Customer combobox with always-visible Add New button */}
          <div ref={customerDropdownRef} className="relative">
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Customer
            </label>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 relative">
                <div className="flex items-center border border-gray-300 rounded bg-white focus-within:ring-1 focus-within:ring-green-500">
                  <FiSearch className="ml-1.5 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by name, mobile or shop"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setCustomerSearchTerm(newValue);
                      if (selectedCustomerDisplayName && newValue !== selectedCustomerDisplayName) {
                        clearCustomer();
                      }
                      if (newValue === "") {
                        clearCustomer();
                      }
                    }}
                    onFocus={() => {
                      if (customerSearchTerm.trim().length > 0 && customerOptions.length > 0) {
                        setIsCustomerDropdownOpen(true);
                      }
                    }}
                    className="w-full bg-transparent p-1 text-sm text-gray-800 focus:outline-none"
                    autoComplete="off"
                  />
                  {orderData.customer && (
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="mr-1 text-gray-400 hover:text-red-500"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </div>
                {isCustomerDropdownOpen && customerOptions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto z-50">
                    <ul>
                      {customerOptions.map((cust) => {
                        const display = cust.shop_name || cust.proprietor_name || cust.name || "Unknown";
                        return (
                          <li
                            key={cust.id}
                            className="px-2 py-1.5 hover:bg-green-100 cursor-pointer text-sm flex justify-between items-center"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectCustomer(cust);
                            }}
                          >
                            <span>{display}</span>
                            <span className="text-[10px] text-gray-500">{cust.mobile1}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCustomerDropdownOpen(false);
                  setIsCustomerModalOpen(true);
                }}
                className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1 border border-green-700"
              >
                <FiUserPlus size={14} /> Add New
              </button>
            </div>
            {orderData.customer && (
              <div className="mt-0.5 text-xs text-green-700 font-medium">
                Selected: {selectedCustomerName}
              </div>
            )}
          </div>

          {/* Sold By - Auto-filled with current user */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Sold By (Auto)
            </label>
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
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Payment Status
            </label>
            <select
              name="payment_status"
              value={orderData.payment_status}
              onChange={handleOrderChange}
              className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Remarks
            </label>
            <input
              type="text"
              name="remarks"
              value={orderData.remarks}
              onChange={handleOrderChange}
              className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
        </div>

        {/* --- ENTRY MODE TOGGLE --- */}
        <div className="bg-gray-50 border-b border-gray-300 px-3 py-1.5 flex gap-2">
          <button
            type="button"
            onClick={() => setEntryMode("manual")}
            disabled={isEditing}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border transition ${
              entryMode === "manual"
                ? "bg-green-100 text-green-800 border-green-300"
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
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            } ${isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FiLayers size={14} /> Batch by Brand
          </button>
          {isEditing && <span className="text-xs text-gray-500 ml-2">(Mode switching disabled for editing)</span>}
        </div>

        {/* --- BRAND SELECTOR --- */}
        {!isEditing && entryMode === "brand" && (
          <div className="bg-green-50/50 border-b border-gray-300 px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex-1 max-w-sm">
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                Add Brands
              </label>
              <select
                onChange={handleBrandDropdownSelect}
                defaultValue=""
                className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 focus:ring-1 focus:ring-green-500 outline-none"
              >
                <option value="" disabled>-- Choose a Brand --</option>
                {brands
                  .filter((b) => !selectedBrands.includes(b.id))
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
              {selectedBrands.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedBrands.map((id) => {
                    const b = brands.find((brand) => brand.id === id);
                    return b ? (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded border border-green-200"
                      >
                        {b.name}
                        <button
                          type="button"
                          onClick={() => toggleBrandSelection(id)}
                          className="text-green-600 hover:text-green-900 bg-white rounded-full p-0.5"
                        >
                          <FiX size={12} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            {brandItems.length > 0 && (
              <button
                type="button"
                onClick={clearEntireBatch}
                className="text-xs font-bold text-red-500 hover:text-red-700 underline whitespace-nowrap"
              >
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
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                  Product & Brand
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Stock
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Purch. Cost
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Multiplier (×)
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Sell Price
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Qty
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                  Total
                </th>
                <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {!isEditing && entryMode === "brand" &&
                brandItems.map((item, index) => (
                  <tr key={item.product} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-500">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5">
                      <div className="font-medium text-gray-800 text-xs">
                        {item.part_number && <span className="text-blue-600 mr-1">{item.part_number}</span>}
                        {item.product_name}
                      </div>
                      <div className="text-[9px] text-gray-500 uppercase">{item.brand_name}</div>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.current_stock <= 5
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center font-mono text-gray-500 text-xs">
                      {parseFloat(item.purchase_cost_bdt).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="×"
                          value={item.multiplier}
                          onChange={(e) =>
                            handleBrandItemChange(index, "multiplier", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 rounded p-0.5 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none"
                        />
                        <FiTrendingUp className="text-gray-400" size={12} />
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.unit_price_bdt}
                        onChange={(e) =>
                          handleBrandItemChange(index, "unit_price_bdt", e.target.value)
                        }
                        className="w-full bg-white border border-gray-300 rounded p-0.5 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none font-semibold text-green-700"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) =>
                          handleBrandItemChange(index, "quantity", e.target.value)
                        }
                        className="w-full bg-white border border-gray-300 rounded p-0.5 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right font-mono font-bold text-gray-700 text-xs">
                      {(
                        (parseFloat(item.quantity) || 0) *
                        (parseFloat(item.unit_price_bdt) || 0)
                      ).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeBrandRow(index)}
                        className="text-gray-400 hover:text-red-600 transition p-0.5"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

              {entryMode === "manual" &&
                manualItems.map((item, index) => {
                  const selectedProd = products.find(
                    (p) => String(p.id) === String(item.product)
                  );
                  const manualBrandName = selectedProd ? getBrandName(selectedProd.brand) : "";
                  const currentStock = selectedProd ? getProductStock(selectedProd.id) : "-";
                  const purchaseCost = selectedProd
                    ? parseFloat(selectedProd.purchase_cost_bdt).toFixed(2)
                    : "-";
                  const partNumber = selectedProd?.part_number || "";

                  const filteredProducts = getFilteredProducts(item.search || "");

                  return (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-2 py-3 text-center text-xs text-gray-500">{index + 1}</td>
                      <td className={`border border-gray-300 px-2 py-3 overflow-visible ${item.showDropdown ? 'relative z-50' : 'relative z-10'}`}>
                        <div ref={(el) => (dropdownRefs.current[index] = el)}>
                          <div className="flex items-center border border-gray-300 rounded bg-white focus-within:ring-1 focus-within:ring-green-500">
                            <FiSearch className="ml-1.5 text-gray-400" size={12} />
                            <input
                              type="text"
                              placeholder="Search by part number or name..."
                              value={item.search || ""}
                              onChange={(e) =>
                                handleManualItemChange(index, "search", e.target.value)
                              }
                              onFocus={() => {
                                const newItems = [...manualItems];
                                newItems[index].showDropdown = true;
                                setManualItems(newItems);
                              }}
                              className="w-full bg-transparent p-1 text-xs text-gray-800 focus:outline-none"
                              autoComplete="off"
                            />
                            {item.product && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [...manualItems];
                                  newItems[index].product = "";
                                  newItems[index].search = "";
                                  newItems[index].purchase_price_bdt = "";
                                  newItems[index].multiplier = "";
                                  newItems[index].unit_price_bdt = "";
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
                            <div className="absolute left-0 right-0 top-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto z-50">
                              {filteredProducts.length > 0 ? (
                                <ul>
                                  {filteredProducts.map((p) => (
                                    <li
                                      key={p.id}
                                      className="px-2 py-1 hover:bg-green-100 cursor-pointer text-xs flex justify-between items-center"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleManualItemChange(index, "product", p.id);
                                      }}
                                    >
                                      <span>
                                        <span className="font-mono text-blue-600">{p.part_number || ""}</span>{" "}
                                        {p.product_name || p.name}{" "}
                                        <span className="text-[10px] text-gray-500">
                                          ({getBrandName(p.brand)})
                                        </span>
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        Stock: {getProductStock(p.id)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="p-2 text-xs text-gray-400">
                                  No additional products found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedProd && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-gray-600">
                            {partNumber && <span className="font-mono text-blue-600">{partNumber}</span>}
                            <span className="uppercase">{manualBrandName}</span>
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 py-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            currentStock !== "-" && currentStock <= 5
                              ? "bg-red-100 text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {currentStock}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-3 text-center font-mono text-gray-500 text-xs">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.purchase_price_bdt}
                          onChange={(e) =>
                            handleManualItemChange(index, "purchase_price_bdt", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-3">
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="×"
                            value={item.multiplier}
                            onChange={(e) =>
                              handleManualItemChange(index, "multiplier", e.target.value)
                            }
                            className="w-full bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none"
                          />
                          <FiTrendingUp className="text-gray-400" size={14} />
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          placeholder="0.00"
                          value={item.unit_price_bdt}
                          onChange={(e) =>
                            handleManualItemChange(index, "unit_price_bdt", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none font-semibold text-green-700"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-3">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleManualItemChange(index, "quantity", e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 rounded p-1 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-3 text-right font-mono font-bold text-gray-700 text-xs">
                        {(
                          (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.unit_price_bdt) || 0)
                        ).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeManualRow(index)}
                          className="text-gray-400 hover:text-red-600 transition p-0.5"
                          title="Remove row"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!isEditing && entryMode === "brand" && brandItems.length === 0 && (
                <tr>
                  <td colSpan="9" className="border border-gray-300 px-3 py-4 text-center text-gray-400 text-sm">
                    Use the brand selector above to load products.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- ADD ROW BUTTON (Manual only) --- */}
        {entryMode === "manual" && (
          <div className="p-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() =>
                setManualItems([...manualItems, { 
                  product: "", 
                  purchase_price_bdt: "", 
                  multiplier: "", 
                  unit_price_bdt: "", 
                  quantity: "", 
                  search: "", 
                  showDropdown: false 
                }])
              }
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-semibold"
            >
              <FiPlus size={14} /> Add Row
            </button>
          </div>
        )}

        {/* --- SUBMIT BAR --- */}
        <div className="p-3 bg-gray-50 border-t border-gray-300 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard/sales")}
            className="px-4 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-200 transition border border-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-1.5 rounded text-sm font-bold text-white transition ${
              loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Processing..." : isEditing ? "Update Sale" : "Complete Sale"}
          </button>
        </div>
      </form>

      {/* --- CUSTOMER MODAL --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-3">
          <div className="bg-white border border-gray-300 w-full max-w-md rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FiUserPlus className="text-green-600" /> Quick Add Customer
              </h2>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-gray-500 hover:text-red-500"
              >
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="overflow-y-auto flex-1 p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={newCustomerData.shop_name}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, shop_name: e.target.value })
                    }
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                    placeholder="e.g. Dhaka Motors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Proprietor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerData.proprietor_name}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, proprietor_name: e.target.value })
                    }
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                    placeholder="Owner's Name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerData.mobile1}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, mobile1: e.target.value })
                    }
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Division *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerData.division}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, division: e.target.value })
                    }
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                    placeholder="e.g. Khulna"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerData.district}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, district: e.target.value })
                    }
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                    placeholder="e.g. Jashore"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Town / Village *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerData.town_village}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, town_village: e.target.value })
                    }
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                    placeholder="e.g. Chougacha"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customerLoading}
                  className={`px-4 py-1.5 rounded text-sm font-bold text-white transition flex items-center gap-2 ${
                    customerLoading ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  <FiSave /> {customerLoading ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DRAFT IMPORT MODAL --- */}
      {!isEditing && showDraftModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-3">
          <div className="bg-white border border-gray-300 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg">
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FiUpload className="text-blue-600" /> Import from Draft
              </h2>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-gray-500 hover:text-red-500"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {loadingDrafts ? (
                <p className="text-center text-gray-500">Loading drafts...</p>
              ) : draftList.length === 0 ? (
                <p className="text-center text-gray-400">No drafts available.</p>
              ) : (
                <div className="border border-gray-300 overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                          Invoice
                        </th>
                        <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                          Customer
                        </th>
                        <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-left">
                          Date
                        </th>
                        <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-right">
                          Total
                        </th>
                        <th className="border border-gray-600 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftList.map((draft, idx) => (
                        <tr key={draft.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs font-medium">
                            {draft.invoice_number}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">
                            {draft.customer_name || "Walk-in"}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">
                            {new Date(draft.sale_date).toLocaleDateString("en-BD", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-right font-mono text-xs font-bold">
                            ৳ {parseFloat(draft.total_amount).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => importDraft(draft)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold transition"
                            >
                              Import
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-200 border border-gray-300"
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