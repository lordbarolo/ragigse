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
      analyses: {
        Row: {
          created_at: string
          current_salary: number | null
          employment_type: string | null
          id: string
          location: string | null
          result_data: Json | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_salary?: number | null
          employment_type?: string | null
          id?: string
          location?: string | null
          result_data?: Json | null
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_salary?: number | null
          employment_type?: string | null
          id?: string
          location?: string | null
          result_data?: Json | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      assignments: {
        Row: {
          agency_org_id: string | null
          buyer_org_id: string | null
          consultant_id: string
          created_at: string
          duration_weeks: number | null
          end_date: string | null
          hourly_rate: number | null
          id: string
          invoiced_total: number | null
          region_id: string | null
          specialty_id: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          agency_org_id?: string | null
          buyer_org_id?: string | null
          consultant_id: string
          created_at?: string
          duration_weeks?: number | null
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          invoiced_total?: number | null
          region_id?: string | null
          specialty_id?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          agency_org_id?: string | null
          buyer_org_id?: string | null
          consultant_id?: string
          created_at?: string
          duration_weeks?: number | null
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          invoiced_total?: number | null
          region_id?: string | null
          specialty_id?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_agency_org_id_fkey"
            columns: ["agency_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
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
      benchmark_rates: {
        Row: {
          contract_version_id: string | null
          created_at: string
          id: string
          percentile: number
          rate_type: string
          source: string | null
          specialty_id: string | null
          valid_from: string | null
          valid_to: string | null
          value: number
          zone_id: string | null
        }
        Insert: {
          contract_version_id?: string | null
          created_at?: string
          id?: string
          percentile: number
          rate_type: string
          source?: string | null
          specialty_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value: number
          zone_id?: string | null
        }
        Update: {
          contract_version_id?: string | null
          created_at?: string
          id?: string
          percentile?: number
          rate_type?: string
          source?: string | null
          specialty_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_rates_contract_version_id_fkey"
            columns: ["contract_version_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_rates_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      calloff_history: {
        Row: {
          buyer: string
          calloff_date: string
          created_at: string | null
          duration_weeks: number | null
          id: string
          location: string
          yrkeskategori: string
          zon: string
        }
        Insert: {
          buyer: string
          calloff_date: string
          created_at?: string | null
          duration_weeks?: number | null
          id?: string
          location: string
          yrkeskategori: string
          zon: string
        }
        Update: {
          buyer?: string
          calloff_date?: string
          created_at?: string | null
          duration_weeks?: number | null
          id?: string
          location?: string
          yrkeskategori?: string
          zon?: string
        }
        Relationships: []
      }
      compensation_reports: {
        Row: {
          calc_version: string
          consultant_id: string
          created_at: string
          current_rate: number | null
          id: string
          market_p50: number | null
          market_p75: number | null
          market_p90: number | null
          negotiation_gap: number | null
          report_type: string
          result_json: Json | null
        }
        Insert: {
          calc_version?: string
          consultant_id: string
          created_at?: string
          current_rate?: number | null
          id?: string
          market_p50?: number | null
          market_p75?: number | null
          market_p90?: number | null
          negotiation_gap?: number | null
          report_type: string
          result_json?: Json | null
        }
        Update: {
          calc_version?: string
          consultant_id?: string
          created_at?: string
          current_rate?: number | null
          id?: string
          market_p50?: number | null
          market_p75?: number | null
          market_p90?: number | null
          negotiation_gap?: number | null
          report_type?: string
          result_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "compensation_reports_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_documents: {
        Row: {
          consultant_id: string
          document_type: string
          expires_at: string | null
          file_name: string
          file_url: string
          id: string
          notes: string | null
          uploaded_at: string
        }
        Insert: {
          consultant_id: string
          document_type: string
          expires_at?: string | null
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Update: {
          consultant_id?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_documents_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_profiles: {
        Row: {
          care_setting: string | null
          created_at: string
          current_hourly_rate: number | null
          current_monthly_salary: number | null
          employment_type: string | null
          experience_years: number | null
          id: string
          leadership: boolean | null
          on_call: boolean | null
          onboarding_step: number
          region_id: string | null
          salary_type: string | null
          sector: string | null
          shift_pattern: string | null
          specialty_id: string | null
          staffing_agency_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          care_setting?: string | null
          created_at?: string
          current_hourly_rate?: number | null
          current_monthly_salary?: number | null
          employment_type?: string | null
          experience_years?: number | null
          id?: string
          leadership?: boolean | null
          on_call?: boolean | null
          onboarding_step?: number
          region_id?: string | null
          salary_type?: string | null
          sector?: string | null
          shift_pattern?: string | null
          specialty_id?: string | null
          staffing_agency_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          care_setting?: string | null
          created_at?: string
          current_hourly_rate?: number | null
          current_monthly_salary?: number | null
          employment_type?: string | null
          experience_years?: number | null
          id?: string
          leadership?: boolean | null
          on_call?: boolean | null
          onboarding_step?: number
          region_id?: string | null
          salary_type?: string | null
          sector?: string | null
          shift_pattern?: string | null
          specialty_id?: string | null
          staffing_agency_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_profiles_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_profiles_staffing_agency_id_fkey"
            columns: ["staffing_agency_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_references: {
        Row: {
          consultant_id: string
          created_at: string
          id: string
          notes: string | null
          reference_email: string | null
          reference_name: string
          reference_org: string | null
          reference_phone: string | null
          reference_role: string | null
          relationship: string | null
        }
        Insert: {
          consultant_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reference_email?: string | null
          reference_name: string
          reference_org?: string | null
          reference_phone?: string | null
          reference_role?: string | null
          relationship?: string | null
        }
        Update: {
          consultant_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reference_email?: string | null
          reference_name?: string
          reference_org?: string | null
          reference_phone?: string | null
          reference_role?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_references_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
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
      followup_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          lead_id: string
          report_id: string | null
          scheduled_for: string
          sent_at: string | null
          sequence_step: number
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          lead_id: string
          report_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          sequence_step?: number
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          lead_id?: string
          report_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          sequence_step?: number
          status?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          assignment_id: string
          consultant_id: string
          created_at: string
          date: string
          hours: number
          id: string
          invoiced_amount: number
          ob_type: string | null
          on_call: boolean | null
          rate: number
        }
        Insert: {
          assignment_id: string
          consultant_id: string
          created_at?: string
          date: string
          hours: number
          id?: string
          invoiced_amount: number
          ob_type?: string | null
          on_call?: boolean | null
          rate: number
        }
        Update: {
          assignment_id?: string
          consultant_id?: string
          created_at?: string
          date?: string
          hours?: number
          id?: string
          invoiced_amount?: number
          ob_type?: string | null
          on_call?: boolean | null
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          ob_share: string | null
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
          ob_share?: string | null
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
          ob_share?: string | null
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
      market_requests: {
        Row: {
          consultant_id: string | null
          created_at: string
          employment_type: string | null
          id: string
          region_id: string | null
          request_type: string | null
          result_json: Json | null
          specialty_id: string | null
        }
        Insert: {
          consultant_id?: string | null
          created_at?: string
          employment_type?: string | null
          id?: string
          region_id?: string | null
          request_type?: string | null
          result_json?: Json | null
          specialty_id?: string | null
        }
        Update: {
          consultant_id?: string | null
          created_at?: string
          employment_type?: string | null
          id?: string
          region_id?: string | null
          request_type?: string | null
          result_json?: Json | null
          specialty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_requests_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_requests_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          accepted: boolean | null
          agency_org_id: string | null
          buyer_org_id: string | null
          consultant_id: string
          contract_length_weeks: number | null
          created_at: string
          hourly_rate: number | null
          housing_included: boolean | null
          id: string
          on_call: boolean | null
          region_id: string | null
          specialty_id: string | null
          travel_included: boolean | null
        }
        Insert: {
          accepted?: boolean | null
          agency_org_id?: string | null
          buyer_org_id?: string | null
          consultant_id: string
          contract_length_weeks?: number | null
          created_at?: string
          hourly_rate?: number | null
          housing_included?: boolean | null
          id?: string
          on_call?: boolean | null
          region_id?: string | null
          specialty_id?: string | null
          travel_included?: boolean | null
        }
        Update: {
          accepted?: boolean | null
          agency_org_id?: string | null
          buyer_org_id?: string | null
          consultant_id?: string
          contract_length_weeks?: number | null
          created_at?: string
          hourly_rate?: number | null
          housing_included?: boolean | null
          id?: string
          on_call?: boolean | null
          region_id?: string | null
          specialty_id?: string | null
          travel_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_agency_org_id_fkey"
            columns: ["agency_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          headquarters_region_id: string | null
          id: string
          name: string
          org_number: string | null
          type: string
        }
        Insert: {
          created_at?: string
          headquarters_region_id?: string | null
          id?: string
          name: string
          org_number?: string | null
          type: string
        }
        Update: {
          created_at?: string
          headquarters_region_id?: string | null
          id?: string
          name?: string
          org_number?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_headquarters_region_id_fkey"
            columns: ["headquarters_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
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
      profiles: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      regions: {
        Row: {
          created_at: string
          id: string
          kommun: string
          lat: number | null
          lng: number | null
          region: string
        }
        Insert: {
          created_at?: string
          id?: string
          kommun: string
          lat?: number | null
          lng?: number | null
          region: string
        }
        Update: {
          created_at?: string
          id?: string
          kommun?: string
          lat?: number | null
          lng?: number | null
          region?: string
        }
        Relationships: []
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
          consultant_profile_id: string | null
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
          user_id: string | null
        }
        Insert: {
          ab_variant?: string
          consultant_profile_id?: string | null
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
          user_id?: string | null
        }
        Update: {
          ab_variant?: string
          consultant_profile_id?: string | null
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_consultant_profile_id_fkey"
            columns: ["consultant_profile_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          avg_req_score: number | null
          avg_total_score: number | null
          contract_price: number | null
          created_at: string | null
          customer: string
          customer_type: string
          deadline: string | null
          filled: boolean
          has_offers: boolean
          inserted_at: string
          is_public: boolean
          level: string | null
          n_offers: number
          n_offers_reported: number | null
          n_unique_suppliers: number | null
          pct_meets_scope: number | null
          price_max: number | null
          price_median: number | null
          price_min: number | null
          price_std: number | null
          region: string | null
          request_id: number
          response_window_days: number | null
          role: string | null
          rubrik_raw: string | null
          specialization: string | null
          unit: string | null
          winning_supplier: string | null
        }
        Insert: {
          avg_req_score?: number | null
          avg_total_score?: number | null
          contract_price?: number | null
          created_at?: string | null
          customer: string
          customer_type: string
          deadline?: string | null
          filled?: boolean
          has_offers?: boolean
          inserted_at?: string
          is_public?: boolean
          level?: string | null
          n_offers?: number
          n_offers_reported?: number | null
          n_unique_suppliers?: number | null
          pct_meets_scope?: number | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          price_std?: number | null
          region?: string | null
          request_id: number
          response_window_days?: number | null
          role?: string | null
          rubrik_raw?: string | null
          specialization?: string | null
          unit?: string | null
          winning_supplier?: string | null
        }
        Update: {
          avg_req_score?: number | null
          avg_total_score?: number | null
          contract_price?: number | null
          created_at?: string | null
          customer?: string
          customer_type?: string
          deadline?: string | null
          filled?: boolean
          has_offers?: boolean
          inserted_at?: string
          is_public?: boolean
          level?: string | null
          n_offers?: number
          n_offers_reported?: number | null
          n_unique_suppliers?: number | null
          pct_meets_scope?: number | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          price_std?: number | null
          region?: string | null
          request_id?: number
          response_window_days?: number | null
          role?: string | null
          rubrik_raw?: string | null
          specialization?: string | null
          unit?: string | null
          winning_supplier?: string | null
        }
        Relationships: []
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
      specialties: {
        Row: {
          category: string
          code: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category: string
          code?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          code?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      uppdrag_notifications: {
        Row: {
          created_at: string
          id: string
          region: string
          roll: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          region: string
          roll: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          region?: string
          roll?: string
          user_id?: string
        }
        Relationships: []
      }
      work_patterns: {
        Row: {
          consultant_id: string
          created_at: string
          hours_per_week: number | null
          id: string
          notes: string | null
          ob_eligible: boolean | null
          pattern_type: string
        }
        Insert: {
          consultant_id: string
          created_at?: string
          hours_per_week?: number | null
          id?: string
          notes?: string | null
          ob_eligible?: boolean | null
          pattern_type: string
        }
        Update: {
          consultant_id?: string
          created_at?: string
          hours_per_week?: number | null
          id?: string
          notes?: string | null
          ob_eligible?: boolean | null
          pattern_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_patterns_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string
          id: string
          name: string
          region_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          region_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
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
