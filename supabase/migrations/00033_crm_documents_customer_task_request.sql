-- Link customer portal uploads to a specific customer_task_request so customers
-- only see and manage files they uploaded via that link.

alter table public.crm_documents
  add column if not exists customer_task_request_id uuid
    references public.customer_task_requests (id) on delete set null;

create index if not exists idx_crm_documents_customer_task_request_id
  on public.crm_documents (customer_task_request_id)
  where deleted_at is null and upload_status = 'ready';

update public.crm_documents d
set customer_task_request_id = (e.metadata_json->>'customer_task_request_id')::uuid
from public.crm_accountability_events e
where e.event_type = 'customer_task_document_uploaded'
  and (e.metadata_json->>'document_id')::uuid = d.id
  and d.customer_task_request_id is null
  and e.metadata_json ? 'customer_task_request_id'
  and e.metadata_json ? 'document_id';
