import { transformSaleRequestPayload } from '../../features/sale-request/domain/transformSaleRequestPayload';

function adapterError(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

export function createSupabaseSubmissionApis(supabase, createId = () => crypto.randomUUID()) {
  return {
    async submitSaleRequest(draft) {
      const payload = transformSaleRequestPayload(draft, draft.evidenceImage);
      const { data, error } = await supabase.rpc('create_sale_request', {
        p_contact_type: payload.contact_type,
        p_contact_value: payload.contact_value,
        p_convenience_store: payload.convenience_store,
        p_promotion_type: payload.promotion_type,
        p_evidence_image: payload.evidence_image,
        p_items: payload.items,
        p_registration_method: payload.registration_method,
      });

      if (error) {
        const code = String(error.message ?? '').includes('RECRUITMENT_NOT_OPEN')
          ? 'RECRUITMENT_NOT_OPEN'
          : 'SALE_REQUEST_SUBMIT_FAILED';
        throw adapterError(code, error);
      }

      if (!data?.sale_request_id || !data?.seller_id || !Number.isInteger(data?.items_count)) {
        throw adapterError('SALE_REQUEST_RESPONSE_INVALID');
      }

      return {
        saleRequestId: data.sale_request_id,
        sellerId: data.seller_id,
        itemsCount: data.items_count,
      };
    },

    async uploadEvidence(image) {
      if (!image) throw adapterError('EVIDENCE_UPLOAD_FAILED');

      const { data, error } = await supabase.storage
        .from('sale-evidence')
        .upload(`anonymous/${createId()}`, image, {
          contentType: image.type,
          upsert: false,
        });

      if (error || !data?.path) throw adapterError('EVIDENCE_UPLOAD_FAILED', error);
      return data.path;
    },
  };
}
