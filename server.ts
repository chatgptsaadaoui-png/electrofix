import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";

console.log("SERVER.TS: Starting script execution...");

const app = express();
const PORT = 3000;

let supabase: any;
let isSupabaseConfiguredServer = false;

async function init() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const dotenv = await import("dotenv");
      dotenv.config();
    } catch (e) {
      console.warn("SERVER.TS: Failed to load .env file (this is normal in some environments)");
    }
  }

  // Supabase Configuration - Try both VITE_ and standard names
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log("SERVER.TS: Supabase URL configured:", !!supabaseUrl);
  console.log("SERVER.TS: Supabase Key configured:", !!supabaseKey);

  isSupabaseConfiguredServer = !!supabaseUrl && supabaseUrl !== "https://placeholder.supabase.co";

  try {
    console.log("SERVER.TS: Creating Supabase client with URL:", supabaseUrl?.substring(0, 15) + "...");
    supabase = createClient(
      supabaseUrl || "https://placeholder.supabase.co", 
      supabaseKey || "placeholder", 
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
    console.log("SERVER.TS: Supabase client created successfully");
  } catch (e: any) {
    console.error("SERVER.TS: Failed to create Supabase client:", e);
  }

  app.use(express.json());

  // Health check at the VERY top, before anything else
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      config: {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        nodeEnv: process.env.NODE_ENV
      }
    });
  });

  // Middleware to get user ID
  app.use("/api", (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    // Normalize userId (handle "null", "undefined" strings from frontend)
    if (userId === 'null' || userId === 'undefined' || !userId) {
      (req as any).userId = null;
    } else {
      (req as any).userId = userId;
    }
    
    console.log(`API Request: ${req.method} ${req.path} | User: ${(req as any).userId || 'Anonymous'}`);
    next();
  });

  await setupServer();
}

async function setupServer() {
  console.log("SERVER.TS: setupServer() starting...");
  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    try {
      if (!isSupabaseConfiguredServer) {
        return res.status(503).json({ 
          error: "Database not configured", 
          details: "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Settings menu." 
        });
      }

      const { period, startDate, endDate } = req.query;
      const userId = (req as any).userId;
      
      let dateFilter: any = null;
      let now = new Date();
      
      if (period === 'custom' && startDate && endDate) {
        dateFilter = { start: startDate, end: endDate };
      } else if (period === 'week') {
        let start = new Date();
        start.setDate(now.getDate() - 7);
        dateFilter = { start: start.toISOString() };
      } else if (period === 'month') {
        let start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { start: start.toISOString() };
      } else if (period === 'year') {
        let start = new Date(now.getFullYear(), 0, 1);
        dateFilter = { start: start.toISOString() };
      } else {
        // Default to today
        let start = new Date();
        start.setHours(0, 0, 0, 0);
        dateFilter = { start: start.toISOString() };
      }

      // Helper for date filtering
      const applyDateFilter = (query: any, column: string) => {
        if (userId) {
          query = query.eq('user_id', userId);
        }
        if (dateFilter) {
          if (dateFilter.end) {
            return query.gte(column, dateFilter.start).lte(column, dateFilter.end);
          }
          return query.gte(column, dateFilter.start);
        }
        return query;
      };

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Use individual awaits to prevent Promise.all rejection from crashing the server
      const repairedRes = await applyDateFilter(supabase.from('repairs').select('id', { count: 'exact', head: true }).or('status.eq.repaired,status.eq.delivered'), 'received_date');
      const salesRes = await applyDateFilter(supabase.from('sales').select('id'), 'created_at');
      
      let pendingQuery = supabase.from('repairs').select('id', { count: 'exact', head: true }).or('status.eq.pending,status.eq.waiting_parts');
      if (userId) pendingQuery = pendingQuery.eq('user_id', userId);
      const pendingRes = await pendingQuery;

      let productsQuery = supabase.from('products').select('stock_quantity, min_stock_level');
      if (userId) productsQuery = productsQuery.eq('user_id', userId);
      const productsRes = await productsQuery;

      let todaySalesQuery = supabase.from('sales').select('id').gte('created_at', todayStart.toISOString());
      if (userId) todaySalesQuery = todaySalesQuery.eq('user_id', userId);
      const todaySalesRes = await todaySalesQuery;

      let todayRepairsQuery = supabase.from('repairs').select('expected_price, cost_price').or('status.eq.repaired,status.eq.delivered').gte('received_date', todayStart.toISOString());
      if (userId) todayRepairsQuery = todayRepairsQuery.eq('user_id', userId);
      const todayRepairsRes = await todayRepairsQuery;

      // Check for errors in results
      const errors = [repairedRes, salesRes, pendingRes, productsRes, todaySalesRes, todayRepairsRes]
        .filter(r => r && r.error)
        .map(r => r.error);

      if (errors.length > 0) {
        console.error("Supabase Query Errors:", JSON.stringify(errors));
        return res.status(500).json({ error: "Database query failed", details: errors[0] });
      }

      const repairedCount = repairedRes.count;
      const salesData = salesRes.data;
      const saleIds = salesData?.map(s => s.id) || [];
      
      const pendingCount = pendingRes.count;
      const productsData = productsRes.data;
      const lowStockCount = productsData?.filter(p => p.stock_quantity <= p.min_stock_level).length || 0;

      const todaySales = todaySalesRes.data;
      const todaySaleIds = todaySales?.map(s => s.id) || [];
      
      const todayRepairs = todayRepairsRes.data;
      const todayRepairsProfit = todayRepairs?.reduce((acc, item) => acc + ((item.expected_price || 0) - (item.cost_price || 0)), 0) || 0;

      // Secondary queries that depend on saleIds
      let soldCount = 0;
      let salesProfit = 0;
      let todaySalesProfit = 0;

      const secondaryQueries = [];

      if (saleIds.length > 0) {
        secondaryQueries.push(supabase.from('sale_items').select('price, purchase_price, quantity').in('sale_id', saleIds));
      } else {
        secondaryQueries.push(Promise.resolve({ data: [] }));
      }

      if (todaySaleIds.length > 0) {
        secondaryQueries.push(supabase.from('sale_items').select('price, purchase_price, quantity').in('sale_id', todaySaleIds));
      } else {
        secondaryQueries.push(Promise.resolve({ data: [] }));
      }

      const [saleItemsRes, todaySaleItemsRes] = await Promise.all(secondaryQueries);
      
      const saleItemsData = (saleItemsRes as any).data;
      soldCount = saleItemsData?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0;
      salesProfit = saleItemsData?.reduce((acc: number, item: any) => acc + ((item.price - (item.purchase_price || 0)) * item.quantity), 0) || 0;

      const todaySaleItems = (todaySaleItemsRes as any).data;
      todaySalesProfit = todaySaleItems?.reduce((acc: number, item: any) => acc + ((item.price - (item.purchase_price || 0)) * item.quantity), 0) || 0;

      // Repaired profit calculation (already have todayRepairs, but need period repairs)
      let repairsProfitQuery = supabase.from('repairs').select('expected_price, cost_price').or('status.eq.repaired,status.eq.delivered');
      repairsProfitQuery = applyDateFilter(repairsProfitQuery, 'received_date');
      const { data: repairsProfitData } = await repairsProfitQuery;
      const repairsProfit = repairsProfitData?.reduce((acc, item) => acc + ((item.expected_price || 0) - (item.cost_price || 0)), 0) || 0;

      res.json({
        repairedCount: repairedCount || 0,
        soldCount: soldCount || 0,
        dailyProfit: todaySalesProfit + todayRepairsProfit,
        profit: salesProfit + repairsProfit,
        pendingRepairs: pendingCount || 0,
        lowStock: lowStockCount
      });
    } catch (error: any) {
      console.error("Stats error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to fetch stats", details: error.message });
    }
  });

  // Bootstrap Data (All initial data in one request)
  app.get("/api/bootstrap", async (req, res) => {
    console.log("HIT: /api/bootstrap");
    try {
      if (!isSupabaseConfiguredServer) {
        return res.status(503).json({ error: "Database not configured" });
      }

      const userId = (req as any).userId;
      
      // Fetch each one separately to avoid one failure blocking everything
      const customersRes = await (userId ? supabase.from('customers').select('*').order('name').eq('user_id', userId) : supabase.from('customers').select('*').order('name'));
      const productsRes = await (userId ? supabase.from('products').select('*').order('name').eq('user_id', userId) : supabase.from('products').select('*').order('name'));
      
      // Try complex query first, fallback to simple if it fails (common if FK is missing)
      let repairsRes = await (userId ? 
        supabase.from('repairs').select('*, customers(name, phone)').order('received_date', { ascending: false }).eq('user_id', userId) : 
        supabase.from('repairs').select('*, customers(name, phone)').order('received_date', { ascending: false }));

      if (repairsRes.error) {
        console.warn("Complex repairs query failed, falling back to simple query:", repairsRes.error.message);
        repairsRes = await (userId ? 
          supabase.from('repairs').select('*').order('received_date', { ascending: false }).eq('user_id', userId) : 
          supabase.from('repairs').select('*').order('received_date', { ascending: false }));
      }

      const salesRes = await (userId ? supabase.from('sales').select('*').order('created_at', { ascending: false }).eq('user_id', userId) : supabase.from('sales').select('*').order('created_at', { ascending: false }));

      res.json({
        customers: customersRes.data || [],
        products: productsRes.data || [],
        repairs: repairsRes.data?.map(r => ({
          ...r,
          customer_name: (r as any).customers?.name || 'عميل غير معروف',
          customer_phone: (r as any).customers?.phone || ''
        })) || [],
        sales: salesRes.data || [],
        debug: {
          customersError: customersRes.error,
          productsError: productsRes.error,
          repairsError: repairsRes.error,
          salesError: salesRes.error
        }
      });
    } catch (error: any) {
      console.error("Bootstrap error:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });

  // Debug Endpoint to check table existence
  app.get("/api/debug/tables", async (req, res) => {
    const tables = ['customers', 'products', 'repairs', 'sales', 'sale_items'];
    const results: any = {};
    
    for (const table of tables) {
      const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
      results[table] = error ? { status: 'error', message: error.message } : { status: 'ok', count };
    }
    
    res.json(results);
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const userId = (req as any).userId;
      let query = supabase.from('customers').select('*').order('name');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) {
        if (error.code === '42703') {
          return res.status(500).json({ 
            error: "DATABASE_SCHEMA_ERROR", 
            message: "Column 'user_id' is missing in 'customers' table. Please run the SQL fix in Supabase dashboard.",
            sql: "ALTER TABLE customers ADD COLUMN user_id UUID;"
          });
        }
        throw error;
      }
      res.json(data);
    } catch (error: any) {
      console.error("Customers GET error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to fetch customers", details: error.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const { name, phone, address } = req.body;
      const userId = (req as any).userId;
      console.log(`SERVER.TS: Adding customer: ${name}, userId: ${userId}`);
      
      const { data, error } = await supabase.from('customers').insert([{ name, phone, address, user_id: userId }]).select();
      
      if (error) {
        console.error("SERVER.TS: Supabase error adding customer:", JSON.stringify(error));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error("SERVER.TS: No data returned after customer insert");
        return res.status(500).json({ error: "Failed to add customer: No data returned" });
      }
      
      console.log("SERVER.TS: Customer added successfully:", data[0].id);
      res.json({ id: data[0].id });
    } catch (error: any) {
      console.error("Customers POST error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to add customer", details: error.message || error });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const { name, phone, address } = req.body;
      const userId = (req as any).userId;
      let query = supabase.from('customers').update({ name, phone, address }).eq('id', req.params.id);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Customers PUT error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to update customer", details: error.message || error });
    }
  });

  app.get("/api/customers/:id/history", async (req, res) => {
    try {
      const userId = (req as any).userId;
      let repairsQuery = supabase.from('repairs').select('*').eq('customer_id', req.params.id);
      if (userId) repairsQuery = repairsQuery.eq('user_id', userId);
      const { data: repairs, error: repairsError } = await repairsQuery;
      if (repairsError) throw repairsError;

      let salesQuery = supabase.from('sales')
        .select(`
          *,
          sale_items (
            product_id,
            quantity,
            price,
            products (
              name
            )
          )
        `)
        .eq('customer_id', req.params.id);
      
      if (userId) salesQuery = salesQuery.eq('user_id', userId);
      const { data: sales, error: salesError } = await salesQuery;

      const formattedSales = sales?.map(s => {
        const items = s.sale_items || [];
        return items.map((item: any) => ({
          ...s,
          product_id: item.product_id,
          product_name: item.products?.name,
          quantity: item.quantity,
          price: item.price
        }));
      }).flat() || [];

      res.json({ repairs, sales: formattedSales });
    } catch (error: any) {
      console.error("Customer history error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to fetch customer history" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const customerId = req.params.id;
      const userId = (req as any).userId;
      
      let updateRepairs = supabase.from('repairs').update({ customer_id: null }).eq('customer_id', customerId);
      let updateSales = supabase.from('sales').update({ customer_id: null }).eq('customer_id', customerId);
      let deleteCustomer = supabase.from('customers').delete().eq('id', customerId);

      if (userId) {
        updateRepairs = updateRepairs.eq('user_id', userId);
        updateSales = updateSales.eq('user_id', userId);
        deleteCustomer = deleteCustomer.eq('user_id', userId);
      }

      await updateRepairs;
      await updateSales;
      const { error } = await deleteCustomer;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting customer:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to delete customer." });
    }
  });

  // Products / Stock
  app.get("/api/products", async (req, res) => {
    try {
      const userId = (req as any).userId;
      let query = supabase.from('products').select('*').order('name');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) {
        if (error.code === '42703') {
          return res.status(500).json({ 
            error: "DATABASE_SCHEMA_ERROR", 
            message: "Column 'user_id' is missing in 'products' table. Please run the SQL fix in Supabase dashboard.",
            sql: "ALTER TABLE products ADD COLUMN user_id UUID;"
          });
        }
        throw error;
      }
      res.json(data);
    } catch (error: any) {
      console.error("Products GET error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, type, brand, model, purchase_price, selling_price, stock_quantity, min_stock_level } = req.body;
      const userId = (req as any).userId;
      const { data, error } = await supabase.from('products').insert([{
        name, type, brand, model, purchase_price, selling_price, stock_quantity, min_stock_level, user_id: userId
      }]).select();
      if (error) throw error;
      res.json({ id: data[0].id });
    } catch (error: any) {
      console.error("Products POST error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to add product", details: error.message || error });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const { stock_quantity } = req.body;
      const userId = (req as any).userId;
      let query = supabase.from('products').update({ stock_quantity }).eq('id', req.params.id);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Products PATCH error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { name, type, brand, model, purchase_price, selling_price, stock_quantity, min_stock_level } = req.body;
      const userId = (req as any).userId;
      let query = supabase.from('products').update({
        name, type, brand, model, purchase_price, selling_price, stock_quantity, min_stock_level
      }).eq('id', req.params.id);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Products PUT error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const productId = req.params.id;
      const userId = (req as any).userId;
      
      let updateRepairs = supabase.from('repairs').update({ product_id: null }).eq('product_id', productId);
      let updateSaleItems = supabase.from('sale_items').update({ product_id: null }).eq('product_id', productId);
      let deleteProduct = supabase.from('products').delete().eq('id', productId);

      if (userId) {
        updateRepairs = updateRepairs.eq('user_id', userId);
        deleteProduct = deleteProduct.eq('user_id', userId);
      }

      await updateRepairs;
      await updateSaleItems;
      const { error } = await deleteProduct;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting product:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to delete product." });
    }
  });

  // Repairs
  app.get("/api/repairs", async (req, res) => {
    try {
      const userId = (req as any).userId;
      let query = supabase.from('repairs')
        .select(`
          *,
          customers (
            name,
            phone
          )
        `)
        .order('received_date', { ascending: false });
      
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      
      if (error) {
        if (error.code === '42703') {
          return res.status(500).json({ 
            error: "DATABASE_SCHEMA_ERROR", 
            message: "Column 'user_id' is missing in 'repairs' table. Please run the SQL fix in Supabase dashboard.",
            sql: "ALTER TABLE repairs ADD COLUMN user_id UUID;"
          });
        }
        throw error;
      }

      const formatted = data?.map(r => ({
        ...r,
        customer_name: r.customers?.name,
        customer_phone: r.customers?.phone
      })) || [];

      res.json(formatted);
    } catch (error: any) {
      console.error("Repairs GET error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to fetch repairs" });
    }
  });

  app.post("/api/repairs", async (req, res) => {
    try {
      const { customer_id, device_type, brand, model, problem, cost_price, expected_price, product_id } = req.body;
      const userId = (req as any).userId;
      
      const { data, error } = await supabase.from('repairs').insert([{
        customer_id, device_type, brand, model, problem, cost_price: cost_price || 0, expected_price, product_id: product_id || null, user_id: userId
      }]).select();
      
      if (error) throw error;

      if (product_id) {
        // Update stock
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', product_id).single();
        if (product) {
          await supabase.from('products').update({ stock_quantity: product.stock_quantity - 1 }).eq('id', product_id);
        }
      }
      
      res.json({ id: data[0].id });
    } catch (error: any) {
      console.error("Repairs POST error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to add repair", details: error.message || error });
    }
  });

  app.put("/api/repairs/:id", async (req, res) => {
    try {
      const { customer_id, device_type, brand, model, problem, cost_price, expected_price, product_id, status } = req.body;
      const userId = (req as any).userId;
      let query = supabase.from('repairs').update({
        customer_id, device_type, brand, model, problem, cost_price: cost_price || 0, expected_price, product_id: product_id || null, status
      }).eq('id', req.params.id);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Repairs PUT error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to update repair" });
    }
  });

  app.patch("/api/repairs/:id", async (req, res) => {
    try {
      const { status, delivered_date } = req.body;
      const userId = (req as any).userId;
      const updateData: any = { status };
      if (delivered_date) updateData.delivered_date = delivered_date;
      
      let query = supabase.from('repairs').update(updateData).eq('id', req.params.id);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Repairs PATCH error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to update repair status" });
    }
  });

  // Sales
  app.post("/api/sales", async (req, res) => {
    try {
      const { items, total_amount, payment_method, customer_id } = req.body;
      const userId = (req as any).userId;
      
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        total_amount, payment_method, customer_id: customer_id || null, user_id: userId
      }]).select();
      
      if (saleError) throw saleError;
      const saleId = saleData[0].id;

      for (const item of items) {
        const { data: product } = await supabase.from('products').select('purchase_price, stock_quantity').eq('id', item.product_id).single();
        const purchasePrice = product ? product.purchase_price : 0;

        await supabase.from('sale_items').insert([{
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          purchase_price: purchasePrice,
          price: item.price
        }]);

        if (product) {
          await supabase.from('products').update({ stock_quantity: product.stock_quantity - item.quantity }).eq('id', item.product_id);
        }
      }
      
      res.json({ id: saleId });
    } catch (error: any) {
      console.error("Sales POST error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to add sale" });
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const userId = (req as any).userId;
      let query = supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) {
        if (error.code === '42703') {
          return res.status(500).json({ 
            error: "DATABASE_SCHEMA_ERROR", 
            message: "Column 'user_id' is missing in 'sales' table. Please run the SQL fix in Supabase dashboard.",
            sql: "ALTER TABLE sales ADD COLUMN user_id UUID;"
          });
        }
        throw error;
      }
      res.json(data);
    } catch (error: any) {
      console.error("Sales GET error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  // Reports
  app.get("/api/reports", async (req, res) => {
    try {
      if (!isSupabaseConfiguredServer) {
        return res.status(503).json({ error: "Database not configured" });
      }

      const userId = (req as any).userId;

      // 1. Sales by Type
      let saleItemsQuery = supabase.from('sale_items').select('quantity, price, products(type, user_id)');
      const { data: saleItemsData, error: saleItemsError } = await saleItemsQuery;
      
      if (saleItemsError) {
        console.error("Reports Sale Items Error:", saleItemsError);
        return res.status(500).json({ error: "Failed to fetch sale items for reports", details: saleItemsError });
      }
      const salesByTypeMap: any = {};
      saleItemsData?.forEach((item: any) => {
        if (userId && item.products?.user_id !== userId) return;
        const type = item.products?.type || 'other';
        const revenue = (item.quantity || 0) * (item.price || 0);
        salesByTypeMap[type] = (salesByTypeMap[type] || 0) + revenue;
      });

      // 2. Monthly Revenue
      let monthlySalesQuery = supabase.from('sales').select('created_at, total_amount');
      if (userId) monthlySalesQuery = monthlySalesQuery.eq('user_id', userId);
      const { data: monthlySales, error: monthlySalesError } = await monthlySalesQuery;
      
      if (monthlySalesError) {
        console.error("Reports Monthly Sales Error:", monthlySalesError);
        return res.status(500).json({ error: "Failed to fetch monthly sales for reports", details: monthlySalesError });
      }
      const monthlyRevenueMap: any = {};
      monthlySales?.forEach(s => {
        const month = s.created_at.substring(0, 7); // YYYY-MM
        monthlyRevenueMap[month] = (monthlyRevenueMap[month] || 0) + s.total_amount;
      });
      const monthlyRevenue = Object.entries(monthlyRevenueMap).map(([month, revenue]) => ({ month, revenue })).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

      // 3. Repair Stats
      let repairsStatsQuery = supabase.from('repairs').select('status');
      if (userId) repairsStatsQuery = repairsStatsQuery.eq('user_id', userId);
      const { data: repairsData, error: repairsError } = await repairsStatsQuery;
      
      if (repairsError) {
        console.error("Reports Repairs Error:", repairsError);
        return res.status(500).json({ error: "Failed to fetch repairs for reports", details: repairsError });
      }
      const repairStatsMap: any = {};
      repairsData?.forEach(r => {
        repairStatsMap[r.status] = (repairStatsMap[r.status] || 0) + 1;
      });

      // 4. Top Products
      let topProductsQuery = supabase.from('sale_items').select('quantity, products(name, id, user_id)');
      const { data: topProductsData, error: topProductsError } = await topProductsQuery;
      
      if (topProductsError) {
        console.error("Reports Top Products Error:", topProductsError);
        return res.status(500).json({ error: "Failed to fetch top products for reports", details: topProductsError });
      }
      const topProductsMap: any = {};
      topProductsData?.forEach((item: any) => {
        if (userId && item.products?.user_id !== userId) return;
        const name = item.products?.name || 'Unknown';
        topProductsMap[name] = (topProductsMap[name] || 0) + item.quantity;
      });
      const topProducts = Object.entries(topProductsMap).map(([name, total_sold]) => ({ name, total_sold })).sort((a: any, b: any) => b.total_sold - a.total_sold).slice(0, 5);

      // 5. Top Customers
      let topCustomersQuery = supabase.from('sales').select('total_amount, customers(name, id, user_id)');
      const { data: topCustomersData, error: topCustomersError } = await topCustomersQuery;
      
      if (topCustomersError) {
        console.error("Reports Top Customers Error:", topCustomersError);
        return res.status(500).json({ error: "Failed to fetch top customers for reports", details: topCustomersError });
      }
      const topCustomersMap: any = {};
      topCustomersData?.forEach((s: any) => {
        if (userId && s.customers?.user_id !== userId) return;
        const name = s.customers?.name || 'Unknown';
        if (!topCustomersMap[name]) topCustomersMap[name] = { total_spend: 0, count: 0 };
        topCustomersMap[name].total_spend += s.total_amount;
        topCustomersMap[name].count += 1;
      });
      const topCustomers = Object.entries(topCustomersMap).map(([name, stats]: any) => ({ name, ...stats })).sort((a, b) => b.total_spend - a.total_spend).slice(0, 5);

      // 6. Stock Value
      let productsValueQuery = supabase.from('products').select('purchase_price, selling_price, stock_quantity');
      if (userId) productsValueQuery = productsValueQuery.eq('user_id', userId);
      const { data: productsData, error: productsError } = await productsValueQuery;
      
      if (productsError) {
        console.error("Reports Products Error:", productsError);
        return res.status(500).json({ error: "Failed to fetch products for reports", details: productsError });
      }
      const stockValue = productsData?.reduce((acc, p) => ({
        purchase: acc.purchase + ((p.purchase_price || 0) * p.stock_quantity),
        selling: acc.selling + ((p.selling_price || 0) * p.stock_quantity)
      }), { purchase: 0, selling: 0 }) || { purchase: 0, selling: 0 };

      // 7. Repair Success Rate
      const totalRepairs = repairsData?.length || 0;
      const successfulRepairs = repairsData?.filter(r => r.status === 'repaired' || r.status === 'delivered').length || 0;
      const repairSuccessRate = totalRepairs > 0 ? ((successfulRepairs / totalRepairs) * 100).toFixed(1) : 0;

      const typeLabels: any = { 'part': 'قطع غيار', 'accessory': 'إكسسوارات', 'phone': 'هواتف', 'other': 'أخرى' };
      const statusLabels: any = { 'pending': 'قيد الانتظار', 'repaired': 'تم الإصلاح', 'waiting_parts': 'في انتظار القطع', 'delivered': 'تم التسليم' };

      res.json({
        monthlyRevenue,
        salesByType: Object.entries(salesByTypeMap).map(([type, value]) => ({ name: typeLabels[type] || type, value })),
        repairStats: Object.entries(repairStatsMap).map(([status, count]) => ({ status: statusLabels[status] || status, count })),
        topProducts,
        topCustomers,
        stockValue,
        repairSuccessRate
      });
    } catch (error: any) {
      console.error("Reports error:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.delete("/api/repairs/:id", async (req, res) => {
    try {
      const repairId = req.params.id;
      const userId = (req as any).userId;
      
      let deletePayments = supabase.from('repair_payments').delete().eq('repair_id', repairId);
      let deleteRepair = supabase.from('repairs').delete().eq('id', repairId);

      if (userId) {
        deleteRepair = deleteRepair.eq('user_id', userId);
      }

      await deletePayments;
      const { error } = await deleteRepair;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting repair:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to delete repair." });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const saleId = req.params.id;
      const userId = (req as any).userId;

      const { data: items } = await supabase.from('sale_items').select('product_id, quantity').eq('sale_id', saleId);
      
      if (items) {
        for (const item of items) {
          let productQuery = supabase.from('products').select('stock_quantity').eq('id', item.product_id);
          if (userId) productQuery = productQuery.eq('user_id', userId);
          const { data: product } = await productQuery.single();
          
          if (product) {
            let updateProduct = supabase.from('products').update({ stock_quantity: product.stock_quantity + item.quantity }).eq('id', item.product_id);
            if (userId) updateProduct = updateProduct.eq('user_id', userId);
            await updateProduct;
          }
        }
      }
      
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      let deleteSale = supabase.from('sales').delete().eq('id', saleId);
      if (userId) deleteSale = deleteSale.eq('user_id', userId);
      const { error } = await deleteSale;
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting sale:", JSON.stringify(error));
      res.status(500).json({ error: "Failed to delete sale." });
    }
  });

  // Catch-all for API routes to prevent falling through to Vite/HTML
  app.all("/api/*", (req, res) => {
    console.warn(`API Route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: `API Route ${req.method} ${req.path} not found` });
  });

  // Error handler for API routes - MUST be after routes
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("SERVER.TS: API Error:", err);
    res.status(500).json({ 
      error: "API Error", 
      details: err.message,
      path: req.path
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("SERVER.TS: Initializing Vite middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("SERVER.TS: Vite middleware initialized");
    } catch (e) {
      console.error("SERVER.TS: Failed to initialize Vite middleware:", e);
    }
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SERVER.TS: Server running on http://0.0.0.0:${PORT}`);
    });
  } else {
    console.log("SERVER.TS: Running in production mode (Vercel)");
    // In Vercel, we don't need to serve static files from Express
    // because Vercel handles the static routing via vercel.json
  }
  console.log("SERVER.TS: setupServer() finished");
}

// Start the setup
init().catch(err => {
  console.error("SERVER.TS: Critical failure in init():", err);
});

// Export app for Vercel
export default app;
