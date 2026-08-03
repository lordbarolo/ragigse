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
      agent_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          notes: string | null
          rate_limit_daily: number
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          notes?: string | null
          rate_limit_daily?: number
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          notes?: string | null
          rate_limit_daily?: number
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: []
      }
      agent_api_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip: string | null
          latency_ms: number | null
          method: string
          params: Json | null
          response_size_bytes: number | null
          status_code: number
          user_agent: string | null
          user_token_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip?: string | null
          latency_ms?: number | null
          method?: string
          params?: Json | null
          response_size_bytes?: number | null
          status_code: number
          user_agent?: string | null
          user_token_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip?: string | null
          latency_ms?: number | null
          method?: string
          params?: Json | null
          response_size_bytes?: number | null
          status_code?: number
          user_agent?: string | null
          user_token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "agent_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_api_logs_user_token_id_fkey"
            columns: ["user_token_id"]
            isOneToOne: false
            referencedRelation: "agent_user_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_user_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          label: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          cost_sek: number
          cost_usd: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          feature: string
          id: string
          input_tokens: number
          metadata: Json | null
          model: string
          output_tokens: number
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          cost_sek?: number
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model: string
          output_tokens?: number
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          cost_sek?: number
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string
          output_tokens?: number
          status?: string
          total_tokens?: number | null
          user_id?: string | null
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
      analytics_event_rejections: {
        Row: {
          client_ip: string | null
          created_at: string
          event_name: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          origin: string | null
          reason: string
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          client_ip?: string | null
          created_at?: string
          event_name?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          origin?: string | null
          reason: string
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          client_ip?: string | null
          created_at?: string
          event_name?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          origin?: string | null
          reason?: string
          referer?: string | null
          user_agent?: string | null
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
          visitor_day_hash: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          visitor_day_hash?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          visitor_day_hash?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      assignment_feedback: {
        Row: {
          created_at: string
          deviation_notes: string | null
          dismissed_count: number
          feedback_stage: string
          id: string
          invoice_service_interest: boolean | null
          matched_contract: boolean | null
          representation_request_id: string
          responded_at: string | null
          snoozed_until: string | null
          updated_at: string
          user_id: string
          was_booked: boolean | null
        }
        Insert: {
          created_at?: string
          deviation_notes?: string | null
          dismissed_count?: number
          feedback_stage: string
          id?: string
          invoice_service_interest?: boolean | null
          matched_contract?: boolean | null
          representation_request_id: string
          responded_at?: string | null
          snoozed_until?: string | null
          updated_at?: string
          user_id: string
          was_booked?: boolean | null
        }
        Update: {
          created_at?: string
          deviation_notes?: string | null
          dismissed_count?: number
          feedback_stage?: string
          id?: string
          invoice_service_interest?: boolean | null
          matched_contract?: boolean | null
          representation_request_id?: string
          responded_at?: string | null
          snoozed_until?: string | null
          updated_at?: string
          user_id?: string
          was_booked?: boolean | null
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
      avrop_intelligence: {
        Row: {
          agency_id: string | null
          agency_org_id: string | null
          assignment_id: string | null
          avrop_received_at: string | null
          awarded_at: string | null
          buyer_name: string | null
          competence: string | null
          consultant_email: string | null
          consultant_name: string | null
          created_at: string
          customer_type: string | null
          duration_weeks: number | null
          extra_fields: Json | null
          extraction_confidence: Json | null
          extraction_latency_ms: number | null
          extraction_model: string | null
          hours_per_week: number | null
          housing_included: boolean | null
          id: string
          input_type: string | null
          ob_required: boolean | null
          on_call_required: boolean | null
          period_end: string | null
          period_start: string | null
          pii_redacted_at: string | null
          price_max: number | null
          price_min: number | null
          price_type: string | null
          price_unit: string | null
          raw_image_path: string | null
          raw_text: string | null
          region: string | null
          representation_request_id: string | null
          requirements: Json | null
          response_deadline: string | null
          shifts_count: number | null
          source: string | null
          travel_included: boolean | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          agency_org_id?: string | null
          assignment_id?: string | null
          avrop_received_at?: string | null
          awarded_at?: string | null
          buyer_name?: string | null
          competence?: string | null
          consultant_email?: string | null
          consultant_name?: string | null
          created_at?: string
          customer_type?: string | null
          duration_weeks?: number | null
          extra_fields?: Json | null
          extraction_confidence?: Json | null
          extraction_latency_ms?: number | null
          extraction_model?: string | null
          hours_per_week?: number | null
          housing_included?: boolean | null
          id?: string
          input_type?: string | null
          ob_required?: boolean | null
          on_call_required?: boolean | null
          period_end?: string | null
          period_start?: string | null
          pii_redacted_at?: string | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string | null
          price_unit?: string | null
          raw_image_path?: string | null
          raw_text?: string | null
          region?: string | null
          representation_request_id?: string | null
          requirements?: Json | null
          response_deadline?: string | null
          shifts_count?: number | null
          source?: string | null
          travel_included?: boolean | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          agency_org_id?: string | null
          assignment_id?: string | null
          avrop_received_at?: string | null
          awarded_at?: string | null
          buyer_name?: string | null
          competence?: string | null
          consultant_email?: string | null
          consultant_name?: string | null
          created_at?: string
          customer_type?: string | null
          duration_weeks?: number | null
          extra_fields?: Json | null
          extraction_confidence?: Json | null
          extraction_latency_ms?: number | null
          extraction_model?: string | null
          hours_per_week?: number | null
          housing_included?: boolean | null
          id?: string
          input_type?: string | null
          ob_required?: boolean | null
          on_call_required?: boolean | null
          period_end?: string | null
          period_start?: string | null
          pii_redacted_at?: string | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string | null
          price_unit?: string | null
          raw_image_path?: string | null
          raw_text?: string | null
          region?: string | null
          representation_request_id?: string | null
          requirements?: Json | null
          response_deadline?: string | null
          shifts_count?: number | null
          source?: string | null
          travel_included?: boolean | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avrop_intelligence_agency_org_id_fkey"
            columns: ["agency_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          dedup_hash: string | null
          duration_weeks: number | null
          filled: boolean | null
          id: string
          imported_at: string
          level: string | null
          partner_share_data: boolean
          partner_source: string | null
          price_max: number | null
          price_median: number | null
          price_min: number | null
          raw_data: Json | null
          region: string | null
          role: string | null
          source: string | null
          specialization: string | null
          unit: string | null
          validation_flags: Json | null
        }
        Insert: {
          calloff_date?: string | null
          customer?: string | null
          customer_type?: string | null
          dedup_hash?: string | null
          duration_weeks?: number | null
          filled?: boolean | null
          id?: string
          imported_at?: string
          level?: string | null
          partner_share_data?: boolean
          partner_source?: string | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          raw_data?: Json | null
          region?: string | null
          role?: string | null
          source?: string | null
          specialization?: string | null
          unit?: string | null
          validation_flags?: Json | null
        }
        Update: {
          calloff_date?: string | null
          customer?: string | null
          customer_type?: string | null
          dedup_hash?: string | null
          duration_weeks?: number | null
          filled?: boolean | null
          id?: string
          imported_at?: string
          level?: string | null
          partner_share_data?: boolean
          partner_source?: string | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          raw_data?: Json | null
          region?: string | null
          role?: string | null
          source?: string | null
          specialization?: string | null
          unit?: string | null
          validation_flags?: Json | null
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
      constants_verification_baseline: {
        Row: {
          created_at: string
          expected_value: Json
          id: string
          key: string
          source_note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_value: Json
          id?: string
          key: string
          source_note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_value?: Json
          id?: string
          key?: string
          source_note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      constants_verification_runs: {
        Row: {
          diff_json: Json | null
          error_message: string | null
          id: string
          mismatch_count: number
          run_at: string
          status: string
          total_keys: number
        }
        Insert: {
          diff_json?: Json | null
          error_message?: string | null
          id?: string
          mismatch_count?: number
          run_at?: string
          status: string
          total_keys?: number
        }
        Update: {
          diff_json?: Json | null
          error_message?: string | null
          id?: string
          mismatch_count?: number
          run_at?: string
          status?: string
          total_keys?: number
        }
        Relationships: []
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
      customer_intelligence: {
        Row: {
          customer: string
          generated_at: string
          history_months: number | null
          id: string
          last_calloff_date: string | null
          profession: string | null
          region: string | null
          seasonal_lows: Json | null
          seasonal_peaks: Json | null
          trend_label: string | null
          trend_ratio: number | null
          vol_2023: number | null
          vol_2024: number | null
          vol_2025: number | null
          vol_2026_ytd: number | null
          yoy_ratio: number | null
          ytd_ratio: number | null
        }
        Insert: {
          customer: string
          generated_at?: string
          history_months?: number | null
          id?: string
          last_calloff_date?: string | null
          profession?: string | null
          region?: string | null
          seasonal_lows?: Json | null
          seasonal_peaks?: Json | null
          trend_label?: string | null
          trend_ratio?: number | null
          vol_2023?: number | null
          vol_2024?: number | null
          vol_2025?: number | null
          vol_2026_ytd?: number | null
          yoy_ratio?: number | null
          ytd_ratio?: number | null
        }
        Update: {
          customer?: string
          generated_at?: string
          history_months?: number | null
          id?: string
          last_calloff_date?: string | null
          profession?: string | null
          region?: string | null
          seasonal_lows?: Json | null
          seasonal_peaks?: Json | null
          trend_label?: string | null
          trend_ratio?: number | null
          vol_2023?: number | null
          vol_2024?: number | null
          vol_2025?: number | null
          vol_2026_ytd?: number | null
          yoy_ratio?: number | null
          ytd_ratio?: number | null
        }
        Relationships: []
      }
      edge_function_errors: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string
          function_name: string
          id: string
          request_id: string | null
          stack: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message: string
          function_name: string
          id?: string
          request_id?: string | null
          stack?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string
          function_name?: string
          id?: string
          request_id?: string | null
          stack?: string | null
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
      invoice_reviews: {
        Row: {
          admin_notes: string | null
          avvikelser: Json | null
          confirmed_at: string | null
          confirmed_tidrapport: Json | null
          created_at: string
          differens: number | null
          error_message: string | null
          extracted_faktura: Json | null
          extracted_tidrapport: Json | null
          extraction_confidence: Json | null
          extraction_model: string | null
          faktura_data: Json | null
          faktura_path: string | null
          fakturerad_summa: number | null
          forvantad_summa: number | null
          grundpris: number | null
          har_avvikelse: boolean
          id: string
          is_handwritten: boolean
          konsult_godkand: boolean
          kontrakt_data: Json | null
          kontrakt_path: string | null
          manual_tidrapport: Json | null
          notis_skickad: boolean
          phone: string | null
          reviewed_at: string | null
          status: string
          terms_accepted_at: string | null
          tidrapport_data: Json | null
          tidrapport_path: string | null
          user_id: string
          user_rates: Json | null
          yrkeskategori: string | null
        }
        Insert: {
          admin_notes?: string | null
          avvikelser?: Json | null
          confirmed_at?: string | null
          confirmed_tidrapport?: Json | null
          created_at?: string
          differens?: number | null
          error_message?: string | null
          extracted_faktura?: Json | null
          extracted_tidrapport?: Json | null
          extraction_confidence?: Json | null
          extraction_model?: string | null
          faktura_data?: Json | null
          faktura_path?: string | null
          fakturerad_summa?: number | null
          forvantad_summa?: number | null
          grundpris?: number | null
          har_avvikelse?: boolean
          id?: string
          is_handwritten?: boolean
          konsult_godkand?: boolean
          kontrakt_data?: Json | null
          kontrakt_path?: string | null
          manual_tidrapport?: Json | null
          notis_skickad?: boolean
          phone?: string | null
          reviewed_at?: string | null
          status?: string
          terms_accepted_at?: string | null
          tidrapport_data?: Json | null
          tidrapport_path?: string | null
          user_id: string
          user_rates?: Json | null
          yrkeskategori?: string | null
        }
        Update: {
          admin_notes?: string | null
          avvikelser?: Json | null
          confirmed_at?: string | null
          confirmed_tidrapport?: Json | null
          created_at?: string
          differens?: number | null
          error_message?: string | null
          extracted_faktura?: Json | null
          extracted_tidrapport?: Json | null
          extraction_confidence?: Json | null
          extraction_model?: string | null
          faktura_data?: Json | null
          faktura_path?: string | null
          fakturerad_summa?: number | null
          forvantad_summa?: number | null
          grundpris?: number | null
          har_avvikelse?: boolean
          id?: string
          is_handwritten?: boolean
          konsult_godkand?: boolean
          kontrakt_data?: Json | null
          kontrakt_path?: string | null
          manual_tidrapport?: Json | null
          notis_skickad?: boolean
          phone?: string | null
          reviewed_at?: string | null
          status?: string
          terms_accepted_at?: string | null
          tidrapport_data?: Json | null
          tidrapport_path?: string | null
          user_id?: string
          user_rates?: Json | null
          yrkeskategori?: string | null
        }
        Relationships: []
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
      lonekoll_avtal_chunks: {
        Row: {
          content: string
          created_at: string
          embedding: string
          id: string
          metadata: Json
          section: string | null
          source_doc: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding: string
          id?: string
          metadata?: Json
          section?: string | null
          source_doc: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          metadata?: Json
          section?: string | null
          source_doc?: string
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
      pipeline_health_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          rows_processed: number | null
          sanity_checks: Json | null
          status: string
          task_name: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          rows_processed?: number | null
          sanity_checks?: Json | null
          status: string
          task_name: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          rows_processed?: number | null
          sanity_checks?: Json | null
          status?: string
          task_name?: string
        }
        Relationships: []
      }
      prediction_backtests: {
        Row: {
          abs_error: number
          actual_calloffs: number
          confidence: string | null
          customer: string
          drift_ratio: number | null
          evaluated_at: string
          expected_calloffs: number
          forecast_run_id: string
          id: string
          is_drift_alert: boolean
          month: string
          profession: string | null
          region: string | null
          specialization: string | null
        }
        Insert: {
          abs_error: number
          actual_calloffs: number
          confidence?: string | null
          customer: string
          drift_ratio?: number | null
          evaluated_at?: string
          expected_calloffs: number
          forecast_run_id: string
          id?: string
          is_drift_alert?: boolean
          month: string
          profession?: string | null
          region?: string | null
          specialization?: string | null
        }
        Update: {
          abs_error?: number
          actual_calloffs?: number
          confidence?: string | null
          customer?: string
          drift_ratio?: number | null
          evaluated_at?: string
          expected_calloffs?: number
          forecast_run_id?: string
          id?: string
          is_drift_alert?: boolean
          month?: string
          profession?: string | null
          region?: string | null
          specialization?: string | null
        }
        Relationships: []
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
      profile_audit_log: {
        Row: {
          changed_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          source: string
          source_document_id: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          source_document_id?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          source_document_id?: string | null
          user_id?: string
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
      radar_access_log: {
        Row: {
          client_ip: string | null
          created_at: string
          endpoint: string
          filters: Json | null
          id: string
          row_count: number
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          client_ip?: string | null
          created_at?: string
          endpoint: string
          filters?: Json | null
          id?: string
          row_count: number
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          client_ip?: string | null
          created_at?: string
          endpoint?: string
          filters?: Json | null
          id?: string
          row_count?: number
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      radar_api_keys: {
        Row: {
          can_write: boolean
          consumer_project: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          max_rows_per_request: number
          max_write_rows_per_request: number
          name: string
          notes: string | null
          partner_source: string | null
          rate_limit_per_day: number
          rate_limit_per_hour: number
          revoked_at: string | null
          scopes: string[]
          share_data: boolean
          write_per_day: number
          write_per_hour: number
        }
        Insert: {
          can_write?: boolean
          consumer_project?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          max_rows_per_request?: number
          max_write_rows_per_request?: number
          name: string
          notes?: string | null
          partner_source?: string | null
          rate_limit_per_day?: number
          rate_limit_per_hour?: number
          revoked_at?: string | null
          scopes?: string[]
          share_data?: boolean
          write_per_day?: number
          write_per_hour?: number
        }
        Update: {
          can_write?: boolean
          consumer_project?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          max_rows_per_request?: number
          max_write_rows_per_request?: number
          name?: string
          notes?: string | null
          partner_source?: string | null
          rate_limit_per_day?: number
          rate_limit_per_hour?: number
          revoked_at?: string | null
          scopes?: string[]
          share_data?: boolean
          write_per_day?: number
          write_per_hour?: number
        }
        Relationships: []
      }
      radar_api_log: {
        Row: {
          api_key_id: string | null
          client_ip: string | null
          created_at: string
          endpoint: string
          id: string
          query_params: Json | null
          row_count: number | null
          status: string
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          client_ip?: string | null
          created_at?: string
          endpoint: string
          id?: string
          query_params?: Json | null
          row_count?: number | null
          status: string
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          client_ip?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          query_params?: Json | null
          row_count?: number | null
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radar_api_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "radar_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_import_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          row_count: number
          status: string
          table_name: string
          truncated: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          row_count: number
          status?: string
          table_name: string
          truncated?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          row_count?: number
          status?: string
          table_name?: string
          truncated?: boolean
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
      rate_baseline_acknowledgments: {
        Row: {
          acknowledged_by: string
          created_at: string
          id: string
          new_value: number
          old_value: number | null
          reason: string
          typ: string
          version_id: string
          yrkeskategori: string
          zon: string
        }
        Insert: {
          acknowledged_by: string
          created_at?: string
          id?: string
          new_value: number
          old_value?: number | null
          reason: string
          typ: string
          version_id: string
          yrkeskategori: string
          zon: string
        }
        Update: {
          acknowledged_by?: string
          created_at?: string
          id?: string
          new_value?: number
          old_value?: number | null
          reason?: string
          typ?: string
          version_id?: string
          yrkeskategori?: string
          zon?: string
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
      rate_slug_aliases: {
        Row: {
          alias_slug: string
          created_at: string
          id: string
          updated_at: string
          yrkeskategori: string
        }
        Insert: {
          alias_slug: string
          created_at?: string
          id?: string
          updated_at?: string
          yrkeskategori: string
        }
        Update: {
          alias_slug?: string
          created_at?: string
          id?: string
          updated_at?: string
          yrkeskategori?: string
        }
        Relationships: []
      }
      rate_verification_baseline: {
        Row: {
          created_at: string
          id: string
          source_note: string | null
          timpris_kund: number
          typ: string
          version_id: string
          yrkeskategori: string
          zon: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_note?: string | null
          timpris_kund: number
          typ: string
          version_id: string
          yrkeskategori: string
          zon: string
        }
        Update: {
          created_at?: string
          id?: string
          source_note?: string | null
          timpris_kund?: number
          typ?: string
          version_id?: string
          yrkeskategori?: string
          zon?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_verification_baseline_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "contract_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_verification_runs: {
        Row: {
          baseline_checksum: string | null
          current_checksum: string | null
          diff_json: Json | null
          error_message: string | null
          id: string
          mismatch_count: number
          run_at: string
          status: string
          total_rows: number
          version_id: string | null
        }
        Insert: {
          baseline_checksum?: string | null
          current_checksum?: string | null
          diff_json?: Json | null
          error_message?: string | null
          id?: string
          mismatch_count?: number
          run_at?: string
          status?: string
          total_rows?: number
          version_id?: string | null
        }
        Update: {
          baseline_checksum?: string | null
          current_checksum?: string | null
          diff_json?: Json | null
          error_message?: string | null
          id?: string
          mismatch_count?: number
          run_at?: string
          status?: string
          total_rows?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_verification_runs_version_id_fkey"
            columns: ["version_id"]
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
      security_audit_runs: {
        Row: {
          created_at: string
          findings: Json
          id: string
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          findings?: Json
          id?: string
          status?: string
          summary?: Json
        }
        Update: {
          created_at?: string
          findings?: Json
          id?: string
          status?: string
          summary?: Json
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
      system_health_log: {
        Row: {
          alert_id: string | null
          alert_sent_at: string | null
          check_name: string
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          status: string
        }
        Insert: {
          alert_id?: string | null
          alert_sent_at?: string | null
          check_name: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          status: string
        }
        Update: {
          alert_id?: string | null
          alert_sent_at?: string | null
          check_name?: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      tool_suggestions: {
        Row: {
          choice: string
          confirm_token: string
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          own_text: string | null
        }
        Insert: {
          choice: string
          confirm_token: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          own_text?: string | null
        }
        Update: {
          choice?: string
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          own_text?: string | null
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
      uppdragsradar_predictions: {
        Row: {
          confidence: string | null
          customer: string
          expected_calloffs: number | null
          expected_calloffs_display: number | null
          forecast_run_id: string
          generated_at: string
          id: string
          is_seasonal_peak: boolean | null
          is_trend_break: boolean | null
          is_under_review: boolean
          month: string
          profession: string | null
          region: string | null
          seasonal_index: number | null
          specialization: string | null
          trend_ratio: number | null
          yoy_ratio: number | null
          ytd_ratio: number | null
        }
        Insert: {
          confidence?: string | null
          customer: string
          expected_calloffs?: number | null
          expected_calloffs_display?: number | null
          forecast_run_id?: string
          generated_at?: string
          id?: string
          is_seasonal_peak?: boolean | null
          is_trend_break?: boolean | null
          is_under_review?: boolean
          month: string
          profession?: string | null
          region?: string | null
          seasonal_index?: number | null
          specialization?: string | null
          trend_ratio?: number | null
          yoy_ratio?: number | null
          ytd_ratio?: number | null
        }
        Update: {
          confidence?: string | null
          customer?: string
          expected_calloffs?: number | null
          expected_calloffs_display?: number | null
          forecast_run_id?: string
          generated_at?: string
          id?: string
          is_seasonal_peak?: boolean | null
          is_trend_break?: boolean | null
          is_under_review?: boolean
          month?: string
          profession?: string | null
          region?: string | null
          seasonal_index?: number | null
          specialization?: string | null
          trend_ratio?: number | null
          yoy_ratio?: number | null
          ytd_ratio?: number | null
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
      app_settings_public: {
        Row: {
          key: string | null
          value: Json | null
        }
        Insert: {
          key?: string | null
          value?: Json | null
        }
        Update: {
          key?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      calloff_imports_public: {
        Row: {
          calloff_date: string | null
          customer: string | null
          customer_type: string | null
          duration_weeks: number | null
          filled: boolean | null
          id: string | null
          imported_at: string | null
          level: string | null
          price_max: number | null
          price_median: number | null
          price_min: number | null
          region: string | null
          role: string | null
          specialization: string | null
          unit: string | null
        }
        Insert: {
          calloff_date?: string | null
          customer?: string | null
          customer_type?: string | null
          duration_weeks?: number | null
          filled?: boolean | null
          id?: string | null
          imported_at?: string | null
          level?: string | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          region?: string | null
          role?: string | null
          specialization?: string | null
          unit?: string | null
        }
        Update: {
          calloff_date?: string | null
          customer?: string | null
          customer_type?: string | null
          duration_weeks?: number | null
          filled?: boolean | null
          id?: string | null
          imported_at?: string | null
          level?: string | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          region?: string | null
          role?: string | null
          specialization?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      security_audit_view: {
        Row: {
          check_name: string | null
          payload: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      agent_api_count_today: { Args: { _key_id: string }; Returns: number }
      aggregate_calloff_monthly: {
        Args: { _months_back?: number }
        Returns: {
          calloff_count: number
          customer: string
          region: string
          role: string
          specialization: string
          year_month: string
        }[]
      }
      ai_usage_summary: {
        Args: { _days?: number; _user_id?: string }
        Returns: {
          call_count: number
          error_count: number
          feature: string
          model: string
          total_cost_sek: number
          total_cost_usd: number
          total_input_tokens: number
          total_output_tokens: number
          user_id: string
        }[]
      }
      approve_org_membership_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      cc_slugify: { Args: { _input: string }; Returns: string }
      check_ai_rate_limit: {
        Args: { _daily_limit?: number; _user_id: string }
        Returns: Json
      }
      create_document_share:
        | {
            Args: {
              _document_ids: string[]
              _expires_in_hours: number
              _recipient_label?: string
            }
            Returns: {
              expires_at: string
              id: string
              token: string
            }[]
          }
        | {
            Args: {
              _document_ids: string[]
              _expires_in_hours: number
              _recipient_email?: string
              _recipient_label?: string
            }
            Returns: {
              expires_at: string
              id: string
              token: string
            }[]
          }
      create_org_with_admin: {
        Args: { _name: string; _org_number?: string; _type?: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_document_share_by_token: { Args: { _token: string }; Returns: Json }
      get_feature_flag: { Args: { _key: string }; Returns: Json }
      get_health_check_cron_token: { Args: never; Returns: string }
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
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_edge_error: {
        Args: {
          _context?: Json
          _error_message: string
          _function_name: string
          _request_id?: string
          _stack?: string
        }
        Returns: string
      }
      lookup_rate: {
        Args: { location_slug: string; specialty_slug: string }
        Returns: {
          client_rate: number
          contractor_rate: number
          employee_rate: number
          location_name: string
          source: string
          specialty_name: string
        }[]
      }
      match_lonekoll_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          section: string
          similarity: number
          source_doc: string
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
      mp_can_publish: { Args: { _user_id: string }; Returns: boolean }
      pg_columns_for_public: {
        Args: never
        Returns: {
          column_name: string
          table_name: string
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redact_avrop_intelligence_pii: { Args: never; Returns: number }
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
      reject_org_membership_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      search_staffing_agencies: {
        Args: { query: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      security_audit_checks: {
        Args: never
        Returns: {
          check_name: string
          payload: Json
        }[]
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
      bankid_signature_flow: "verify_representation"
      bankid_signature_status:
        | "pending"
        | "complete"
        | "failed"
        | "cancelled"
        | "expired"
      geography_type: "nation" | "region" | "zone" | "municipality"
      mp_event_kind:
        | "listing_created"
        | "listing_updated"
        | "listing_published"
        | "listing_paused"
        | "listing_closed"
        | "offer_created"
        | "offer_countered"
        | "offer_accepted"
        | "offer_rejected"
        | "offer_withdrawn"
        | "agent_run"
      mp_listing_status: "draft" | "published" | "paused" | "closed"
      mp_offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "countered"
        | "withdrawn"
      ref_app_role:
        | "individual"
        | "reference_giver"
        | "client"
        | "admin"
        | "agency"
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
      bankid_signature_flow: ["verify_representation"],
      bankid_signature_status: [
        "pending",
        "complete",
        "failed",
        "cancelled",
        "expired",
      ],
      geography_type: ["nation", "region", "zone", "municipality"],
      mp_event_kind: [
        "listing_created",
        "listing_updated",
        "listing_published",
        "listing_paused",
        "listing_closed",
        "offer_created",
        "offer_countered",
        "offer_accepted",
        "offer_rejected",
        "offer_withdrawn",
        "agent_run",
      ],
      mp_listing_status: ["draft", "published", "paused", "closed"],
      mp_offer_status: [
        "pending",
        "accepted",
        "rejected",
        "countered",
        "withdrawn",
      ],
      ref_app_role: [
        "individual",
        "reference_giver",
        "client",
        "admin",
        "agency",
      ],
      ref_ping_status: ["sent", "confirmed", "denied", "expired", "dismissed"],
      ref_reference_status: ["pending", "active", "revoked", "expired"],
      ref_representation_status: ["pending", "signed", "declined", "expired"],
    },
  },
} as const
