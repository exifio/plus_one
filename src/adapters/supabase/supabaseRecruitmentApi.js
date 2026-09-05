import { validateRecruitmentStatus } from '../../features/recruitment/domain/recruitmentStatus';

function adapterError(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function statusResult(status) {
  if (!validateRecruitmentStatus(status).valid) {
    throw adapterError('INVALID_RECRUITMENT_STATUS');
  }
  return { status };
}

async function invokeAdmin(supabase, functionName, body) {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw adapterError('ADMIN_RECRUITMENT_REQUEST_FAILED', error);
  return data;
}

/**
 * LINK-1 모집 상태의 실제 Supabase adapter.
 * 판매자는 공개 RPC, Admin은 Auth 세션을 전달하는 Edge Function을 사용한다.
 */
export function createSupabaseRecruitmentApis(supabase, functionName = 'admin-api') {
  const saleRequestApi = {
    async getRecruitmentStatus() {
      const { data, error } = await supabase.rpc('get_recruitment_status');
      if (error) throw adapterError('RECRUITMENT_STATUS_REQUEST_FAILED', error);
      return statusResult(data);
    },
  };

  const adminRecruitmentApi = {
    async getRecruitmentStatus() {
      const data = await invokeAdmin(supabase, functionName, {
        action: 'getRecruitmentStatus',
      });
      return statusResult(data?.status);
    },

    async updateRecruitmentStatus(status) {
      if (!validateRecruitmentStatus(status).valid) {
        throw adapterError('INVALID_RECRUITMENT_STATUS');
      }

      const data = await invokeAdmin(supabase, functionName, {
        action: 'updateRecruitmentStatus',
        status,
      });
      return statusResult(data?.status).status;
    },
  };

  return { saleRequestApi, adminRecruitmentApi };
}
