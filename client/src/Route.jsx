// client/src/Route.jsx
import { createBrowserRouter } from "react-router-dom";

// Layouts
import Layout from "./layouts/Layout";
import AdminLayout from "./layouts/AdminLayout";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";

// User Management Pages
import UserManagement from "./pages/admin/users/UserManagement";

// Admin Pages
import EmployeeManage from "./pages/admin/employee/EmployeeList";
import CustomerManage from "./pages/admin/customer/CustomerList";
import AddEmployee from "./pages/admin/employee/AddEmployee";
import AddCustomer from "./pages/admin/customer/AddCustomer";
import ProductList from "./pages/admin/products/ProductList";
import AddProduct from "./pages/admin/products/AddProduct";
import PurchaseHistory from './pages/admin/purchase/PurchaseHistory';
import AddPurchase from './pages/admin/purchase/AddPurchase';
import StockList from './pages/admin/stock/StockList';
import SaleHistory from './pages/admin/sales/SaleHistory';
import AddSale from './pages/admin/sales/AddSale';
import AddDraftSale from './pages/admin/sales/AddDraftSale';
import DraftSaleList from './pages/admin/sales/DraftSaleList';
import ViewDraft from './pages/admin/sales/ViewDraft';
import ViewSale from './pages/admin/sales/ViewSale';
import Payments from './pages/admin/payment/Payments';
import PaymentHistory from './pages/admin/payment/PaymentHistory';
import ViewPaymentdetails from './pages/admin/payment/ViewPaymentdetails';
import CapitalEntries from './pages/admin/finance/CapitalEntries';
import ExpenseList from "./pages/admin/finance/ExpenseList";
import AddExpense from "./pages/admin/finance/AddExpense";
import CustomerLedger from './pages/admin/customer/CustomerLedger';

// Finance Pages
import FinancialDashboard from "./pages/admin/finance/FinancialDashboard";
import ChartOfAccounts from "./pages/admin/finance/ChartOfAccounts";

// Master Data Pages
import Brand from "./pages/admin/masters/Brand";
import Supplier from "./pages/admin/masters/Supplier";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> }, 
      { path: "login", element: <Login /> },
    ],
  },
  {
    path: "/dashboard",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      
      // User Management Routes - More specific routes FIRST
      // This must come BEFORE "users"
      { path: "users", element: <UserManagement /> },

      // Employee Routes
      { path: "employees", element: <EmployeeManage /> },
      { path: "employees/add", element: <AddEmployee /> },
      { path: "employees/edit/:id", element: <AddEmployee /> },

      // Customer Routes – specific ledger routes before generic ones
      { path: "customers/ledger", element: <CustomerLedger /> },
      { path: "customers/:id/ledger", element: <CustomerLedger /> },
      { path: "customers", element: <CustomerManage /> },
      { path: "customers/add", element: <AddCustomer /> },
      { path: "customers/edit/:id", element: <AddCustomer /> },

      // Product Routes
      { path: "products", element: <ProductList /> },
      { path: "products/add", element: <AddProduct /> },
      { path: "products/edit/:id", element: <AddProduct /> },

      // Purchase Routes
      { path: "purchase", element: <PurchaseHistory /> },
      { path: "purchase/add", element: <AddPurchase /> },
      { path: "purchase/edit/:id", element: <AddPurchase /> },

      // Stock Routes
      { path: "stock", element: <StockList /> },

      // Sales Routes
      { path: "sales", element: <SaleHistory /> },
      { path: "sales/add", element: <AddSale /> },
      { path: "sales/edit/:id", element: <AddSale /> },
      { path: "sales/draft", element: <AddDraftSale /> },
      { path: "sales/draft/:id", element: <AddDraftSale /> },
      { path: "sales/draftlist", element: <DraftSaleList /> },
      { path: "sales/draft/:id/view", element: <ViewDraft /> },
      { path: "sales/view/:id", element: <ViewSale /> },
      
      // Finance Routes
      { path: "finance/dashboard", element: <FinancialDashboard /> },
      { path: "finance/chart-of-accounts", element: <ChartOfAccounts /> },
      { path: "finance/capital-entries", element: <CapitalEntries /> },
      
      // Expense Routes
      { path: "finance/expense", element: <ExpenseList /> },
      { path: "finance/expense/add", element: <AddExpense /> },

      // Master Data Routes
      { path: "brands", element: <Brand /> },
      { path: "suppliers", element: <Supplier /> },

      // Payment Routes
      { path: "payments", element: <Payments /> },
      { path: "payment-history", element: <PaymentHistory /> },
      { path: "payments/view/:id", element: <ViewPaymentdetails /> }
    ],
  },
]);