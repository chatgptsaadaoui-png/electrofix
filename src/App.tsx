import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  Smartphone, 
  Package, 
  ShoppingCart, 
  FileText, 
  BarChart3,
  Plus,
  Search,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Printer,
  Download,
  Menu,
  X,
  Trash2,
  Pencil,
  History,
  Eye,
  LogOut,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { cn, formatCurrency } from './lib/utils';
import { Customer, Product, Repair, Sale, Stats } from './types';
import { dbService } from './services/db';
import { supabase } from './lib/supabase';
import { LandingPage } from './components/LandingPage';
import { Auth } from './components/Auth';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg",
      active 
        ? "bg-indigo-500/10 text-indigo-400" 
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, color, trend }: { label: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("p-2 rounded-xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
  </div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isServerDown, setIsServerDown] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [repairStatusFilter, setRepairStatusFilter] = useState<string>('all');

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error();
      setIsServerDown(false);
    } catch (e) {
      setIsServerDown(true);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isAddingRepair, setIsAddingRepair] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<{ customer: Customer, repairs: Repair[], sales: any[] } | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingRepair, setEditingRepair] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'customer' | 'product' | 'repair' | 'sale', id: number } | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [newProduct, setNewProduct] = useState({
    name: '',
    type: 'phone',
    brand: '',
    model: '',
    purchase_price: '',
    selling_price: '',
    stock_quantity: '',
    min_stock_level: '5'
  });
  const [newRepair, setNewRepair] = useState({ 
    customer_id: '', 
    device_type: 'phone', 
    brand: '', 
    model: '', 
    problem: '', 
    cost_price: '',
    expected_price: '',
    product_id: '' 
  });

  // Sales State
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<{ product_id: number, quantity: number, price: number, name: string }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Dashboard Period State
  const [profitPeriod, setProfitPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Reports State
  const [salesByType, setSalesByType] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [repairStats, setRepairStats] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [stockValue, setStockValue] = useState({ purchase: 0, selling: 0 });
  const [repairSuccessRate, setRepairSuccessRate] = useState<number | string>(0);

  const loadStats = async () => {
    try {
      const data = await dbService.getStats(profitPeriod, customStartDate, customEndDate);
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await dbService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await dbService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadRepairs = async () => {
    try {
      const data = await dbService.getRepairs();
      setRepairs(data);
    } catch (error) {
      console.error("Error loading repairs:", error);
    }
  };

  const loadSales = async () => {
    try {
      const data = await dbService.getSales();
      setSales(data);
    } catch (error) {
      console.error("Error loading sales:", error);
    }
  };

  const loadReports = async () => {
    try {
      const data = await dbService.getReports();
      setSalesByType(data.salesByType);
      setMonthlyRevenue(data.monthlyRevenue);
      setRepairStats(data.repairStats);
      setTopProducts(data.topProducts);
      setTopCustomers(data.topCustomers);
      setStockValue(data.stockValue);
      setRepairSuccessRate(data.repairSuccessRate);
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock_quantity) return;
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      if (product.stock_quantity <= 0) return;
      setCart([...cart, { 
        product_id: product.id, 
        name: product.name, 
        quantity: 1, 
        price: product.selling_price 
      }]);
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const product = products.find(p => p.id === productId);
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (product && newQty > product.stock_quantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleAddSale = async () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await dbService.addSale({
      customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
      items: cart,
      payment_method: paymentMethod,
      total_amount: total
    });

    setIsAddingSale(false);
    setCart([]);
    setSelectedCustomerId('');
    loadSales();
    loadProducts();
    loadStats();
    loadReports();
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim() && !newCustomer.phone.trim() && !newCustomer.address.trim()) {
      console.error('يرجى ملء خانة واحدة على الأقل');
      return;
    }
    
    if (editingCustomer) {
      await dbService.updateCustomer(editingCustomer.id, newCustomer);
    } else {
      await dbService.addCustomer(newCustomer);
    }
    
    setIsAddingCustomer(false);
    setEditingCustomer(null);
    setNewCustomer({ name: '', phone: '', address: '' });
    loadCustomers();
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || ''
    });
    setIsAddingCustomer(true);
  };

  const handleEditRepair = (repair: any) => {
    setEditingRepair(repair);
    setNewRepair({
      customer_id: repair.customer_id.toString(),
      device_type: repair.device_type,
      brand: repair.brand,
      model: repair.model,
      problem: repair.problem,
      cost_price: repair.cost_price.toString(),
      expected_price: repair.expected_price.toString(),
      product_id: repair.product_id ? repair.product_id.toString() : ''
    });
    setIsAddingRepair(true);
  };

  const handleAddRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepair.customer_id && !newRepair.brand.trim() && !newRepair.model.trim() && !newRepair.problem.trim()) {
      console.error('يرجى ملء خانة واحدة على الأقل');
      return;
    }

    const repairData = {
      ...newRepair,
      customer_id: newRepair.customer_id ? parseInt(newRepair.customer_id) : null,
      cost_price: parseFloat(newRepair.cost_price) || 0,
      expected_price: parseFloat(newRepair.expected_price) || 0,
      product_id: newRepair.product_id ? parseInt(newRepair.product_id) : null,
      status: editingRepair ? editingRepair.status : 'pending'
    };

    if (editingRepair) {
      await dbService.updateRepair(editingRepair.id, repairData);
    } else {
      await dbService.addRepair(repairData);
    }

    setIsAddingRepair(false);
    setEditingRepair(null);
    setNewRepair({ 
      customer_id: '', 
      device_type: 'phone', 
      brand: '', 
      model: '', 
      problem: '', 
      cost_price: '',
      expected_price: '',
      product_id: ''
    });
    loadRepairs();
    loadStats();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim() && !newProduct.brand.trim() && !newProduct.model.trim()) {
      console.error('يرجى ملء خانة واحدة على الأقل');
      return;
    }

    const productData = {
      ...newProduct,
      purchase_price: parseFloat(newProduct.purchase_price) || 0,
      selling_price: parseFloat(newProduct.selling_price) || 0,
      stock_quantity: parseInt(newProduct.stock_quantity) || 0,
      min_stock_level: parseInt(newProduct.min_stock_level) || 5
    };

    if (editingProduct) {
      await dbService.updateProduct(editingProduct.id, productData);
    } else {
      await dbService.addProduct(productData);
    }

    setIsAddingProduct(false);
    setEditingProduct(null);
    setNewProduct({
      name: '',
      type: 'phone',
      brand: '',
      model: '',
      purchase_price: '',
      selling_price: '',
      stock_quantity: '',
      min_stock_level: '5'
    });
    loadProducts();
    loadStats();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      type: product.type,
      brand: product.brand,
      model: product.model,
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      min_stock_level: product.min_stock_level.toString()
    });
    setIsAddingProduct(true);
  };

  const handleViewHistory = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const customerRepairs = repairs.filter(r => r.customer_id === customerId.toString());
    const customerSales = sales.filter(s => s.customer_id === customerId);
    
    setSelectedCustomerHistory({ customer, repairs: customerRepairs, sales: customerSales });
    setIsViewingHistory(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        localStorage.setItem('supabase_user_id', session.user.id);
        setView('app');
      } else {
        localStorage.removeItem('supabase_user_id');
      }
      setIsAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        localStorage.setItem('supabase_user_id', session.user.id);
        setView('app');
      } else {
        localStorage.removeItem('supabase_user_id');
        setView('landing');
      }
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadStats();
  }, [profitPeriod, customStartDate, customEndDate]);

  const loadInitialData = async () => {
    setIsInitialLoading(true);
    try {
      // Load bootstrap data and stats in parallel
      const [bootstrapData, statsData, reportsData] = await Promise.all([
        dbService.bootstrap(),
        dbService.getStats(profitPeriod, customStartDate, customEndDate),
        dbService.getReports()
      ]);

      setCustomers(bootstrapData.customers);
      setProducts(bootstrapData.products);
      setRepairs(bootstrapData.repairs);
      setSales(bootstrapData.sales);
      setStats(statsData);
      
      setSalesByType(reportsData.salesByType);
      setMonthlyRevenue(reportsData.monthlyRevenue);
      setRepairStats(reportsData.repairStats);
      setTopProducts(reportsData.topProducts);
      setTopCustomers(reportsData.topCustomers);
      setStockValue(reportsData.stockValue);
      setRepairSuccessRate(reportsData.repairSuccessRate);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'app') {
      loadInitialData();
    }
  }, [view]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('auth')} />;
  }

  if (view === 'auth') {
    return <Auth onSuccess={() => setView('app')} onBack={() => setView('landing')} />;
  }

  if (isInitialLoading && view === 'app') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-bold animate-pulse">جاري تحميل البيانات...</p>
      </div>
    );
  }

  const handleDeleteProduct = async (id: number) => {
    try {
      await dbService.deleteProduct(id);
      loadProducts();
      loadStats();
      setItemToDelete(null);
    } catch (error: any) {
      console.error(error.message || "فشل حذف المنتج");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      await dbService.deleteCustomer(id);
      loadCustomers();
      setItemToDelete(null);
    } catch (error: any) {
      console.error(error.message || "فشل حذف الزبون");
    }
  };

  const handleDeleteRepair = async (id: number) => {
    try {
      await dbService.deleteRepair(id);
      loadRepairs();
      loadStats();
      setItemToDelete(null);
    } catch (error: any) {
      console.error(error.message || "فشل حذف الإصلاح");
    }
  };

  const handleDeleteSale = async (id: number) => {
    try {
      await dbService.deleteSale(id);
      loadSales();
      loadStats();
      loadProducts(); // Reload products because stock might have changed
      loadReports();
      setItemToDelete(null);
    } catch (error: any) {
      console.error(error.message || "فشل حذف البيع");
    }
  };

  const handleUpdateRepairStatus = async (id: number, status: string) => {
    await dbService.patchRepair(id, { status });
    loadRepairs();
    loadStats();
  };

  const handlePrint = (type: string, data: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let content = '';
    if (type === 'sale') {
      content = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center;">فاتورة مبيعات</h1>
          <hr/>
          <p>رقم العملية: #${data.id}</p>
          <p>التاريخ: ${format(new Date(data.created_at), 'yyyy/MM/dd HH:mm')}</p>
          <p>طريقة الدفع: ${data.payment_method}</p>
          <hr/>
          <h3>المبلغ الإجمالي: ${formatCurrency(data.total_amount)}</h3>
          <p style="text-align: center; margin-top: 50px;">شكراً لزيارتكم!</p>
        </div>
      `;
    } else if (type === 'repair') {
      content = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center;">وصل إصلاح</h1>
          <hr/>
          <p>رقم الإصلاح: #${data.id}</p>
          <p>العميل: ${data.customer_name}</p>
          <p>الجهاز: ${data.brand} ${data.model}</p>
          <p>المشكلة: ${data.problem}</p>
          <p>الثمن المتوقع: ${formatCurrency(data.expected_price)}</p>
          <hr/>
          <p style="text-align: center; margin-top: 50px;">يرجى الاحتفاظ بهذا الوصل عند الاستلام.</p>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head><title>طباعة</title></head>
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderDashboard = () => {
    const profitLabels = {
      today: "الأرباح اليومية",
      week: "أرباح الأسبوع",
      month: "أرباح الشهر",
      year: "أرباح السنة",
      custom: "أرباح الفترة المحددة"
    };

    const periodSuffix = {
      today: "(اليوم)",
      week: "(هذا الأسبوع)",
      month: "(هذا الشهر)",
      year: "(هذه السنة)",
      custom: "(فترة مخصصة)"
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">لوحة التحكم</h2>
          <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'الأسبوع' },
              { id: 'month', label: 'الشهر' },
              { id: 'year', label: 'السنة' },
              { id: 'custom', label: 'تخصيص' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setProfitPeriod(p.id as any)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  profitPeriod === p.id 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {profitPeriod === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">من:</span>
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">إلى:</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label={`الأجهزة التي تم إصلاحها ${periodSuffix[profitPeriod]}`} 
            value={stats?.repairedCount || 0} 
            icon={CheckCircle2} 
            color="bg-indigo-500" 
          />
          <StatCard 
            label={`الأجهزة التي تم بيعها ${periodSuffix[profitPeriod]}`} 
            value={stats?.soldCount || 0} 
            icon={ShoppingCart} 
            color="bg-blue-500" 
          />
          <StatCard 
            label={profitLabels[profitPeriod]} 
            value={formatCurrency(stats?.profit || 0)} 
            icon={TrendingUp} 
            color="bg-violet-500" 
          />
          <StatCard 
            label="قيد الإصلاح" 
            value={stats?.pendingRepairs || 0} 
            icon={Clock} 
            color="bg-amber-500" 
          />
        </div>

      {stats?.lowStock && stats.lowStock > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">تنبيه: هناك {stats.lowStock} منتجات منخفضة في المخزون!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">نظرة عامة على المبيعات</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByType.length > 0 ? salesByType : [
                { name: 'هواتف', value: 0 },
                { name: 'إكسسوارات', value: 0 },
                { name: 'قطع غيار', value: 0 },
                { name: 'أخرى', value: 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'الإيرادات']}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">الإصلاحات الأخيرة</h3>
          <div className="space-y-4">
            {repairs.slice(0, 5).map((repair) => (
              <div key={repair.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl gap-3">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Smartphone size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{repair.brand} {repair.model}</p>
                    <p className="text-xs text-slate-500">{repair.customer_name}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                  repair.status === 'pending' ? "bg-amber-100 text-amber-700" :
                  repair.status === 'repaired' ? "bg-emerald-100 text-emerald-700" :
                  repair.status === 'waiting_parts' ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {repair.status === 'pending' ? 'قيد الانتظار' :
                   repair.status === 'repaired' ? 'تم الإصلاح' :
                   repair.status === 'waiting_parts' ? 'في انتظار القطع' : 'غير معروف'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">العملاء</h2>
        <button 
          onClick={() => setIsAddingCustomer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة عميل</span>
        </button>
      </div>

      <div className="bg-white border border-indigo-50 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-indigo-50/30 border-b border-indigo-50">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الاسم</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">رقم الهاتف</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">العنوان</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.filter(c => 
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              c.phone.includes(searchQuery)
            ).map((customer) => (
              <tr key={customer.id} className="hover:bg-indigo-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{customer.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{customer.phone}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{customer.address || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditCustomer(customer)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ type: 'customer', id: customer.id })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isViewingHistory && selectedCustomerHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="text-right">
                <h3 className="text-xl font-bold text-slate-900">سجل العمليات</h3>
                <p className="text-sm text-slate-500">العميل: {selectedCustomerHistory.customer.name}</p>
              </div>
              <button onClick={() => setIsViewingHistory(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-8 text-right">
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-4">الإصلاحات</h4>
                {selectedCustomerHistory.repairs.length > 0 ? (
                  <div className="border border-slate-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">الجهاز</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">المشكلة</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">الحالة</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCustomerHistory.repairs.map((repair) => (
                          <tr key={repair.id}>
                            <td className="px-4 py-2 text-sm">{repair.brand} {repair.model}</td>
                            <td className="px-4 py-2 text-sm">{repair.problem}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                repair.status === 'delivered' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {repair.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">{format(new Date(repair.received_date), 'yyyy-MM-dd')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">لا توجد إصلاحات سابقة</p>
                )}
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-4">المشتريات</h4>
                {selectedCustomerHistory.sales.length > 0 ? (
                  <div className="border border-slate-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">المنتج</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">الكمية</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">الثمن</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCustomerHistory.sales.map((sale, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{sale.product_name}</td>
                            <td className="px-4 py-2 text-sm">{sale.quantity}</td>
                            <td className="px-4 py-2 text-sm">{formatCurrency(sale.price)}</td>
                            <td className="px-4 py-2 text-sm">{format(new Date(sale.created_at), 'yyyy-MM-dd')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">لا توجد مشتريات سابقة</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  const renderRepairs = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-900">الإصلاحات</h2>
          <select 
            value={repairStatusFilter}
            onChange={(e) => setRepairStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="repaired">تم الإصلاح</option>
            <option value="waiting_parts">في انتظار القطع</option>
            <option value="delivered">تم التسليم</option>
          </select>
        </div>
        <button 
          onClick={() => {
            setEditingRepair(null);
            setNewRepair({ 
              customer_id: '', 
              device_type: 'phone', 
              brand: '', 
              model: '', 
              problem: '', 
              cost_price: '',
              expected_price: '',
              product_id: ''
            });
            setIsAddingRepair(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة إصلاح</span>
        </button>
      </div>

      <div className="bg-white border border-indigo-50 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-indigo-50/30 border-b border-indigo-50">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">العميل</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الجهاز</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">المشكلة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">التكلفة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">السعر</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الربح</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الحالة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {repairs.filter(r => {
              const matchesSearch = r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.problem.toLowerCase().includes(searchQuery.toLowerCase());
              
              const matchesStatus = repairStatusFilter === 'all' || r.status === repairStatusFilter;
              
              return matchesSearch && matchesStatus;
            }).map((repair) => (
              <tr key={repair.id} className="hover:bg-indigo-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900">{repair.customer_name}</p>
                  <p className="text-xs text-slate-500">{repair.customer_phone}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{repair.brand} {repair.model} ({repair.device_type})</td>
                <td className="px-6 py-4 text-sm text-slate-600">{repair.problem}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(repair.cost_price)}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(repair.expected_price)}</td>
                <td className="px-6 py-4 text-sm font-bold text-indigo-600">{formatCurrency(repair.expected_price - repair.cost_price)}</td>
                <td className="px-6 py-4">
                  <select 
                    value={repair.status}
                    onChange={(e) => handleUpdateRepairStatus(repair.id, e.target.value)}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer",
                      repair.status === 'pending' ? "bg-amber-100 text-amber-700" :
                      repair.status === 'repaired' ? "bg-emerald-100 text-emerald-700" :
                      repair.status === 'waiting_parts' ? "bg-blue-100 text-blue-700" :
                      repair.status === 'delivered' ? "bg-slate-100 text-slate-600" :
                      "bg-slate-100 text-slate-600"
                    )}
                  >
                    <option value="pending">قيد الانتظار</option>
                    <option value="repaired">تم الإصلاح</option>
                    <option value="waiting_parts">في انتظار القطع</option>
                    <option value="delivered">تم التسليم</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(repair.received_date), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handlePrint('repair', repair)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="طباعة"
                    >
                      <Printer size={18} />
                    </button>
                    <button 
                      onClick={() => handleEditRepair(repair)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ type: 'repair', id: repair.id })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStock = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">المخزون</h2>
        <button 
          onClick={() => setIsAddingProduct(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة منتج</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <p className="text-xs text-slate-500 mb-1">إجمالي المنتجات</p>
          <p className="text-xl font-bold text-slate-900">{products.length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <p className="text-xs text-slate-500 mb-1">قيمة المخزون</p>
          <p className="text-xl font-bold text-slate-900">
            {formatCurrency(products.reduce((acc, p) => acc + (p.purchase_price * p.stock_quantity), 0))}
          </p>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <p className="text-xs text-slate-500 mb-1">منتجات منخفضة</p>
          <p className="text-xl font-bold text-red-600">{products.filter(p => p.stock_quantity <= p.min_stock_level).length}</p>
        </div>
      </div>

      <div className="bg-white border border-indigo-50 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-indigo-50/30 border-b border-indigo-50">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">المنتج</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">النوع</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">سعر الشراء</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">سعر البيع</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الكمية</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.filter(p => 
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.model.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((product) => (
              <tr key={product.id} className="hover:bg-indigo-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.brand} {product.model}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{product.type}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(product.purchase_price)}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(product.selling_price)}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{product.stock_quantity}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                      product.stock_quantity <= product.min_stock_level ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"
                    )}>
                      {product.stock_quantity <= product.min_stock_level ? "منخفض" : "متوفر"}
                    </span>
                    <button 
                      onClick={() => {
                        addToCart(product);
                        setIsAddingSale(true);
                      }}
                      disabled={product.stock_quantity <= 0}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                      title="بيع سريع"
                    >
                      <ShoppingCart size={16} />
                    </button>
                    <button 
                      onClick={() => handleEditProduct(product)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ type: 'product', id: product.id })}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
              </h3>
              <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">اسم المنتج</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">النوع</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.type}
                    onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value })}
                  >
                    <option value="phone">هاتف</option>
                    <option value="computer">حاسوب</option>
                    <option value="part">قطعة غيار</option>
                    <option value="accessory">إكسسوار</option>
                  </select>
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">العلامة التجارية</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">الموديل</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.model}
                    onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">ثمن الشراء (MAD)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.purchase_price}
                    onChange={(e) => setNewProduct({ ...newProduct, purchase_price: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">ثمن البيع (MAD)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">الكمية</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-sm font-medium text-slate-700">الحد الأدنى للمخزون</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                    value={newProduct.min_stock_level}
                    onChange={(e) => setNewProduct({ ...newProduct, min_stock_level: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  إضافة المنتج
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">المبيعات</h2>
        <button 
          onClick={() => setIsAddingSale(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <ShoppingCart size={20} />
          <span>عملية بيع جديدة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <p className="text-xs text-slate-500 mb-1">إجمالي المبيعات</p>
          <p className="text-xl font-bold text-slate-900">{sales.length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <p className="text-xs text-slate-500 mb-1">مدخول اليوم</p>
          <p className="text-xl font-bold text-indigo-600">{formatCurrency(stats?.dailyProfit || 0)}</p>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <p className="text-xs text-slate-500 mb-1">المنتجات المباعة</p>
          <p className="text-xl font-bold text-slate-900">{stats?.soldCount || 0}</p>
        </div>
      </div>

      <div className="bg-white border border-indigo-50 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-indigo-50/30 border-b border-indigo-50">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">رقم العملية</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">التاريخ</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">طريقة الدفع</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">المبلغ الإجمالي</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.filter(s => 
              s.id.toString().includes(searchQuery) ||
              s.payment_method.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((sale) => (
              <tr key={sale.id} className="hover:bg-indigo-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">#{sale.id}</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {format(new Date(sale.created_at), 'yyyy/MM/dd HH:mm')}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                    {sale.payment_method === 'cash' ? 'نقداً' : sale.payment_method === 'card' ? 'بطاقة' : 'تحويل'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(sale.total_amount)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handlePrint('sale', sale)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="طباعة"
                    >
                      <Printer size={18} />
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ type: 'sale', id: sale.id })}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">التقارير والإحصائيات المتقدمة</h2>
        <button 
          onClick={loadReports}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Clock size={18} />
          تحديث البيانات
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-bold text-slate-500 mb-1">قيمة المخزون (شراء)</p>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stockValue.purchase)}</h3>
          <div className="mt-2 text-xs text-slate-400">القيمة الإجمالية للسلع المتوفرة حالياً</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-bold text-slate-500 mb-1">القيمة البيعية للمخزون</p>
          <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(stockValue.selling)}</h3>
          <div className="mt-2 text-xs text-slate-400">الربح المتوقع: {formatCurrency(stockValue.selling - stockValue.purchase)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-bold text-slate-500 mb-1">نسبة نجاح الإصلاح</p>
          <h3 className="text-2xl font-bold text-blue-600">{repairSuccessRate}%</h3>
          <div className="mt-2 text-xs text-slate-400">نسبة الأجهزة التي تم إصلاحها وتسليمها</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue & Profit Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6">الأداء المالي الشهري (المدخول والأرباح)</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend verticalAlign="top" align="right" height={36}/>
                <Bar dataKey="revenue" name="إجمالي المدخول" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="profit" name="صافي الربح" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Type Chart */}
        <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">المبيعات والأرباح حسب الفئة</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByType}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar dataKey="value" name="الإيرادات" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="الأرباح" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Repair Status Distribution */}
        <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">توزيع حالات الإصلاح</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={repairStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {repairStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#6366f1'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {repairStats.map((entry, index) => (
              <div key={entry.status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#6366f1'][index % 5] }} />
                <span className="text-xs text-slate-600">{entry.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">المنتجات الأكثر مبيعاً</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg font-bold text-slate-400">
                    {index + 1}
                  </div>
                  <span className="font-medium text-slate-900">{product.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-indigo-600">{formatCurrency(product.total_revenue)}</span>
                  <span className="text-xs text-slate-400">({product.total_sold} قطعة)</span>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="text-center py-8 text-slate-400">لا توجد بيانات مبيعات كافية</div>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">أفضل العملاء (حسب الإنفاق)</h3>
          <div className="space-y-4">
            {topCustomers.map((customer, index) => (
              <div key={customer.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg font-bold text-slate-400">
                    {index + 1}
                  </div>
                  <span className="font-medium text-slate-900">{customer.name}</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-indigo-600">{formatCurrency(customer.total_spend)}</div>
                  <div className="text-[10px] text-slate-400 text-left">{customer.count} عمليات</div>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <div className="text-center py-8 text-slate-400">لا توجد بيانات عملاء كافية</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInvoices = () => {
    const allInvoices = [
      ...sales.map(s => ({ ...s, type: 'sale' })),
      ...repairs.filter(r => r.status === 'delivered').map(r => ({ ...r, type: 'repair', total_amount: r.expected_price, created_at: r.delivered_date || r.received_date }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">الفواتير</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">إجمالي الفواتير: {allInvoices.length}</span>
          </div>
        </div>

        <div className="bg-white border border-indigo-50 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-indigo-50/30 border-b border-indigo-50">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-500">رقم الفاتورة</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500">النوع</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500">التاريخ</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500">المبلغ</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allInvoices.filter(inv => 
                inv.id.toString().includes(searchQuery) ||
                (inv.type === 'sale' ? 'بيع' : 'إصلاح').includes(searchQuery)
              ).map((inv) => (
                <tr key={`${inv.type}-${inv.id}`} className="hover:bg-indigo-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">#{inv.id}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                      inv.type === 'sale' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    )}>
                      {inv.type === 'sale' ? 'بيع' : 'إصلاح'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {format(new Date(inv.created_at), 'yyyy/MM/dd HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handlePrint(inv.type, inv)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="طباعة الفاتورة"
                    >
                      <Printer size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'customers': return renderCustomers();
      case 'repairs': return renderRepairs();
      case 'stock': return renderStock();
      case 'sales': return renderSales();
      case 'invoices': return renderInvoices();
      case 'reports': return renderReports();
      default: return <div className="flex items-center justify-center h-full text-slate-400">قيد التطوير...</div>;
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="p-2 bg-indigo-600 rounded-xl">
          <Smartphone className="text-white" size={24} />
        </div>
        <h1 className="text-xl font-bold text-white">إلكتروفيكس</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <SidebarItem 
          icon={LayoutDashboard} 
          label="لوحة التحكم" 
          active={activeTab === 'dashboard'} 
          onClick={() => handleTabChange('dashboard')} 
        />
        <SidebarItem 
          icon={Users} 
          label="العملاء" 
          active={activeTab === 'customers'} 
          onClick={() => handleTabChange('customers')} 
        />
        <SidebarItem 
          icon={Wrench} 
          label="الإصلاحات" 
          active={activeTab === 'repairs'} 
          onClick={() => handleTabChange('repairs')} 
        />
        <SidebarItem 
          icon={Package} 
          label="المخزون" 
          active={activeTab === 'stock'} 
          onClick={() => handleTabChange('stock')} 
        />
        <SidebarItem 
          icon={ShoppingCart} 
          label="المبيعات" 
          active={activeTab === 'sales'} 
          onClick={() => handleTabChange('sales')} 
        />
        <SidebarItem 
          icon={FileText} 
          label="الفواتير" 
          active={activeTab === 'invoices'} 
          onClick={() => handleTabChange('invoices')} 
        />
        <SidebarItem 
          icon={BarChart3} 
          label="التقارير" 
          active={activeTab === 'reports'} 
          onClick={() => handleTabChange('reports')} 
        />
      </nav>

      <div className="p-4 border-t border-indigo-900">
        <div className="flex items-center justify-between p-3 bg-indigo-900/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold">
              {session?.user?.email?.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{session?.user?.email}</p>
              <p className="text-xs text-indigo-400">مدير المحل</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-800 rounded-lg transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans" dir="rtl">
      {/* Sidebar - Desktop (Always visible) */}
      <aside className="hidden lg:flex flex-col w-64 bg-indigo-950 border-l border-indigo-900 shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Sidebar - Mobile (Toggleable) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-indigo-900/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-64 bg-indigo-950 border-l border-indigo-900 lg:hidden"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isServerDown && (
          <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle size={16} />
            <span>تعذر الاتصال بالسيرفر. يرجى التأكد من تشغيل المشروع.</span>
          </div>
        )}
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-indigo-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-500 hover:bg-indigo-50 rounded-lg lg:hidden"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="بحث عن عميل، جهاز، أو فاتورة..."
                className="w-80 pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-indigo-50 rounded-lg">
              <Bell size={20} />
              <span className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-indigo-100 mx-2"></div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">{format(new Date(), 'EEEE, d MMMM', { locale: undefined })}</p>
              <p className="text-xs text-slate-500 text-right">مرحباً بك مجدداً</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderContent()}
        </div>

        {/* Modals */}
        <AnimatePresence>
          {isAddingCustomer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
              >
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                  </h3>
                  <button onClick={() => { setIsAddingCustomer(false); setEditingCustomer(null); setNewCustomer({ name: '', phone: '', address: '' }); }} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">الاسم الكامل</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">رقم الهاتف</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">العنوان (اختياري)</label>
                    <textarea 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors mt-4">
                    حفظ العميل
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {isAddingRepair && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
              >
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingRepair ? 'تعديل بيانات الإصلاح' : 'إضافة جهاز للإصلاح'}
                  </h3>
                  <button onClick={() => { setIsAddingRepair(false); setEditingRepair(null); }} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddRepair} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-600 mb-1">العميل</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={newRepair.customer_id}
                        onChange={(e) => setNewRepair({ ...newRepair, customer_id: e.target.value })}
                      >
                        <option value="">اختر عميلاً...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">نوع الجهاز</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={newRepair.device_type}
                        onChange={(e) => setNewRepair({ ...newRepair, device_type: e.target.value })}
                      >
                        <option value="phone">هاتف</option>
                        <option value="computer">كمبيوتر</option>
                        <option value="tablet">تابلت</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">الماركة</label>
                      <input 
                        type="text" 
                        placeholder="مثال: Samsung"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={newRepair.brand}
                        onChange={(e) => setNewRepair({ ...newRepair, brand: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">الموديل</label>
                      <input 
                        type="text" 
                        placeholder="مثال: A51"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={newRepair.model}
                        onChange={(e) => setNewRepair({ ...newRepair, model: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">قطعة غيار (اختياري)</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={newRepair.product_id}
                        onChange={(e) => setNewRepair({ ...newRepair, product_id: e.target.value })}
                      >
                        <option value="">لا توجد قطعة من المخزون</option>
                        {products.filter(p => p.type === 'part' || p.type === 'accessory').map(p => (
                          <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                            {p.name} ({p.brand} {p.model}) - متوفر: {p.stock_quantity}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">تكلفة الإصلاح (المحل)</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={newRepair.cost_price}
                        onChange={(e) => setNewRepair({ ...newRepair, cost_price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">السعر للزبون</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={newRepair.expected_price}
                        onChange={(e) => setNewRepair({ ...newRepair, expected_price: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-600 mb-1">المشكلة</label>
                      <textarea 
                        placeholder="صف المشكلة بالتفصيل..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                        value={newRepair.problem}
                        onChange={(e) => setNewRepair({ ...newRepair, problem: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors mt-4">
                    تسجيل الجهاز
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {isAddingSale && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
              >
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">عملية بيع جديدة</h3>
                  <button onClick={() => setIsAddingSale(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-hidden flex">
                  {/* Products List */}
                  <div className="flex-1 p-6 overflow-y-auto border-l border-slate-200">
                    <div className="relative mb-6">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="ابحث عن منتج..."
                        className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {products.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          disabled={product.stock_quantity <= 0}
                          className="p-4 bg-white border border-slate-200 rounded-xl text-right hover:border-indigo-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:grayscale"
                        >
                          <p className="text-sm font-bold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500 mb-2">{product.brand} {product.model}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-indigo-600">{formatCurrency(product.selling_price)}</span>
                            <span className="text-[10px] text-slate-400">المخزون: {product.stock_quantity}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cart */}
                  <div className="w-80 bg-slate-50 p-6 flex flex-col">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <ShoppingCart size={18} />
                      سلة المشتريات
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <Package size={40} className="mb-2 opacity-20" />
                          <p className="text-xs">السلة فارغة</p>
                        </div>
                      ) : (
                        cart.map(item => (
                          <div key={item.product_id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-xs font-bold text-slate-900 truncate flex-1">{item.name}</p>
                              <button onClick={() => removeFromCart(item.product_id)} className="text-slate-400 hover:text-red-500">
                                <X size={14} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => updateCartQuantity(item.product_id, -1)}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-slate-900">{item.quantity}</span>
                                <button 
                                  onClick={() => updateCartQuantity(item.product_id, 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs font-bold text-indigo-600">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">المجموع</span>
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(cart.reduce((acc, item) => acc + (item.price * item.quantity), 0))}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-2">العميل (اختياري)</label>
                        <select 
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                          <option value="">زبون عابر</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">طريقة الدفع</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['cash', 'card', 'transfer'].map(method => (
                            <button
                              key={method}
                              onClick={() => setPaymentMethod(method)}
                              className={cn(
                                "py-2 text-[10px] font-bold rounded-lg border transition-all",
                                paymentMethod === method 
                                  ? "bg-indigo-600 border-indigo-600 text-white" 
                                  : "bg-white border-slate-200 text-slate-500 hover:border-indigo-500"
                              )}
                            >
                              {method === 'cash' ? 'نقداً' : method === 'card' ? 'بطاقة' : 'تحويل'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={handleAddSale}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        إتمام البيع
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {itemToDelete && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 text-right"
              >
                <div className="p-6">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">تأكيد الحذف</h3>
                  <p className="text-slate-500 text-center mb-6">
                    هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setItemToDelete(null)}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={() => {
                        if (itemToDelete.type === 'customer') handleDeleteCustomer(itemToDelete.id);
                        if (itemToDelete.type === 'product') handleDeleteProduct(itemToDelete.id);
                        if (itemToDelete.type === 'repair') handleDeleteRepair(itemToDelete.id);
                        if (itemToDelete.type === 'sale') handleDeleteSale(itemToDelete.id);
                      }}
                      className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                    >
                      تأكيد الحذف
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
