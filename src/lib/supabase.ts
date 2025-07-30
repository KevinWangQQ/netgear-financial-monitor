import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          symbol: string
          name: string
          sector: string | null
          industry: string | null
          market_cap: number | null
          employees: number | null
          founded_year: number | null
          headquarters: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          employees?: number | null
          founded_year?: number | null
          headquarters?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          employees?: number | null
          founded_year?: number | null
          headquarters?: string | null
          website?: string | null
          updated_at?: string
        }
      }
      financial_data: {
        Row: {
          id: string
          company_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          revenue: number | null
          gross_profit: number | null
          net_income: number | null
          operating_income: number | null
          operating_expenses: number | null
          total_assets: number | null
          current_assets: number | null
          cash_and_equivalents: number | null
          total_debt: number | null
          current_liabilities: number | null
          shareholders_equity: number | null
          operating_cash_flow: number | null
          investing_cash_flow: number | null
          financing_cash_flow: number | null
          free_cash_flow: number | null
          shares_outstanding: number | null
          eps: number | null
          data_source: string | null
          confidence_level: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          revenue?: number | null
          gross_profit?: number | null
          net_income?: number | null
          operating_income?: number | null
          operating_expenses?: number | null
          total_assets?: number | null
          current_assets?: number | null
          cash_and_equivalents?: number | null
          total_debt?: number | null
          current_liabilities?: number | null
          shareholders_equity?: number | null
          operating_cash_flow?: number | null
          investing_cash_flow?: number | null
          financing_cash_flow?: number | null
          free_cash_flow?: number | null
          shares_outstanding?: number | null
          eps?: number | null
          data_source?: string | null
          confidence_level?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          period?: string
          fiscal_year?: number
          fiscal_quarter?: number
          revenue?: number | null
          gross_profit?: number | null
          net_income?: number | null
          operating_income?: number | null
          operating_expenses?: number | null
          total_assets?: number | null
          current_assets?: number | null
          cash_and_equivalents?: number | null
          total_debt?: number | null
          current_liabilities?: number | null
          shareholders_equity?: number | null
          operating_cash_flow?: number | null
          investing_cash_flow?: number | null
          financing_cash_flow?: number | null
          free_cash_flow?: number | null
          shares_outstanding?: number | null
          eps?: number | null
          data_source?: string | null
          confidence_level?: number | null
          updated_at?: string
        }
      }
      product_line_revenue: {
        Row: {
          id: string
          company_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          category_level: number
          parent_category_id: string | null
          category_name: string
          revenue: number
          revenue_percentage: number | null
          cost_of_goods_sold: number | null
          gross_profit: number | null
          gross_margin: number | null
          yoy_growth: number | null
          qoq_growth: number | null
          data_source: string | null
          estimation_method: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          category_level: number
          parent_category_id?: string | null
          category_name: string
          revenue: number
          revenue_percentage?: number | null
          cost_of_goods_sold?: number | null
          gross_profit?: number | null
          gross_margin?: number | null
          yoy_growth?: number | null
          qoq_growth?: number | null
          data_source?: string | null
          estimation_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          period?: string
          fiscal_year?: number
          fiscal_quarter?: number
          category_level?: number
          parent_category_id?: string | null
          category_name?: string
          revenue?: number
          revenue_percentage?: number | null
          cost_of_goods_sold?: number | null
          gross_profit?: number | null
          gross_margin?: number | null
          yoy_growth?: number | null
          qoq_growth?: number | null
          data_source?: string | null
          estimation_method?: string | null
          updated_at?: string
        }
      }
      geographic_revenue: {
        Row: {
          id: string
          company_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          region: string
          country: string | null
          country_code: string | null
          revenue: number
          revenue_percentage: number | null
          market_size: number | null
          market_share: number | null
          competitor_count: number | null
          yoy_growth: number | null
          qoq_growth: number | null
          latitude: number | null
          longitude: number | null
          data_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          region: string
          country?: string | null
          country_code?: string | null
          revenue: number
          revenue_percentage?: number | null
          market_size?: number | null
          market_share?: number | null
          competitor_count?: number | null
          yoy_growth?: number | null
          qoq_growth?: number | null
          latitude?: number | null
          longitude?: number | null
          data_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          period?: string
          fiscal_year?: number
          fiscal_quarter?: number
          region?: string
          country?: string | null
          country_code?: string | null
          revenue?: number
          revenue_percentage?: number | null
          market_size?: number | null
          market_share?: number | null
          competitor_count?: number | null
          yoy_growth?: number | null
          qoq_growth?: number | null
          latitude?: number | null
          longitude?: number | null
          data_source?: string | null
          updated_at?: string
        }
      }
      milestone_events: {
        Row: {
          id: string
          company_id: string
          event_date: string
          event_type: string
          title: string
          description: string | null
          impact_type: string
          impact_level: number
          estimated_revenue_impact: number | null
          estimated_impact_percentage: number | null
          related_metrics: string[] | null
          affected_product_lines: string[] | null
          affected_regions: string[] | null
          data_source: string | null
          source_url: string | null
          verification_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          event_date: string
          event_type: string
          title: string
          description?: string | null
          impact_type: string
          impact_level: number
          estimated_revenue_impact?: number | null
          estimated_impact_percentage?: number | null
          related_metrics?: string[] | null
          affected_product_lines?: string[] | null
          affected_regions?: string[] | null
          data_source?: string | null
          source_url?: string | null
          verification_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          event_date?: string
          event_type?: string
          title?: string
          description?: string | null
          impact_type?: string
          impact_level?: number
          estimated_revenue_impact?: number | null
          estimated_impact_percentage?: number | null
          related_metrics?: string[] | null
          affected_product_lines?: string[] | null
          affected_regions?: string[] | null
          data_source?: string | null
          source_url?: string | null
          verification_status?: string | null
          updated_at?: string
        }
      }
      competitor_data: {
        Row: {
          id: string
          company_id: string
          competitor_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          revenue: number | null
          gross_profit: number | null
          net_income: number | null
          market_cap: number | null
          gross_margin: number | null
          net_margin: number | null
          roe: number | null
          roa: number | null
          market_share: number | null
          revenue_growth_yoy: number | null
          employee_count: number | null
          rd_expense: number | null
          rd_percentage: number | null
          data_source: string | null
          data_quality_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          competitor_id: string
          period: string
          fiscal_year: number
          fiscal_quarter: number
          revenue?: number | null
          gross_profit?: number | null
          net_income?: number | null
          market_cap?: number | null
          gross_margin?: number | null
          net_margin?: number | null
          roe?: number | null
          roa?: number | null
          market_share?: number | null
          revenue_growth_yoy?: number | null
          employee_count?: number | null
          rd_expense?: number | null
          rd_percentage?: number | null
          data_source?: string | null
          data_quality_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          competitor_id?: string
          period?: string
          fiscal_year?: number
          fiscal_quarter?: number
          revenue?: number | null
          gross_profit?: number | null
          net_income?: number | null
          market_cap?: number | null
          gross_margin?: number | null
          net_margin?: number | null
          roe?: number | null
          roa?: number | null
          market_share?: number | null
          revenue_growth_yoy?: number | null
          employee_count?: number | null
          rd_expense?: number | null
          rd_percentage?: number | null
          data_source?: string | null
          data_quality_score?: number | null
          updated_at?: string
        }
      }
    }
  }
}