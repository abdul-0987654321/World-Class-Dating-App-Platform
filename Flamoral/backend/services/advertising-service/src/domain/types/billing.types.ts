/**
 * Billing and Payment Types
 */

export interface BillingAccount {
  id: string;
  advertiser_id: string;
  payment_method_id?: string;
  billing_type: BillingType;
  balance: number;
  currency: string;
  credit_limit?: number;
  auto_recharge?: AutoRecharge;
  status: BillingStatus;
  created_at: Date;
  updated_at: Date;
}

export type BillingType = 'prepaid' | 'postpaid' | 'credit';
export type BillingStatus = 'active' | 'suspended' | 'closed';

export interface AutoRecharge {
  enabled: boolean;
  threshold: number;
  recharge_amount: number;
  payment_method_id: string;
}

export interface BillingTransaction {
  id: string;
  billing_account_id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  reference_id?: string;
  status: TransactionStatus;
  created_at: Date;
  processed_at?: Date;
  metadata?: Record<string, any>;
}

export type TransactionType = 'charge' | 'refund' | 'deposit' | 'adjustment' | 'credit';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface AdSpend {
  id: string;
  campaign_id: string;
  ad_id: string;
  billing_account_id: string;
  spend_type: SpendType;
  amount: number;
  currency: string;
  quantity: number;
  unit_price: number;
  timestamp: Date;
  billing_period: string;
}

export type SpendType = 'impression' | 'click' | 'conversion' | 'flat_fee';

export interface Invoice {
  id: string;
  billing_account_id: string;
  invoice_number: string;
  billing_period: { start: Date; end: Date };
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: Date;
  due_date: Date;
  paid_at?: Date;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  campaign_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  period: { start: Date; end: Date };
}

export interface BillingReport {
  billing_account_id: string;
  period: { start: Date; end: Date };
  summary: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    avg_cpc: number;
    avg_cpm: number;
    avg_cpa: number;
  };
  campaign_breakdown: CampaignSpendBreakdown[];
  daily_spend: DailySpend[];
}

export interface CampaignSpendBreakdown {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
}

export interface DailySpend {
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}
