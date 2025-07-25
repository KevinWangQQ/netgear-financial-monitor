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
          created_at: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          sector?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          sector?: string | null
          created_at?: string
        }
      }
      financial_data: {
        Row: {
          id: string
          company_id: string
          period: string
          revenue: number | null
          gross_profit: number | null
          net_income: number | null
          total_assets: number | null
          operating_expenses: number | null
          cash_and_equivalents: number | null
          total_debt: number | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          period: string
          revenue?: number | null
          gross_profit?: number | null
          net_income?: number | null
          total_assets?: number | null
          operating_expenses?: number | null
          cash_and_equivalents?: number | null
          total_debt?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          period?: string
          revenue?: number | null
          gross_profit?: number | null
          net_income?: number | null
          total_assets?: number | null
          operating_expenses?: number | null
          cash_and_equivalents?: number | null
          total_debt?: number | null
          created_at?: string
        }
      }
    }
  }
}