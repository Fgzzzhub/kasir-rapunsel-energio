export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          theme: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          theme: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_settings: {
        Row: {
          business_id: string;
          address: string | null;
          phone: string | null;
          receipt_footer_text: string | null;
          tax_percentage: number;
          service_charge_percentage: number;
          google_sheets_webhook_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          address?: string | null;
          phone?: string | null;
          receipt_footer_text?: string | null;
          tax_percentage?: number;
          service_charge_percentage?: number;
          google_sheets_webhook_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          address?: string | null;
          phone?: string | null;
          receipt_footer_text?: string | null;
          tax_percentage?: number;
          service_charge_percentage?: number;
          google_sheets_webhook_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          base_salary: number;
          business_id: string;
          commission_rate: number;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          phone: string | null;
          position: string | null;
          updated_at: string;
        };
        Insert: {
          base_salary?: number;
          business_id: string;
          commission_rate?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          phone?: string | null;
          position?: string | null;
          updated_at?: string;
        };
        Update: {
          base_salary?: number;
          business_id?: string;
          commission_rate?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          phone?: string | null;
          position?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          business_id: string;
          category: string;
          created_at: string;
          created_by: string | null;
          expense_date: string;
          id: string;
          name: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          business_id: string;
          category: string;
          created_at?: string;
          created_by?: string | null;
          expense_date: string;
          id?: string;
          name: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          business_id?: string;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          expense_date?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_active?: boolean;
          name?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          business_id: string;
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          sku: string | null;
          updated_at: string;
          track_stock: boolean;
          current_stock: number;
          minimum_stock: number;
          cost_price: number;
        };
        Insert: {
          business_id: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          price: number;
          sku?: string | null;
          updated_at?: string;
          track_stock?: boolean;
          current_stock?: number;
          minimum_stock?: number;
          cost_price?: number;
        };
        Update: {
          business_id?: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          sku?: string | null;
          updated_at?: string;
          track_stock?: boolean;
          current_stock?: number;
          minimum_stock?: number;
          cost_price?: number;
        };
        Relationships: [];
      };
      salary_adjustments: {
        Row: {
          adjustment_date: string;
          amount: number;
          business_id: string;
          created_at: string;
          created_by: string | null;
          employee_id: string;
          id: string;
          notes: string | null;
          type: string;
        };
        Insert: {
          adjustment_date: string;
          amount: number;
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          id?: string;
          notes?: string | null;
          type: string;
        };
        Update: {
          adjustment_date?: string;
          amount?: number;
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          id?: string;
          notes?: string | null;
          type?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          business_id: string;
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          is_active?: boolean;
          name: string;
          price: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          key: string;
          updated_at: string;
          value: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          key: string;
          updated_at?: string;
          value?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          key?: string;
          updated_at?: string;
          value?: string | null;
        };
        Relationships: [];
      };
      sync_logs: {
        Row: {
          business_id: string;
          created_at: string;
          error_message: string | null;
          id: string;
          reference_id: string | null;
          status: string;
          synced_at: string | null;
          type: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          reference_id?: string | null;
          status?: string;
          synced_at?: string | null;
          type: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          reference_id?: string | null;
          status?: string;
          synced_at?: string | null;
          type?: string;
        };
        Relationships: [];
      };
      transaction_products: {
        Row: {
          created_at: string;
          commission_amount: number;
          commission_rate_snapshot: number;
          employee_id: string | null;
          employee_name_snapshot: string | null;
          id: string;
          price_snapshot: number;
          product_id: string;
          product_name_snapshot: string;
          qty: number;
          subtotal: number;
          transaction_id: string;
        };
        Insert: {
          created_at?: string;
          commission_amount?: number;
          commission_rate_snapshot?: number;
          employee_id?: string | null;
          employee_name_snapshot?: string | null;
          id?: string;
          price_snapshot: number;
          product_id: string;
          product_name_snapshot: string;
          qty: number;
          subtotal: number;
          transaction_id: string;
        };
        Update: {
          created_at?: string;
          commission_amount?: number;
          commission_rate_snapshot?: number;
          employee_id?: string | null;
          employee_name_snapshot?: string | null;
          id?: string;
          price_snapshot?: number;
          product_id?: string;
          product_name_snapshot?: string;
          qty?: number;
          subtotal?: number;
          transaction_id?: string;
        };
        Relationships: [];
      };
      transaction_services: {
        Row: {
          commission_amount: number;
          commission_rate_snapshot: number;
          created_at: string;
          employee_id: string | null;
          employee_name_snapshot: string | null;
          id: string;
          original_price_snapshot: number;
          price_adjustment_amount: number | null;
          price_adjustment_reason: string | null;
          price_snapshot: number;
          service_id: string;
          service_name_snapshot: string;
          total_commission_amount: number;
          transaction_id: string;
        };
        Insert: {
          commission_amount?: number | null;
          commission_rate_snapshot?: number;
          created_at?: string;
          employee_id?: string | null;
          employee_name_snapshot?: string | null;
          id?: string;
          original_price_snapshot: number;
          price_adjustment_amount?: number | null;
          price_adjustment_reason?: string | null;
          price_snapshot: number;
          service_id: string;
          service_name_snapshot: string;
          total_commission_amount?: number;
          transaction_id: string;
        };
        Update: {
          commission_amount?: number | null;
          commission_rate_snapshot?: number;
          created_at?: string;
          employee_id?: string | null;
          employee_name_snapshot?: string | null;
          id?: string;
          original_price_snapshot?: number;
          price_adjustment_amount?: number | null;
          price_adjustment_reason?: string | null;
          price_snapshot?: number;
          service_id?: string;
          service_name_snapshot?: string;
          total_commission_amount?: number;
          transaction_id?: string;
        };
        Relationships: [];
      };
      transaction_service_employees: {
        Row: {
          commission_amount: number;
          commission_rate_snapshot: number;
          created_at: string;
          employee_id: string;
          employee_name_snapshot: string;
          id: string;
          split_base_amount: number;
          split_percentage: number | null;
          split_type: string;
          transaction_service_id: string;
        };
        Insert: {
          commission_amount: number;
          commission_rate_snapshot: number;
          created_at?: string;
          employee_id: string;
          employee_name_snapshot: string;
          id?: string;
          split_base_amount: number;
          split_percentage?: number | null;
          split_type?: string;
          transaction_service_id: string;
        };
        Update: {
          commission_amount?: number;
          commission_rate_snapshot?: number;
          created_at?: string;
          employee_id?: string;
          employee_name_snapshot?: string;
          id?: string;
          split_base_amount?: number;
          split_percentage?: number | null;
          split_type?: string;
          transaction_service_id?: string;
        };
        Relationships: [];
      };
      attendance_records: {
        Row: {
          attendance_date: string;
          business_id: string;
          check_in_time: string | null;
          check_out_time: string | null;
          created_at: string;
          created_by: string | null;
          deduction_amount: number;
          employee_id: string;
          id: string;
          meal_allowance_amount: number;
          meal_allowance_eligible: boolean;
          notes: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attendance_date: string;
          business_id: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          created_at?: string;
          created_by?: string | null;
          deduction_amount?: number;
          employee_id: string;
          id?: string;
          meal_allowance_amount?: number;
          meal_allowance_eligible?: boolean;
          notes?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          attendance_date?: string;
          business_id?: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          created_at?: string;
          created_by?: string | null;
          deduction_amount?: number;
          employee_id?: string;
          id?: string;
          meal_allowance_amount?: number;
          meal_allowance_eligible?: boolean;
          notes?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          id: string;
          notes: string | null;
          payment_method: string;
          total_amount: number;
          tax_amount: number;
          service_charge_amount: number;
          updated_at: string;
          status: string;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          id?: string;
          notes?: string | null;
          payment_method: string;
          total_amount: number;
          tax_amount?: number;
          service_charge_amount?: number;
          updated_at?: string;
          status?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          id?: string;
          notes?: string | null;
          payment_method?: string;
          total_amount?: number;
          tax_amount?: number;
          service_charge_amount?: number;
          updated_at?: string;
          status?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          address: string | null;
          business_id: string;
          contact_info: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          business_id: string;
          contact_info?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          business_id?: string;
          contact_info?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          movement_type: string;
          notes: string | null;
          product_id: string;
          quantity: number;
          previous_stock: number;
          new_stock: number;
          reference_id: string | null;
          supplier_id: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type: string;
          notes?: string | null;
          product_id: string;
          quantity: number;
          previous_stock?: number;
          new_stock?: number;
          reference_id?: string | null;
          supplier_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type?: string;
          notes?: string | null;
          product_id?: string;
          quantity?: number;
          previous_stock?: number;
          new_stock?: number;
          reference_id?: string | null;
          supplier_id?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          business_id: string;
          created_at: string;
          created_by: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
        };
        Insert: {
          action: string;
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Update: {
          action?: string;
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
        };
        Relationships: [];
      };
      payroll_periods: {
        Row: {
          business_id: string;
          created_at: string;
          end_date: string;
          id: string;
          is_locked: boolean;
          locked_at: string | null;
          locked_by: string | null;
          start_date: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          end_date: string;
          id?: string;
          is_locked?: boolean;
          locked_at?: string | null;
          locked_by?: string | null;
          start_date: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          end_date?: string;
          id?: string;
          is_locked?: boolean;
          locked_at?: string | null;
          locked_by?: string | null;
          start_date?: string;
        };
        Relationships: [];
      };
      cash_drawer_sessions: {
        Row: {
          business_id: string;
          closed_at: string | null;
          closed_by: string | null;
          ending_cash_actual: number | null;
          ending_cash_expected: number | null;
          id: string;
          notes: string | null;
          opened_at: string;
          opened_by: string | null;
          starting_cash: number;
          status: string;
        };
        Insert: {
          business_id: string;
          closed_at?: string | null;
          closed_by?: string | null;
          ending_cash_actual?: number | null;
          ending_cash_expected?: number | null;
          id?: string;
          notes?: string | null;
          opened_at?: string;
          opened_by?: string | null;
          starting_cash: number;
          status?: string;
        };
        Update: {
          business_id?: string;
          closed_at?: string | null;
          closed_by?: string | null;
          ending_cash_actual?: number | null;
          ending_cash_expected?: number | null;
          id?: string;
          notes?: string | null;
          opened_at?: string;
          opened_by?: string | null;
          starting_cash?: number;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_transaction: {
        Args: {
          p_business_id: string;
          p_customer_name: string;
          p_customer_phone: string | null;
          p_payment_method: string;
          p_notes: string | null;
          p_created_by: string;
          p_services: Json;
          p_products: Json;
        };
        Returns: Json;
      };
      record_stock_movement: {
        Args: {
          p_product_id: string;
          p_business_id: string;
          p_movement_type: string;
          p_quantity: number;
          p_notes: string | null;
          p_supplier_id: string | null;
          p_created_by: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
