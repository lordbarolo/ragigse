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
      action_items: {
        Row: {
          created_at: string | null
          id: string
          priority: number | null
          profile_id: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          priority?: number | null
          profile_id: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          priority?: number | null
          profile_id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
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
      bug_reports: {
        Row: {
          category: string
          created_at: string
          description: string
          email: string | null
          id: string
          page_url: string
          status: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          email?: string | null
          id?: string
          page_url: string
          status?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          email?: string | null
          id?: string
          page_url?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
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
      calloff_imports: {
        Row: {
          calloff_date: string | null
          customer: string | null
          customer_type: string | null
          duration_weeks: number | null
          filled: boolean | null
          id: string
          imported_at: string
          level: string | null
          price_max: number | null
          price_median: number | null
          price_min: number | null
          raw_data: Json | null
          region: string | null
          role: string | null
          source: string | null
          specialization: string | null
          unit: string | null
        }
        Insert: {
          calloff_date?: string | null
          customer?: string | null
          customer_type?: string | null
          duration_weeks?: number | null
          filled?: boolean | null
          id?: string
          imported_at?: string
          level?: string | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          raw_data?: Json | null
          region?: string | null
          role?: string | null
          source?: string | null
          specialization?: string | null
          unit?: string | null
        }
        Update: {
          calloff_date?: string | null
          customer?: string | null
          customer_type?: string | null
          duration_weeks?: number | null
          filled?: boolean | null
          id?: string
          imported_at?: string
          level?: string | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          raw_data?: Json | null
          region?: string | null
          role?: string | null
          source?: string | null
          specialization?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      capability_definitions: {
        Row: {
          agent_label: string | null
          capability_key: string
          created_at: string
          description: string | null
          human_label: string | null
          id: string
          input_schema_json: Json | null
          is_active: boolean
          name: string
          output_schema_json: Json | null
          version: number
        }
        Insert: {
          agent_label?: string | null
          capability_key: string
          created_at?: string
          description?: string | null
          human_label?: string | null
          id?: string
          input_schema_json?: Json | null
          is_active?: boolean
          name: string
          output_schema_json?: Json | null
          version?: number
        }
        Update: {
          agent_label?: string | null
          capability_key?: string
          created_at?: string
          description?: string | null
          human_label?: string | null
          id?: string
          input_schema_json?: Json | null
          is_active?: boolean
          name?: string
          output_schema_json?: Json | null
          version?: number
        }
        Relationships: []
      }
      chat_answer_reports: {
        Row: {
          context_json: Json | null
          created_at: string
          id: string
          message_content: string
          page_url: string | null
          status: string
          user_email: string | null
        }
        Insert: {
          context_json?: Json | null
          created_at?: string
          id?: string
          message_content: string
          page_url?: string | null
          status?: string
          user_email?: string | null
        }
        Update: {
          context_json?: Json | null
          created_at?: string
          id?: string
          message_content?: string
          page_url?: string | null
          status?: string
          user_email?: string | null
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          allowed_capabilities: Json
          client_type: string
          created_at: string
          id: string
          max_entities_per_query: number
          policy_rules: Json
          profile_key: string
          rate_limit_per_day: number
          rate_limit_per_minute: number
        }
        Insert: {
          allowed_capabilities?: Json
          client_type: string
          created_at?: string
          id?: string
          max_entities_per_query?: number
          policy_rules?: Json
          profile_key: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
        }
        Update: {
          allowed_capabilities?: Json
          client_type?: string
          created_at?: string
          id?: string
          max_entities_per_query?: number
          policy_rules?: Json
          profile_key?: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
        }
        Relationships: []
      }
      compensation_queries: {
        Row: {
          capability_key: string
          capability_version: number
          channel: string | null
          client_ip: string | null
          client_type: string | null
          confidence_score: number | null
          created_at: string
          id: string
          normalized_input_json: Json | null
          policy_result_json: Json | null
          raw_input_text: string | null
          resolution_method: string | null
          resolved_entities_json: Json | null
          response_payload_json: Json | null
        }
        Insert: {
          capability_key: string
          capability_version?: number
          channel?: string | null
          client_ip?: string | null
          client_type?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          normalized_input_json?: Json | null
          policy_result_json?: Json | null
          raw_input_text?: string | null
          resolution_method?: string | null
          resolved_entities_json?: Json | null
          response_payload_json?: Json | null
        }
        Update: {
          capability_key?: string
          capability_version?: number
          channel?: string | null
          client_ip?: string | null
          client_type?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          normalized_input_json?: Json | null
          policy_result_json?: Json | null
          raw_input_text?: string | null
          resolution_method?: string | null
          resolved_entities_json?: Json | null
          response_payload_json?: Json | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      geographies: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["geography_type"]
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["geography_type"]
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["geography_type"]
        }
        Relationships: [
          {
            foreignKeyName: "geographies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "geographies"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_aliases: {
        Row: {
          alias: string
          created_at: string
          geo_id: string
          id: string
          language: string
          source: string | null
        }
        Insert: {
          alias: string
          created_at?: string
          geo_id: string
          id?: string
          language?: string
          source?: string | null
        }
        Update: {
          alias?: string
          created_at?: string
          geo_id?: string
          id?: string
          language?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geography_aliases_geo_id_fkey"
            columns: ["geo_id"]
            isOneToOne: false
            referencedRelation: "geographies"
            referencedColumns: ["id"]
          },
        ]
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
      invoice_submissions: {
        Row: {
          created_at: string
          email: string
          file_paths: string[]
          id: string
          message: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          file_paths?: string[]
          id?: string
          message?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          file_paths?: string[]
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          current_salary: number | null
          email: string | null
          employment_type: string
          experience: number | null
          external_id: string | null
          id: string
          kommun: string | null
          ob_share: string | null
          paid: boolean
          salary_type: string | null
          source: string | null
          updated_at: string
          yrke: string | null
        }
        Insert: {
          created_at?: string
          current_salary?: number | null
          email?: string | null
          employment_type: string
          experience?: number | null
          external_id?: string | null
          id?: string
          kommun?: string | null
          ob_share?: string | null
          paid?: boolean
          salary_type?: string | null
          source?: string | null
          updated_at?: string
          yrke?: string | null
        }
        Update: {
          created_at?: string
          current_salary?: number | null
          email?: string | null
          employment_type?: string
          experience?: number | null
          external_id?: string | null
          id?: string
          kommun?: string | null
          ob_share?: string | null
          paid?: boolean
          salary_type?: string | null
          source?: string | null
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
      org_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_membership_requests: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_membership_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      price_nuggets: {
        Row: {
          category: string
          change_type: string
          created_at: string
          description: string
          effective_from: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          priority: number
          title: string
        }
        Insert: {
          category: string
          change_type?: string
          created_at?: string
          description: string
          effective_from?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          priority?: number
          title: string
        }
        Update: {
          category?: string
          change_type?: string
          created_at?: string
          description?: string
          effective_from?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          priority?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          has_bankid: boolean | null
          has_required_references: boolean | null
          has_valid_hosp: boolean | null
          has_valid_ivo: boolean | null
          id: string
          profile_status: string | null
          status_updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          has_bankid?: boolean | null
          has_required_references?: boolean | null
          has_valid_hosp?: boolean | null
          has_valid_ivo?: boolean | null
          id?: string
          profile_status?: string | null
          status_updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          has_bankid?: boolean | null
          has_required_references?: boolean | null
          has_valid_hosp?: boolean | null
          has_valid_ivo?: boolean | null
          id?: string
          profile_status?: string | null
          status_updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      radar_notifications: {
        Row: {
          created_at: string
          id: string
          months_before: number
          scheduled_for: string
          sent_at: string | null
          status: string
          watchlist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          months_before: number
          scheduled_for: string
          sent_at?: string | null
          status?: string
          watchlist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          months_before?: number
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_notifications_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "radar_watchlist"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_watchlist: {
        Row: {
          buyer: string
          competence: string
          created_at: string
          id: string
          location: string
          predicted_date: string | null
          user_id: string
        }
        Insert: {
          buyer: string
          competence: string
          created_at?: string
          id?: string
          location: string
          predicted_date?: string | null
          user_id: string
        }
        Update: {
          buyer?: string
          competence?: string
          created_at?: string
          id?: string
          location?: string
          predicted_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          client_ip: string
          created_at: string
          endpoint: string
          id: string
        }
        Insert: {
          client_ip: string
          created_at?: string
          endpoint: string
          id?: string
        }
        Update: {
          client_ip?: string
          created_at?: string
          endpoint?: string
          id?: string
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
      ref_access_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          resource_id: string
          resource_type: string
          viewer_name: string | null
          viewer_org: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id: string
          resource_type: string
          viewer_name?: string | null
          viewer_org?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id?: string
          resource_type?: string
          viewer_name?: string | null
          viewer_org?: string | null
        }
        Relationships: []
      }
      ref_application_references: {
        Row: {
          application_id: string
          attached_by_user_id: string
          created_at: string
          id: string
          reference_id: string
        }
        Insert: {
          application_id: string
          attached_by_user_id: string
          created_at?: string
          id?: string
          reference_id: string
        }
        Update: {
          application_id?: string
          attached_by_user_id?: string
          created_at?: string
          id?: string
          reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_application_references_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_application_references_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_pings: {
        Row: {
          confirmed_until: string | null
          created_at: string
          expires_at: string
          id: string
          reference_id: string
          requested_by: string
          requester_name: string
          responded_at: string | null
          response_token: string
          sent_at: string
          status: Database["public"]["Enums"]["ref_ping_status"]
        }
        Insert: {
          confirmed_until?: string | null
          created_at?: string
          expires_at: string
          id?: string
          reference_id: string
          requested_by: string
          requester_name: string
          responded_at?: string | null
          response_token: string
          sent_at?: string
          status?: Database["public"]["Enums"]["ref_ping_status"]
        }
        Update: {
          confirmed_until?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          reference_id?: string
          requested_by?: string
          requester_name?: string
          responded_at?: string | null
          response_token?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["ref_ping_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ref_pings_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_pings_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_pings_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_profile_views: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          referrer: string | null
          viewer_fingerprint: string | null
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          referrer?: string | null
          viewer_fingerprint?: string | null
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          referrer?: string | null
          viewer_fingerprint?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_profiles: {
        Row: {
          bankid_verified: boolean
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          license_number: string | null
          linkedin_url: string | null
          phone: string | null
          profile_status: string | null
          role_type: string | null
          score_breakdown: Json | null
          score_updated_at: string | null
          specialty: string | null
          status_checklist: Json | null
          status_updated_at: string | null
          trust_score: number | null
          trust_tier: string | null
          updated_at: string
          years_licensed: number | null
        }
        Insert: {
          bankid_verified?: boolean
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          license_number?: string | null
          linkedin_url?: string | null
          phone?: string | null
          profile_status?: string | null
          role_type?: string | null
          score_breakdown?: Json | null
          score_updated_at?: string | null
          specialty?: string | null
          status_checklist?: Json | null
          status_updated_at?: string | null
          trust_score?: number | null
          trust_tier?: string | null
          updated_at?: string
          years_licensed?: number | null
        }
        Update: {
          bankid_verified?: boolean
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          license_number?: string | null
          linkedin_url?: string | null
          phone?: string | null
          profile_status?: string | null
          role_type?: string | null
          score_breakdown?: Json | null
          score_updated_at?: string | null
          specialty?: string | null
          status_checklist?: Json | null
          status_updated_at?: string | null
          trust_score?: number | null
          trust_tier?: string | null
          updated_at?: string
          years_licensed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_profiles_role_type_fkey"
            columns: ["role_type"]
            isOneToOne: false
            referencedRelation: "ref_role_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_reference_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          document_sha256: string | null
          expires_at: string | null
          id: string
          reference_id: string
          status: string
          token_hash: string | null
        }
        Insert: {
          artifact_type?: string
          created_at?: string
          document_sha256?: string | null
          expires_at?: string | null
          id?: string
          reference_id: string
          status?: string
          token_hash?: string | null
        }
        Update: {
          artifact_type?: string
          created_at?: string
          document_sha256?: string | null
          expires_at?: string | null
          id?: string
          reference_id?: string
          status?: string
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_reference_artifacts_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_reference_artifacts_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_reference_verifications: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          reference_id: string
          status: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          reference_id: string
          status?: string
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          reference_id?: string
          status?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_reference_verifications_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_reference_verifications_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_references: {
        Row: {
          attachable: boolean
          bankid_signature_id: string | null
          competencies: Json | null
          confirmed_at: string | null
          created_at: string
          document_name: string | null
          document_url: string | null
          expires_at: string | null
          giver_email: string
          giver_id: string | null
          giver_name: string | null
          id: string
          individual_id: string
          invite_token: string
          is_verification_only: boolean
          last_confirmed_at: string | null
          period_end: string | null
          period_start: string
          recommendation_score: number | null
          reference_text: string | null
          relationship: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["ref_reference_status"]
          verification_level: string
          verified_at: string | null
          workplace: string
        }
        Insert: {
          attachable?: boolean
          bankid_signature_id?: string | null
          competencies?: Json | null
          confirmed_at?: string | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          expires_at?: string | null
          giver_email: string
          giver_id?: string | null
          giver_name?: string | null
          id?: string
          individual_id: string
          invite_token: string
          is_verification_only?: boolean
          last_confirmed_at?: string | null
          period_end?: string | null
          period_start: string
          recommendation_score?: number | null
          reference_text?: string | null
          relationship: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["ref_reference_status"]
          verification_level?: string
          verified_at?: string | null
          workplace: string
        }
        Update: {
          attachable?: boolean
          bankid_signature_id?: string | null
          competencies?: Json | null
          confirmed_at?: string | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          expires_at?: string | null
          giver_email?: string
          giver_id?: string | null
          giver_name?: string | null
          id?: string
          individual_id?: string
          invite_token?: string
          is_verification_only?: boolean
          last_confirmed_at?: string | null
          period_end?: string | null
          period_start?: string
          recommendation_score?: number | null
          reference_text?: string | null
          relationship?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["ref_reference_status"]
          verification_level?: string
          verified_at?: string | null
          workplace?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_references_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_references_individual_id_fkey"
            columns: ["individual_id"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_representation_requests: {
        Row: {
          agency_id: string
          agency_name: string
          assignment_id: string
          bankid_ref: string | null
          consultant_email: string
          consultant_user_id: string | null
          created_at: string
          id: string
          organization_id: string | null
          payload: Json | null
          region: string
          secret_token: string
          signed_at: string | null
          status: Database["public"]["Enums"]["ref_representation_status"]
          verification_id: string | null
        }
        Insert: {
          agency_id: string
          agency_name?: string
          assignment_id: string
          bankid_ref?: string | null
          consultant_email: string
          consultant_user_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          region: string
          secret_token?: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["ref_representation_status"]
          verification_id?: string | null
        }
        Update: {
          agency_id?: string
          agency_name?: string
          assignment_id?: string
          bankid_ref?: string | null
          consultant_email?: string
          consultant_user_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          region?: string
          secret_token?: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["ref_representation_status"]
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_representation_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_role_profiles: {
        Row: {
          decay_end_months: number
          decay_rate_per_month: number
          description: string | null
          gold_months: number
          id: string
          label: string
          short_label: string
          warn_months: number | null
        }
        Insert: {
          decay_end_months: number
          decay_rate_per_month?: number
          description?: string | null
          gold_months: number
          id: string
          label: string
          short_label: string
          warn_months?: number | null
        }
        Update: {
          decay_end_months?: number
          decay_rate_per_month?: number
          description?: string | null
          gold_months?: number
          id?: string
          label?: string
          short_label?: string
          warn_months?: number | null
        }
        Relationships: []
      }
      ref_user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["ref_app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["ref_app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["ref_app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ref_verification_comments: {
        Row: {
          author_id: string
          author_name: string
          comment: string
          created_at: string
          id: string
          reference_id: string
        }
        Insert: {
          author_id: string
          author_name?: string
          comment: string
          created_at?: string
          id?: string
          reference_id: string
        }
        Update: {
          author_id?: string
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_verification_comments_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_verification_comments_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_verifications: {
        Row: {
          checked_at: string
          created_at: string | null
          id: string
          notes: string | null
          profile_id: string
          result: string
          type: string
          valid_until: string
        }
        Insert: {
          checked_at?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          result: string
          type: string
          valid_until?: string
        }
        Update: {
          checked_at?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          result?: string
          type?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_verified_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          org_name: string
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          org_name: string
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          org_name?: string
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
      role_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          language: string
          role_id: string
          source: string | null
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          language?: string
          role_id: string
          source?: string | null
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          language?: string
          role_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_aliases_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          parent_role_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          parent_role_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_parent_role_id_fkey"
            columns: ["parent_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_benchmarks: {
        Row: {
          created_at: string
          id: string
          mean_salary: number | null
          median_salary: number | null
          municipality_id: string | null
          p25_salary: number | null
          p75_salary: number | null
          period_key: string
          region_id: string | null
          role_id: string
          sample_size: number
          threshold_passed: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mean_salary?: number | null
          median_salary?: number | null
          municipality_id?: string | null
          p25_salary?: number | null
          p75_salary?: number | null
          period_key: string
          region_id?: string | null
          role_id: string
          sample_size?: number
          threshold_passed?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mean_salary?: number | null
          median_salary?: number | null
          municipality_id?: string | null
          p25_salary?: number | null
          p75_salary?: number | null
          period_key?: string
          region_id?: string | null
          role_id?: string
          sample_size?: number
          threshold_passed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_benchmarks_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "geographies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_benchmarks_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "geographies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_benchmarks_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_benchmarks_legacy: {
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      ref_pings_safe: {
        Row: {
          confirmed_until: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          reference_id: string | null
          requested_by: string | null
          requester_name: string | null
          responded_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["ref_ping_status"] | null
        }
        Insert: {
          confirmed_until?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          reference_id?: string | null
          requested_by?: string | null
          requester_name?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["ref_ping_status"] | null
        }
        Update: {
          confirmed_until?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          reference_id?: string | null
          requested_by?: string | null
          requester_name?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["ref_ping_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_pings_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_pings_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "ref_references_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_pings_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_references_safe: {
        Row: {
          attachable: boolean | null
          bankid_signature_id: string | null
          competencies: Json | null
          confirmed_at: string | null
          created_at: string | null
          document_name: string | null
          document_url: string | null
          expires_at: string | null
          giver_id: string | null
          giver_name: string | null
          id: string | null
          individual_id: string | null
          is_verification_only: boolean | null
          last_confirmed_at: string | null
          period_end: string | null
          period_start: string | null
          recommendation_score: number | null
          reference_text: string | null
          relationship: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["ref_reference_status"] | null
          verification_level: string | null
          verified_at: string | null
          workplace: string | null
        }
        Insert: {
          attachable?: boolean | null
          bankid_signature_id?: string | null
          competencies?: Json | null
          confirmed_at?: string | null
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          expires_at?: string | null
          giver_id?: string | null
          giver_name?: string | null
          id?: string | null
          individual_id?: string | null
          is_verification_only?: boolean | null
          last_confirmed_at?: string | null
          period_end?: string | null
          period_start?: string | null
          recommendation_score?: number | null
          reference_text?: string | null
          relationship?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["ref_reference_status"] | null
          verification_level?: string | null
          verified_at?: string | null
          workplace?: string | null
        }
        Update: {
          attachable?: boolean | null
          bankid_signature_id?: string | null
          competencies?: Json | null
          confirmed_at?: string | null
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          expires_at?: string | null
          giver_id?: string | null
          giver_name?: string | null
          id?: string | null
          individual_id?: string | null
          is_verification_only?: boolean | null
          last_confirmed_at?: string | null
          period_end?: string | null
          period_start?: string | null
          recommendation_score?: number | null
          reference_text?: string | null
          relationship?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["ref_reference_status"] | null
          verification_level?: string | null
          verified_at?: string | null
          workplace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_references_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_references_individual_id_fkey"
            columns: ["individual_id"]
            isOneToOne: false
            referencedRelation: "ref_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_representation_requests_safe: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          assignment_id: string | null
          bankid_ref: string | null
          consultant_email: string | null
          consultant_user_id: string | null
          created_at: string | null
          id: string | null
          organization_id: string | null
          payload: Json | null
          region: string | null
          signed_at: string | null
          status:
            | Database["public"]["Enums"]["ref_representation_status"]
            | null
          verification_id: string | null
        }
        Insert: {
          agency_id?: string | null
          agency_name?: string | null
          assignment_id?: string | null
          bankid_ref?: string | null
          consultant_email?: string | null
          consultant_user_id?: string | null
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          payload?: Json | null
          region?: string | null
          signed_at?: string | null
          status?:
            | Database["public"]["Enums"]["ref_representation_status"]
            | null
          verification_id?: string | null
        }
        Update: {
          agency_id?: string | null
          agency_name?: string | null
          assignment_id?: string | null
          bankid_ref?: string | null
          consultant_email?: string | null
          consultant_user_id?: string | null
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          payload?: Json | null
          region?: string | null
          signed_at?: string | null
          status?:
            | Database["public"]["Enums"]["ref_representation_status"]
            | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_representation_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_referral_by_token: {
        Args: { _token: string }
        Returns: {
          clicked: boolean
          created_at: string
          id: string
          lead_id: string
          referee_email: string
          referrer_email: string
          token: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      ref_calculate_profile_status: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      ref_calculate_trust_score: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      ref_create_ping: {
        Args: { _reference_id: string; _requester_name: string }
        Returns: string
      }
      ref_get_ping_by_token: {
        Args: { _token: string }
        Returns: {
          competencies: Json
          confirmed_at: string
          expires_at: string
          id: string
          individual_name: string
          individual_specialty: string
          period_end: string
          period_start: string
          recommendation_score: number
          reference_id: string
          reference_text: string
          relationship: string
          requester_name: string
          responded_at: string
          response_token: string
          sent_at: string
          status: Database["public"]["Enums"]["ref_ping_status"]
          workplace: string
        }[]
      }
      ref_get_public_profile: { Args: { _profile_id: string }; Returns: Json }
      ref_get_reference_by_invite_token: {
        Args: { _token: string }
        Returns: {
          competencies: Json
          confirmed_at: string
          created_at: string
          document_name: string
          document_url: string
          giver_email: string
          giver_id: string
          giver_name: string
          id: string
          individual_id: string
          individual_name: string
          individual_specialty: string
          invite_token: string
          is_verification_only: boolean
          period_end: string
          period_start: string
          recommendation_score: number
          reference_text: string
          relationship: string
          status: Database["public"]["Enums"]["ref_reference_status"]
          workplace: string
        }[]
      }
      ref_get_user_org_id: { Args: { _user_id: string }; Returns: string }
      ref_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["ref_app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ref_log_profile_view: {
        Args: { _fingerprint?: string; _profile_id: string; _referrer?: string }
        Returns: undefined
      }
      ref_refresh_attachability: {
        Args: { p_reference_id: string }
        Returns: undefined
      }
      ref_respond_to_ping: {
        Args: {
          _status: Database["public"]["Enums"]["ref_ping_status"]
          _token: string
        }
        Returns: undefined
      }
      ref_submit_reference: {
        Args: {
          _competencies: Json
          _giver_id: string
          _giver_name: string
          _recommendation_score: number
          _reference_text: string
          _token: string
        }
        Returns: undefined
      }
      ref_verify_imported_reference: {
        Args: {
          _comment?: string
          _giver_id: string
          _giver_name: string
          _token: string
        }
        Returns: undefined
      }
      top_kommuner: {
        Args: { lim?: number }
        Returns: {
          cnt: number
          kommun: string
        }[]
      }
    }
    Enums: {
      geography_type: "nation" | "region" | "zone" | "municipality"
      ref_app_role: "individual" | "reference_giver" | "client" | "admin"
      ref_ping_status: "sent" | "confirmed" | "denied" | "expired" | "dismissed"
      ref_reference_status: "pending" | "active" | "revoked" | "expired"
      ref_representation_status: "pending" | "signed" | "declined" | "expired"
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
    Enums: {
      geography_type: ["nation", "region", "zone", "municipality"],
      ref_app_role: ["individual", "reference_giver", "client", "admin"],
      ref_ping_status: ["sent", "confirmed", "denied", "expired", "dismissed"],
      ref_reference_status: ["pending", "active", "revoked", "expired"],
      ref_representation_status: ["pending", "signed", "declined", "expired"],
    },
  },
} as const
