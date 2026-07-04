import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FiUsers,
  FiUserPlus,
  FiChevronRight,
  FiList,
  FiPlus,
  FiBox,
  FiShoppingCart,
  FiDollarSign,
  FiHome,
  FiMenu,
  FiX,
  FiTruck,
  FiPieChart,
  FiLayers,
  FiCreditCard,
  FiLogOut
} from "react-icons/fi";
import logo from "../assets/logo.jpg";

export default function AdminSidebar() {
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [touchStartX, setTouchStartX] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle swipe to close
  useEffect(() => {
    const handleTouchMove = (e) => {
      if (!isSidebarOpen || !isMobile) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      
      if (deltaX > 50 && touchStartX < 50) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("touchmove", handleTouchMove);
    return () => window.removeEventListener("touchmove", handleTouchMove);
  }, [isSidebarOpen, touchStartX, isMobile]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
    setIsSidebarOpen(false);
  };

  const toggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navItems = [
    { id: 1, type: "link", to: "/dashboard", label: "Dashboard", icon: FiHome },

    // --- TRADES ---
    { id: "h_trades", type: "heading", label: "Trades" },
    {
      id: "sales", type: "dropdown", label: "Sales", icon: FiDollarSign, stateKey: "sales",
      subItems: [
        { to: "/dashboard/sales/add", label: "New Sale", icon: FiPlus },
        { to: "/dashboard/sales", label: "Sale History", icon: FiList },
        { to: "/dashboard/sales/draft", label: "New Draft", icon: FiPlus },
        { to: "/dashboard/sales/draftlist", label: "Draft List", icon: FiList },
      ]
    },
    {
      id: "purchases", type: "dropdown", label: "Purchases", icon: FiShoppingCart, stateKey: "purchases",
      subItems: [
        { to: "/dashboard/purchase/add", label: "New Purchase", icon: FiPlus },
        { to: "/dashboard/purchase", label: "Purchase History", icon: FiList },
      ]
    },
    {
      id: "payments", type: "dropdown", label: "Payments", icon: FiCreditCard, stateKey: "payments",
      subItems: [
        { to: "/dashboard/payments", label: "Payment Center", icon: FiDollarSign },
        { to: "/dashboard/payment-history", label: "Payment Ledger", icon: FiList },
      ]
    },
    { id: "stock", type: "link", to: "/dashboard/stock", label: "Live Stock", icon: FiBox },

    // --- MASTER MANAGEMENT ---
    { id: "h_master", type: "heading", label: "Master Management" },
    {
      id: "products", type: "dropdown", label: "Products", icon: FiLayers, stateKey: "products",
      subItems: [
        { to: "/dashboard/products", label: "Product List", icon: FiList },
        { to: "/dashboard/products/add", label: "Add New Product", icon: FiPlus },
      ]
    },
    {
      id: "partners", type: "dropdown", label: "Suppliers & Brands", icon: FiTruck, stateKey: "partners",
      subItems: [
        { to: "/dashboard/suppliers", label: "Supplier Directory", icon: FiUsers },
        { to: "/dashboard/brands", label: "Brands Master", icon: FiBox },
      ]
    },

    // --- FINANCE ---
    { id: "h_finance", type: "heading", label: "Finance" },
    {
      id: "finance", type: "dropdown", label: "Finance & Accounts", icon: FiPieChart, stateKey: "finance",
      subItems: [
        { to: "/dashboard/finance/dashboard", label: "Financial Dashboard", icon: FiPieChart },
        { to: "/dashboard/finance/chart-of-accounts", label: "Chart of Accounts", icon: FiList },
        { to: "/dashboard/finance/capital-entries", label: "Capital & Investment", icon: FiDollarSign },
        { to: "/dashboard/finance/expense", label: "Expense Ledger", icon: FiDollarSign },
        { to: "/dashboard/finance/expense/add", label: "Record New Expense", icon: FiPlus },
      ]
    },

    // --- PEOPLE MANAGEMENT ---
    { id: "h_people", type: "heading", label: "People Management" },
    {
      id: "people", type: "dropdown", label: "People & Staff", icon: FiUsers, stateKey: "people",
      subItems: [
        { to: "/dashboard/employees", label: "Employees", icon: FiUsers },
        { to: "/dashboard/employees/add", label: "Add Employee", icon: FiUserPlus },
        { to: "/dashboard/customers", label: "Customers", icon: FiUsers },
        { to: "/dashboard/customers/add", label: "Add Customer", icon: FiUserPlus },
      ]
    },
  ];

  // Auto-open dropdown if a sub-item is active
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.type === "dropdown" && item.subItems) {
        const hasActiveChild = item.subItems.some((sub) => sub.to === location.pathname);
        if (hasActiveChild) {
          setOpenDropdowns((prev) => ({ ...prev, [item.stateKey]: true }));
        }
      }
    });
  }, [location.pathname]);

  return (
    <>
      {/* Optimized styles for PC and mobile */}
      <style>{`
        .glass-surface {
          background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.14);
        }
        .glass-panel {
          background: linear-gradient(165deg, rgba(30,32,42,0.72) 0%, rgba(14,15,22,0.85) 100%);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
        }
        .glass-btn {
          position: relative;
          background: linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .glass-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(120deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 32%);
          opacity: 0.9;
          pointer-events: none;
        }
        .glass-btn:hover {
          background: linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%);
          border-color: rgba(255,255,255,0.20);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.28);
          transform: translateY(-1px);
        }
        .glass-btn:active {
          transform: scale(0.97);
          transition-duration: 0.1s;
        }
        .glass-btn-active {
          background: linear-gradient(180deg, rgba(99,140,255,0.32) 0%, rgba(70,100,220,0.20) 100%);
          border: 1px solid rgba(147,180,255,0.45);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.15), 0 4px 20px rgba(80,110,255,0.25);
        }
        .glass-btn-danger {
          background: linear-gradient(180deg, rgba(255,90,90,0.16) 0%, rgba(200,40,40,0.10) 100%);
          border: 1px solid rgba(255,120,120,0.22);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(0,0,0,0.2);
        }
        .glass-btn-danger:hover {
          background: linear-gradient(180deg, rgba(255,70,70,0.55) 0%, rgba(200,30,30,0.55) 100%);
          border-color: rgba(255,150,150,0.5);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 20px rgba(255,60,60,0.30);
        }
        .glass-scrollbar::-webkit-scrollbar { width: 4px; }
        .glass-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .glass-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
        }
        .glass-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
        
        /* PC Optimizations - Narrower sidebar */
        @media (min-width: 1024px) {
          .glass-panel {
            width: 220px !important;
            transform: translateX(0) !important;
            position: relative !important;
          }
          .glass-btn {
            padding: 8px 12px !important;
            min-height: 38px !important;
            font-size: 0.8rem !important;
            border-radius: 10px !important;
          }
          .glass-btn svg {
            width: 16px !important;
            height: 16px !important;
          }
          .glass-btn .label-text {
            font-size: 0.8rem !important;
          }
          .glass-panel .header-text {
            font-size: 0.95rem !important;
          }
          .glass-panel .heading-label {
            font-size: 0.55rem !important;
            letter-spacing: 0.15em !important;
            padding: 0 8px !important;
          }
          .glass-panel .sub-item {
            padding: 6px 10px !important;
            min-height: 32px !important;
            font-size: 0.75rem !important;
          }
          .glass-panel .sub-item svg {
            width: 14px !important;
            height: 14px !important;
          }
          .glass-panel .sub-item .label-text {
            font-size: 0.75rem !important;
          }
          .glass-panel .sub-menu {
            margin-left: 12px !important;
            padding-left: 8px !important;
          }
          .glass-panel .sidebar-header {
            padding: 10px 12px !important;
          }
          .glass-panel .sidebar-header img {
            height: 28px !important;
          }
          .glass-panel .logout-btn {
            padding: 8px 12px !important;
            min-height: 38px !important;
            font-size: 0.8rem !important;
          }
          .glass-panel .logout-btn svg {
            width: 16px !important;
            height: 16px !important;
          }
          .glass-panel nav {
            padding: 8px !important;
            gap: 2px !important;
          }
          .glass-panel .nav-spacing {
            margin-top: 4px !important;
            margin-bottom: 2px !important;
          }
          .glass-panel .dropdown-content {
            margin-top: 2px !important;
          }
          
          /* Hide hamburger button on desktop */
          .hamburger-btn {
            display: none !important;
          }
        }
        
        /* Mobile optimizations */
        @media (max-width: 1023px) {
          .glass-btn {
            min-height: 48px;
            padding: 12px 14px;
          }
          .glass-btn:active {
            transform: scale(0.96);
          }
          .glass-panel {
            width: 85vw;
            max-width: 320px;
            position: fixed !important;
          }
          
          /* Compact hamburger button - just icon */
          .hamburger-btn {
            padding: 8px !important;
            min-height: 40px !important;
            min-width: 40px !important;
            border-radius: 12px !important;
            display: flex !important;
          }
          .hamburger-btn svg {
            width: 22px !important;
            height: 22px !important;
          }
        }

        .hamburger-btn {
          background: linear-gradient(180deg, rgba(30,32,42,0.9) 0%, rgba(14,15,22,0.95) 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
          align-items: center;
          justify-content: center;
          z-index: 50;
          position: fixed;
          top: 12px;
          left: 12px;
          color: white;
        }
        .hamburger-btn:hover {
          background: linear-gradient(180deg, rgba(40,42,52,0.95) 0%, rgba(24,25,32,0.95) 100%);
          border-color: rgba(255,255,255,0.25);
          transform: scale(1.05);
        }
        .hamburger-btn:active {
          transform: scale(0.92);
        }
        
        /* Desktop sidebar should always be visible */
        .desktop-sidebar {
          position: relative !important;
          transform: translateX(0) !important;
        }
        
        /* Main content wrapper - adjust for desktop sidebar */
        .main-content {
          flex: 1;
          min-height: 100vh;
        }
      `}</style>

      {/* 3-Bar Hamburger Menu Button - Only visible on mobile/tablet */}
      <button
        onClick={toggleSidebar}
        className="hamburger-btn"
        aria-label="Toggle menu"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <FiMenu />
      </button>

      {/* Mobile Overlay - Only on mobile */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 
            animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col min-h-screen text-slate-200 glass-panel
          border-r border-white/10 shadow-[8px_0_40px_rgba(0,0,0,0.45)]
          touch-manipulation
          ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'desktop-sidebar'}
          ${isMobile ? `transform transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}` : ''}
          ${!isMobile ? 'w-[220px]' : 'w-[85vw] max-w-[320px]'}
        `}
        onTouchStart={(e) => {
          if (isMobile) {
            setTouchStartX(e.touches[0].clientX);
          }
        }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* subtle top sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.06] to-transparent" />

        {/* Header */}
        <div className="relative sidebar-header p-4 border-b border-white/10 flex justify-between items-center z-10 flex-shrink-0">
          <Link
            to="/dashboard"
            onClick={() => isMobile && setIsSidebarOpen(false)}
            className="flex items-center gap-2.5 group min-h-[44px] lg:min-h-[38px]"
          >
            <div className="glass-surface p-1.5 rounded-xl group-active:scale-95 transition-transform duration-200">
              <img
                src={logo}
                alt="Heaven Autos Logo"
                className="h-9 lg:h-7 w-auto rounded-lg object-contain flex-shrink-0 brightness-100"
              />
            </div>
            <span className="header-text text-base lg:text-sm font-black text-white tracking-tight drop-shadow-sm">
              Heaven Autos
            </span>
          </Link>
          
          {/* Close button - Mobile only */}
          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="glass-btn md:hidden text-slate-300 hover:text-white p-2.5 rounded-xl flex-shrink-0
                active:scale-90 transition-all duration-200"
              aria-label="Close menu"
              style={{ minWidth: '40px', minHeight: '40px' }}
            >
              <FiX size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 p-3 lg:p-2 space-y-1 lg:space-y-0.5 overflow-y-auto glass-scrollbar z-10">
          {navItems.map((item) => {
            if (item.type === "heading") {
              return (
                <div
                  key={item.id}
                  className="heading-label text-[10px] lg:text-[0.55rem] text-slate-400/80 uppercase tracking-[0.2em] lg:tracking-[0.15em] font-bold mb-2 lg:mb-1 mt-5 lg:mt-3 px-3 lg:px-2 first:mt-1"
                >
                  {item.label}
                </div>
              );
            }
            if (item.type === "link") {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => isMobile && setIsSidebarOpen(false)}
                  className={`group flex items-center gap-3 p-3 lg:p-2 rounded-2xl lg:rounded-xl text-sm lg:text-xs font-semibold glass-btn
                    active:scale-95 transition-all duration-200
                    ${isActive ? "glass-btn-active text-white" : "text-slate-300"}
                  `}
                >
                  <Icon
                    size={isMobile ? 18 : 16}
                    className={`transition-colors duration-300 flex-shrink-0 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  <span className="label-text group-hover:text-white transition-colors duration-300">
                    {item.label}
                  </span>
                </Link>
              );
            }
            if (item.type === "dropdown") {
              const Icon = item.icon;
              const isOpen = openDropdowns[item.stateKey];
              const hasActiveChild = item.subItems.some((sub) => sub.to === location.pathname);
              return (
                <div key={item.id} className="mb-0.5">
                  <button
                    onClick={() => toggleDropdown(item.stateKey)}
                    className={`group w-full flex items-center justify-between p-3 lg:p-2 rounded-2xl lg:rounded-xl text-sm lg:text-xs font-semibold glass-btn
                      active:scale-95 transition-all duration-200
                      ${isOpen || hasActiveChild ? "glass-btn-active text-white" : "text-slate-300"}
                    `}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        size={isMobile ? 18 : 16}
                        className={`transition-colors duration-300 flex-shrink-0 ${
                          isOpen || hasActiveChild
                            ? "text-white"
                            : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span className="label-text group-hover:text-white transition-colors duration-300 truncate">
                        {item.label}
                      </span>
                    </div>
                    <FiChevronRight
                      size={isMobile ? 16 : 14}
                      className={`text-slate-400 transition-transform duration-300 flex-shrink-0 ml-2 ${
                        isOpen ? "rotate-90 text-white" : "group-hover:text-white"
                      }`}
                    />
                  </button>
                  
                  {/* Sub-items */}
                  <div
                    className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? "max-h-[500px] opacity-100 mt-1 lg:mt-0.5" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="sub-menu ml-4 lg:ml-3 border-l-2 border-white/10 pl-3 lg:pl-2 space-y-0.5 py-0.5">
                      {item.subItems.map((sub, idx) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.to;
                        return (
                          <Link
                            key={idx}
                            to={sub.to}
                            onClick={() => isMobile && setIsSidebarOpen(false)}
                            className={`sub-item group flex items-center gap-2.5 p-3 lg:p-1.5 rounded-xl lg:rounded-lg text-[13px] lg:text-xs font-medium glass-btn
                              active:scale-95 transition-all duration-200
                              ${isSubActive ? "glass-btn-active text-white" : "text-slate-400"}
                            `}
                          >
                            <SubIcon
                              size={isMobile ? 15 : 14}
                              className={`transition-colors flex-shrink-0 ${
                                isSubActive ? "text-white" : "text-slate-500 group-hover:text-white"
                              }`}
                            />
                            <span className="label-text group-hover:text-white transition-colors duration-300">
                              {sub.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </nav>

        {/* Footer */}
        <div className="relative border-t border-white/10 mt-auto p-3 lg:p-2 flex-shrink-0 z-10">
          <button
            onClick={handleLogout}
            className="logout-btn glass-btn glass-btn-danger group flex items-center justify-center gap-2 w-full p-3 lg:p-2 text-red-200 rounded-2xl lg:rounded-xl font-semibold text-sm lg:text-xs hover:text-white
              active:scale-95 transition-all duration-200"
          >
            <FiLogOut size={isMobile ? 17 : 16} className="group-hover:-translate-x-0.5 transition-transform duration-300 flex-shrink-0" />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}