export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advances: {
        Row: {
          advance_date: string
          amount: number
          created_at: string
          created_by: string | null
          deducted: number
          id: string
          notes: string | null
          person_name: string
        }
        Insert: {
          advance_date?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          deducted?: number
          id?: string
          notes?: string | null
          person_name: string
        }
        Update: {
          advance_date?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          deducted?: number
          id?: string
          notes?: string | null
          person_name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      entities: {
        Row: {
          created_at: string
          created_by: string | null
          credit_limit: number
          id: string
          is_active: boolean
          kind: string
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          invoice_id: string
          item_name: string
          line_total: number
          product_id: string | null
          quantity: number
          sale_kind: string
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          invoice_id: string
          item_name: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          sale_kind?: string
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          invoice_id?: string
          item_name?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          sale_kind?: string
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount: number
          entity_id: string | null
          id: string
          invoice_date: string
          invoice_no: string
          notes: string | null
          paid: number
          payment_type: string
          sale_type: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount?: number
          entity_id?: string | null
          id?: string
          invoice_date?: string
          invoice_no: string
          notes?: string | null
          paid?: number
          payment_type?: string
          sale_type?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          entity_id?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string
          notes?: string | null
          paid?: number
          payment_type?: string
          sale_type?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_withdrawals: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          withdrawal_date: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          withdrawal_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          withdrawal_date?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          direction: string
          entity_id: string | null
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          paid_at: string
          purchase_id: string | null
          receipt_no: string | null
          ref_type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          direction?: string
          entity_id?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
          purchase_id?: string | null
          receipt_no?: string | null
          ref_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          direction?: string
          entity_id?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
          purchase_id?: string | null
          receipt_no?: string | null
          ref_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          name: string
          sale_price: number
          stock_qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          cost_price?: number
          created_at?: string
          id?: string
          name: string
          sale_price?: number
          stock_qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          name?: string
          sale_price?: number
          stock_qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          entity_id: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          owner_note: string | null
          phone: string | null
          subscription_status: string
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          entity_id?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          is_approved?: boolean
          owner_note?: string | null
          phone?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          entity_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          owner_note?: string | null
          phone?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          item_name: string
          line_total: number
          product_id: string | null
          purchase_id: string
          quantity: number
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          item_name: string
          line_total?: number
          product_id?: string | null
          purchase_id: string
          quantity?: number
          unit?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          item_name?: string
          line_total?: number
          product_id?: string | null
          purchase_id?: string
          quantity?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number
          entity_id: string | null
          id: string
          notes: string | null
          paid: number
          payment_type: string
          purchase_date: string
          purchase_no: string
          supplier_id: string | null
          supplier_name: string
          supplier_phone: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number
          entity_id?: string | null
          id?: string
          notes?: string | null
          paid?: number
          payment_type?: string
          purchase_date?: string
          purchase_no: string
          supplier_id?: string | null
          supplier_name: string
          supplier_phone?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number
          entity_id?: string | null
          id?: string
          notes?: string | null
          paid?: number
          payment_type?: string
          purchase_date?: string
          purchase_no?: string
          supplier_id?: string | null
          supplier_name?: string
          supplier_phone?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          business_name: string
          currency: string
          debt_message_template: string
          id: string
          phone: string | null
          statement_message_template: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_name?: string
          currency?: string
          debt_message_template?: string
          id?: string
          phone?: string | null
          statement_message_template?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_name?: string
          currency?: string
          debt_message_template?: string
          id?: string
          phone?: string | null
          statement_message_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_counts: {
        Row: {
          count_date: string
          counted_qty: number
          created_at: string
          created_by: string | null
          difference: number
          id: string
          item_name: string
          notes: string | null
          product_id: string | null
          system_qty: number
        }
        Insert: {
          count_date?: string
          counted_qty?: number
          created_at?: string
          created_by?: string | null
          difference?: number
          id?: string
          item_name: string
          notes?: string | null
          product_id?: string | null
          system_qty?: number
        }
        Update: {
          count_date?: string
          counted_qty?: number
          created_at?: string
          created_by?: string | null
          difference?: number
          id?: string
          item_name?: string
          notes?: string | null
          product_id?: string | null
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_name: string
          loss_amount: number
          product_id: string | null
          quantity: number
          reason: string | null
          unit: string
          unit_cost: number
          waste_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_name: string
          loss_amount?: number
          product_id?: string | null
          quantity?: number
          reason?: string | null
          unit?: string
          unit_cost?: number
          waste_date?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_name?: string
          loss_amount?: number
          product_id?: string | null
          quantity?: number
          reason?: string | null
          unit?: string
          unit_cost?: number
          waste_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_user: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_system_owner: { Args: never; Returns: boolean }
      my_entity_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "manager" | "seller" | "customer" | "system_owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["manager", "seller", "customer", "system_owner"],
    },
  },
} as const
