DROP FUNCTION IF EXISTS public.create_document_share(uuid[], timestamptz, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.list_my_document_shares() CASCADE;
DROP FUNCTION IF EXISTS public.get_shared_documents(text) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_document_share(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_document_share_view(text, text, text, uuid, text) CASCADE;

DROP TABLE IF EXISTS public.document_share_views CASCADE;
DROP TABLE IF EXISTS public.document_shares CASCADE;
DROP TABLE IF EXISTS public.consultant_documents CASCADE;