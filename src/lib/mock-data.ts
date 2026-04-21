// Shared utility functions and TypeScript interfaces for Ngasir POS
// Mock data arrays have been removed — data now comes from the API.

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  createdAt: string;
  totalAmount: number;
  cashAmount?: number | null; // uang tunai diterima (null untuk QRIS)
  paymentMethod: "CASH" | "QRIS";
  status: "PAID" | "PENDING";
  itemCount: number;
  items?: Array<{ name: string; qty: number; price: number }>;
}

export interface HourlySales {
  hour: string;
  sales: number;
  transactions: number;
}

export interface DailyTrend {
  date: string;
  sales: number;
  transactions: number;
}

export interface DashboardStats {
  todaySales: number;
  todaySalesChange: number;
  todayTransactions: number;
  todayTransactionsChange: number;
  averageOrderValue: number;
  averageOrderChange: number;
  productsSold: number;
  productsSoldChange: number;
}

// Format Indonesian Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format compact number (e.g., 2.4jt)
export function formatCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}rb`;
  }
  return amount.toString();
}
