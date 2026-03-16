
// Database Service using Express API
// This ensures the app works with the SQLite database on the server

const apiFetch = async (endpoint: string, options: any = {}) => {
  const userId = localStorage.getItem('supabase_user_id');
  try {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || '',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API Error');
    }
    return response.json();
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error('تعذر الاتصال بالسيرفر. يرجى التأكد من أن التطبيق يعمل.');
    }
    throw error;
  }
};

export const dbService = {
  // Customers
  getCustomers: () => apiFetch('/customers'),
  addCustomer: (customer: any) => apiFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  }),
  updateCustomer: (id: number, data: any) => apiFetch(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCustomer: (id: number) => apiFetch(`/customers/${id}`, {
    method: 'DELETE',
  }),

  // Products
  getProducts: () => apiFetch('/products'),
  addProduct: (product: any) => apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: (id: number, data: any) => apiFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteProduct: (id: number) => apiFetch(`/products/${id}`, {
    method: 'DELETE',
  }),

  // Repairs
  getRepairs: () => apiFetch('/repairs'),
  addRepair: (repair: any) => apiFetch('/repairs', {
    method: 'POST',
    body: JSON.stringify(repair),
  }),
  updateRepair: (id: number, data: any) => apiFetch(`/repairs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  patchRepair: (id: number, data: any) => apiFetch(`/repairs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteRepair: (id: number) => apiFetch(`/repairs/${id}`, {
    method: 'DELETE',
  }),

  // Sales
  getSales: () => apiFetch('/sales'),
  addSale: (saleData: any) => apiFetch('/sales', {
    method: 'POST',
    body: JSON.stringify(saleData),
  }),
  deleteSale: (id: number) => apiFetch(`/sales/${id}`, {
    method: 'DELETE',
  }),

  // Stats
  getStats: (period: string, startDate?: string, endDate?: string) => {
    let url = `/stats?period=${period}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return apiFetch(url);
  },

  // Reports
  getReports: () => apiFetch('/reports'),

  // Bootstrap
  bootstrap: () => apiFetch('/bootstrap')
};
