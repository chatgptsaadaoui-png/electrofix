export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
}

export interface Product {
  id: number;
  name: string;
  type: 'phone' | 'computer' | 'part' | 'accessory';
  brand: string;
  model: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
}

export interface Repair {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  device_type: string;
  brand: string;
  model: string;
  problem: string;
  cost_price: number;
  expected_price: number;
  status: 'pending' | 'repaired' | 'waiting_parts' | 'delivered';
  received_date: string;
  delivered_date?: string;
}

export interface Sale {
  id: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer_id?: number;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  purchase_price: number;
  price: number;
}

export interface Stats {
  repairedCount: number;
  soldCount: number;
  dailyProfit: number;
  profit: number;
  pendingRepairs: number;
  lowStock: number;
}
