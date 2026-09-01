import type {
  Application,
  ApplicationStatus,
  PromotionType,
  RecruitmentStatus,
  Store,
} from '../types';
import type { StatusFilter } from '../utils/adminStatus';
import {
  createApplication as mockCreateApplication,
  getApplicationById as mockGetApplicationById,
  getApplications as mockGetApplications,
  updateApplicationStatus as mockUpdateApplicationStatus,
} from '../mocks/applicationsStore';
import {
  getRecruitmentStatus as mockGetRecruitmentStatus,
  setRecruitmentStatus as mockSetRecruitmentStatus,
} from '../mocks/recruitmentStore';
import { supabase } from './supabaseClient';

export interface CreateApplicationParams {
  store: Store;
  promotionType: PromotionType;
  productName: string;
  originalPaidPrice: number;
  quantity: number;
  expiryDate?: string;
  unitBasePrice: number;
  initialRatio: number;
  initialPrice: number;
  hadPriceOffer: boolean;
  offeredRatio?: number;
  offeredPrice?: number;
  offerAccepted?: boolean;
  finalRatio: number;
  finalPrice: number;
  contactType: 'phone' | 'kakao';
  contactValue: string;
}

export function mapRowToApplication(row: Record<string, unknown>): Application {
  return {
    id: String(row.id ?? ''),
    createdAt: String(row.created_at || new Date().toISOString()),
    store: row.store as Store,
    promotionType: row.promotion_type as PromotionType,
    productName: String(row.product_name ?? ''),
    originalPaidPrice: Number(row.original_paid_price ?? 0),
    quantity: Number(row.quantity ?? 1),
    expiryDate: String(row.expiry_date ?? ''),
    unitBasePrice: Number(row.unit_base_price ?? 0),
    initialRatio: Number(row.initial_ratio ?? 0),
    initialPrice: Number(row.initial_price ?? 0),
    hadPriceOffer: Boolean(row.had_price_offer),
    offeredRatio: row.offered_ratio != null ? Number(row.offered_ratio) : undefined,
    offeredPrice: row.offered_price != null ? Number(row.offered_price) : undefined,
    offerAccepted: row.offer_accepted != null ? Boolean(row.offer_accepted) : undefined,
    finalRatio: Number(row.final_ratio ?? 0),
    finalPrice: Number(row.final_price ?? 0),
    contactType: (row.contact_type as 'phone' | 'kakao') || 'phone',
    contactValue: String(row.contact_value ?? ''),
    status: (row.status as ApplicationStatus) || 'SUBMITTED',
  };
}

function mockApplication(params: CreateApplicationParams): string {
  return mockCreateApplication({
    store: params.store,
    promotionType: params.promotionType,
    productName: params.productName,
    originalPaidPrice: params.originalPaidPrice,
    quantity: params.quantity,
    expiryDate: params.expiryDate ?? '',
    unitBasePrice: params.unitBasePrice,
    initialRatio: params.initialRatio,
    initialPrice: params.initialPrice,
    hadPriceOffer: params.hadPriceOffer,
    offeredRatio: params.offeredRatio,
    offeredPrice: params.offeredPrice,
    offerAccepted: params.offerAccepted,
    finalRatio: params.finalRatio,
    finalPrice: params.finalPrice,
    contactType: params.contactType,
    contactValue: params.contactValue,
  }).id;
}

function toError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function submitApplication(params: CreateApplicationParams): Promise<string> {
  if (!supabase) {
    return mockApplication(params);
  }

  const { data, error } = await supabase.rpc('submit_application', {
    p_store: params.store,
    p_promotion_type: params.promotionType,
    p_product_name: params.productName,
    p_original_paid_price: params.originalPaidPrice,
    p_quantity: params.quantity,
    p_expiry_date: params.expiryDate || null,
    p_unit_base_price: params.unitBasePrice,
    p_initial_ratio: params.initialRatio,
    p_initial_price: params.initialPrice,
    p_had_price_offer: params.hadPriceOffer,
    p_offered_ratio: params.offeredRatio ?? null,
    p_offered_price: params.offeredPrice ?? null,
    p_offer_accepted: params.offerAccepted ?? null,
    p_final_ratio: params.finalRatio,
    p_final_price: params.finalPrice,
    p_contact_type: params.contactType,
    p_contact_value: params.contactValue,
  });

  if (error) {
    if (error.message.includes('현재는 판매 신청을 받고 있지 않습니다')) {
      throw new Error('RECRUITMENT_NOT_OPEN');
    }
    throw toError(error, '신청 접수에 실패했습니다.');
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('신청번호를 받지 못했습니다.');
  }
  return data;
}

export async function fetchApplications(statusFilter?: StatusFilter): Promise<Application[]> {
  if (!supabase) {
    const mockList = mockGetApplications();
    if (statusFilter && statusFilter !== 'ALL') {
      return mockList.filter((application) => application.status === statusFilter);
    }
    return mockList;
  }

  let request = supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (statusFilter && statusFilter !== 'ALL') {
    request = request.eq('status', statusFilter);
  }

  const { data, error } = await request;
  if (error) {
    throw toError(error, '신청 목록을 불러오지 못했습니다.');
  }
  return (data ?? []).map((item) => mapRowToApplication(item as Record<string, unknown>));
}

export async function fetchApplicationById(id: string): Promise<Application | null> {
  if (!supabase) {
    return mockGetApplicationById(id) ?? null;
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw toError(error, '신청 상세를 불러오지 못했습니다.');
  }
  return data ? mapRowToApplication(data as Record<string, unknown>) : null;
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  if (!supabase) {
    mockUpdateApplicationStatus(id, status);
    return;
  }

  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id);
  if (error) {
    throw toError(error, '신청 상태를 저장하지 못했습니다.');
  }
}

export async function fetchRecruitmentStatus(): Promise<RecruitmentStatus> {
  if (!supabase) {
    return mockGetRecruitmentStatus();
  }

  const { data, error } = await supabase
    .from('recruitment_settings')
    .select('status')
    .maybeSingle();
  if (error) {
    throw toError(error, '모집 상태를 불러오지 못했습니다.');
  }
  if (!data?.status) {
    throw new Error('모집 상태를 찾지 못했습니다.');
  }
  return data.status as RecruitmentStatus;
}

export async function updateRecruitmentStatus(status: RecruitmentStatus): Promise<void> {
  if (!supabase) {
    mockSetRecruitmentStatus(status);
    return;
  }

  const { error } = await supabase
    .from('recruitment_settings')
    .update({ status })
    .eq('id', 1);
  if (error) {
    throw toError(error, '모집 상태를 저장하지 못했습니다.');
  }
}
