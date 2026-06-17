DO $$
DECLARE
  v_table_name text;
  v_secret_column text;
  v_safe_columns text;
BEGIN
  FOR v_table_name, v_secret_column IN
    VALUES
      ('ref_pings', 'response_token'),
      ('ref_references', 'invite_token'),
      ('ref_representation_requests', 'secret_token')
  LOOP
    EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon, authenticated', v_table_name);
    EXECUTE format('REVOKE SELECT (%I) ON TABLE public.%I FROM anon, authenticated', v_secret_column, v_table_name);

    SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position)
    INTO v_safe_columns
    FROM information_schema.columns AS c
    WHERE c.table_schema = 'public'
      AND c.table_name = v_table_name
      AND c.column_name <> v_secret_column;

    IF v_safe_columns IS NOT NULL THEN
      EXECUTE format('GRANT SELECT (%s) ON TABLE public.%I TO authenticated', v_safe_columns, v_table_name);
    END IF;
  END LOOP;
END $$;