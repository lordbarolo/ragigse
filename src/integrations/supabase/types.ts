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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          lead_id: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_optins: {
        Row: {
          created_at: string
          email: string
          id: string
          report_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          report_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_optins_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_version_rates: {
        Row: {
          detaljer: string | null
          id: string
          timpris_kund: number
          typ: string
          version_id: string
          yrkeskategori: string
          zon: string
        }
        Insert: {
          detaljer?: string | null
          id?: string
          timpris_kund: number
          typ: string
          version_id: string
          yrkeskategori: string
          zon: string
        }
        Update: {
          detaljer?: string | null
          id?: string
          timpris_kund?: number
          typ?: string
          version_id?: string
          yrkeskategori?: string
          zon?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_version_rates_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_versions: {
        Row: {
          catalog_name: string
          effective_from: string
          id: string
          imported_at: string
          is_active: boolean
          notes: string | null
          version_label: string
        }
        Insert: {
          catalog_name: string
          effective_from: string
          id?: string
          imported_at?: string
          is_active?: boolean
          notes?: string | null
          version_label: string
        }
        Update: {
          catalog_name?: string
          effective_from?: string
          id?: string
          imported_at?: string
          is_active?: boolean
          notes?: string | null
          version_label?: string
        }
        Relationships: []
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          created_at: string
          email: string
          id: string
          report_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          email: string
          id?: string
          report_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          email?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number
          use_count: number
          used: boolean
          used_at: string | null
          used_by_report_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          use_count?: number
          used?: boolean
          used_at?: string | null
          used_by_report_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          use_count?: number
          used?: boolean
          used_at?: string | null
          used_by_report_id?: string | null
        }
        Relationships: []
      }
      invoice_review_leads: {
        Row: {
          contacted_at: string | null
          created_at: string
          email: string
          id: string
          lead_id: string
          role: string | null
          status: string
          zone: string | null
        }
        Insert: {
          contacted_at?: string | null
          created_at?: string
          email: string
          id?: string
          lead_id: string
          role?: string | null
          status?: string
          zone?: string | null
        }
        Update: {
          contacted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          lead_id?: string
          role?: string | null
          status?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_review_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          current_salary: number | null
          email: string | null
          employment_type: string
          experience: number | null
          id: string
          kommun: string | null
          paid: boolean
          salary_type: string | null
          updated_at: string
          yrke: string | null
        }
        Insert: {
          created_at?: string
          current_salary?: number | null
          email?: string | null
          employment_type: string
          experience?: number | null
          id?: string
          kommun?: string | null
          paid?: boolean
          salary_type?: string | null
          updated_at?: string
          yrke?: string | null
        }
        Update: {
          created_at?: string
          current_salary?: number | null
          email?: string | null
          employment_type?: string
          experience?: number | null
          id?: string
          kommun?: string | null
          paid?: boolean
          salary_type?: string | null
          updated_at?: string
          yrke?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          kommun: string
          lat: number | null
          lng: number | null
          region: string
          zon: string
        }
        Insert: {
          id?: string
          kommun: string
          lat?: number | null
          lng?: number | null
          region: string
          zon: string
        }
        Update: {
          id?: string
          kommun?: string
          lat?: number | null
          lng?: number | null
          region?: string
          zon?: string
        }
        Relationships: []
      }
      margin_models: {
        Row: {
          created_at: string
          employer_factor: number
          hours_per_month: number
          id: string
          industry: string
          is_active: boolean
          name: string
          share_max: number
          share_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer_factor?: number
          hours_per_month?: number
          id?: string
          industry?: string
          is_active?: boolean
          name: string
          share_max?: number
          share_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer_factor?: number
          hours_per_month?: number
          id?: string
          industry?: string
          is_active?: boolean
          name?: string
          share_max?: number
          share_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_ore: number
          created_at: string
          currency: string
          id: string
          lead_id: string
          plan: string
          report_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
        }
        Insert: {
          amount_ore?: number
          created_at?: string
          currency?: string
          id?: string
          lead_id: string
          plan?: string
          report_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
        }
        Update: {
          amount_ore?: number
          created_at?: string
          currency?: string
          id?: string
          lead_id?: string
          plan?: string
          report_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      price_changes: {
        Row: {
          change_type: string
          detected_at: string
          diff_abs: number
          diff_pct: number
          id: string
          new_timpris: number
          new_version_id: string
          old_timpris: number | null
          old_version_id: string | null
          yrkeskategori: string
          zon: string
        }
        Insert: {
          change_type?: string
          detected_at?: string
          diff_abs?: number
          diff_pct?: number
          id?: string
          new_timpris: number
          new_version_id: string
          old_timpris?: number | null
          old_version_id?: string | null
          yrkeskategori: string
          zon: string
        }
        Update: {
          change_type?: string
          detected_at?: string
          diff_abs?: number
          diff_pct?: number
          id?: string
          new_timpris?: number
          new_version_id?: string
          old_timpris?: number | null
          old_version_id?: string | null
          yrkeskategori?: string
          zon?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_changes_new_version_id_fkey"
            columns: ["new_version_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_changes_old_version_id_fkey"
            columns: ["old_version_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      rates: {
        Row: {
          detaljer: string | null
          id: string
          industry: string
          timpris_kund: number
          typ: string
          yrkeskategori: string
          zon: string
        }
        Insert: {
          detaljer?: string | null
          id?: string
          industry?: string
          timpris_kund: number
          typ: string
          yrkeskategori: string
          zon: string
        }
        Update: {
          detaljer?: string | null
          id?: string
          industry?: string
          timpris_kund?: number
          typ?: string
          yrkeskategori?: string
          zon?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          clicked: boolean
          created_at: string
          id: string
          lead_id: string
          referee_email: string
          referrer_email: string
          token: string
        }
        Insert: {
          clicked?: boolean
          created_at?: string
          id?: string
          lead_id: string
          referee_email: string
          referrer_email: string
          token?: string
        }
        Update: {
          clicked?: boolean
          created_at?: string
          id?: string
          lead_id?: string
          referee_email?: string
          referrer_email?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      report_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lead_id: string
          rating: string
          role: string | null
          zone: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_id: string
          rating: string
          role?: string | null
          zone?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          rating?: string
          role?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          ab_variant: string
          created_at: string
          current_salary: number | null
          email: string | null
          employment_type: string | null
          experience: number | null
          id: string
          industry: string
          kommun: string | null
          lead_id: string | null
          occupation: string | null
          paid_at: string | null
          referral_unlocked_at: string | null
          result_json: Json | null
          salary_type: string | null
          status: string
          unlocked_by_referral: boolean
        }
        Insert: {
          ab_variant?: string
          created_at?: string
          current_salary?: number | null
          email?: string | null
          employment_type?: string | null
          experience?: number | null
          id?: string
          industry?: string
          kommun?: string | null
          lead_id?: string | null
          occupation?: string | null
          paid_at?: string | null
          referral_unlocked_at?: string | null
          result_json?: Json | null
          salary_type?: string | null
          status?: string
          unlocked_by_referral?: boolean
        }
        Update: {
          ab_variant?: string
          created_at?: string
          current_salary?: number | null
          email?: string | null
          employment_type?: string | null
          experience?: number | null
          id?: string
          industry?: string
          kommun?: string | null
          lead_id?: string | null
          occupation?: string | null
          paid_at?: string | null
          referral_unlocked_at?: string | null
          result_json?: Json | null
          salary_type?: string | null
          status?: string
          unlocked_by_referral?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reports_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_benchmarks: {
        Row: {
          average_monthly: number
          created_at: string
          id: string
          industry: string
          metadata: Json | null
          occupation: string
          occupation_code: string | null
          percentile_10: number | null
          percentile_25: number | null
          percentile_50: number | null
          percentile_75: number | null
          percentile_90: number | null
          region: string | null
          sample_size: number | null
          sector: string
          source: string
          updated_at: string
          year: number
        }
        Insert: {
          average_monthly: number
          created_at?: string
          id?: string
          industry?: string
          metadata?: Json | null
          occupation: string
          occupation_code?: string | null
          percentile_10?: number | null
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          region?: string | null
          sample_size?: number | null
          sector: string
          source: string
          updated_at?: string
          year: number
        }
        Update: {
          average_monthly?: number
          created_at?: string
          id?: string
          industry?: string
          metadata?: Json | null
          occupation?: string
          occupation_code?: string | null
          percentile_10?: number | null
          percentile_25?: number | null
          percentile_50?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          region?: string | null
          sample_size?: number | null
          sector?: string
          source?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
