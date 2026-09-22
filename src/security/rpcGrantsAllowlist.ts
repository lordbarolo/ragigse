/**
 * Heltäckande allowlist över databasfunktioner i `public`-schemat och deras
 * förväntade API-grants.
 *
 * Syftet är att stänga "grants-fällan": varje ny funktion måste läggas in här
 * med ett explicit ställningstagande, annars failar rpcGrants-testet.
 *
 * Kategorier:
 *   "anon"          — publikt anropbar (anon + authenticated)
 *   "authenticated" — EXECUTE endast för inloggade
 *   "internal"      — ingen API-roll; triggers, cron eller service_role
 */
export type GrantCategory = "anon" | "authenticated" | "internal";

export const FUNCTION_GRANTS: Record<string, GrantCategory> = {
  // ── Publika (anon) ────────────────────────────────────────────────────────
  get_feature_flag: "anon",
  get_referral_by_token: "anon",
  lookup_rate: "anon",
  top_kommuner: "anon",
  cc_slugify: "anon",
  search_staffing_agencies: "anon",
  // Beta: AI-avtalsgranskaren är medvetet publik (se drizzle/migrations/0000, 0003)
  beta_match_benchmark: "anon",
  beta_resolve_zone: "anon",

  // ── Endast inloggade ──────────────────────────────────────────────────────
  ref_has_role: "authenticated",
  create_org_with_admin: "authenticated",
  approve_org_membership_request: "authenticated",
  reject_org_membership_request: "authenticated",
  is_org_admin: "authenticated",
  create_document_share: "authenticated",
  list_my_document_shares: "authenticated",
  get_my_registry_orders: "authenticated",
  revoke_document_share: "authenticated",
  get_document_share_by_token: "authenticated",
  log_document_share_view: "authenticated",
  mp_can_publish: "authenticated",
  ref_create_ping: "authenticated",
  ref_get_ping_by_token: "authenticated",
  ref_get_public_profile: "authenticated",
  ref_get_reference_by_invite_token: "authenticated",
  ref_log_profile_view: "authenticated",
  ref_respond_to_ping: "authenticated",
  ref_submit_reference: "authenticated",
  ref_verify_imported_reference: "authenticated",
  set_profile_email: "authenticated",
  ai_usage_summary: "authenticated",
  match_lonekoll_chunks: "authenticated",
  trust_create_self_asserted_credential: "authenticated",
  trust_transition_credential: "authenticated",

  // ── Interna (triggers, cron, service_role) ────────────────────────────────
  agent_api_count_today: "internal",
  aggregate_calloff_monthly: "internal",
  check_ai_rate_limit: "internal",
  delete_email: "internal",
  enqueue_email: "internal",
  get_health_check_cron_token: "internal",
  handle_new_user: "internal",
  log_edge_error: "internal",
  move_to_dlq: "internal",
  mp_listings_enforce_publish_gate: "internal",
  pg_columns_for_public: "internal",
  radar_create_notifications: "internal",
  read_email_batch: "internal",
  redact_avrop_intelligence_pii: "internal",
  ref_calculate_profile_status: "internal",
  ref_calculate_trust_score: "internal",
  ref_get_user_org_id: "internal",
  ref_refresh_attachability: "internal",
  security_audit_checks: "internal",
  update_updated_at_column: "internal",
  guard_consultant_documents_status: "internal",
  guard_invoice_reviews_admin_fields: "internal",
  guard_profiles_verification_fields: "internal",
  guard_ref_profiles_trust_fields: "internal",
  guard_trust_credentials_fields: "internal",
  guard_trust_evidence_fields: "internal",
  trust_events_append_only: "internal",
};
