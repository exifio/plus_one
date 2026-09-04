import type {
  Application,
  ApplicationStatus,
  PromotionType,
  RegistrationMethod,
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
import { calculateUnitBasePrice } from '../utils/price';
import { supabase } from './supabaseClient';

export interface CreateApplicationParams {
  store: Store;
  promotionType: PromotionType;
  /** 등록 방식. 스크린샷 신청은 'SCREENSHOT'. 기본값은 'MANUAL'. */
  registrationMethod?: RegistrationMethod;
  /** 스크린샷 등록 시 Storage에 업로드한 파일명(객체 경로). */
  screenshotFileName?: string;
  productName: string;
  originalPaidPrice: number;
  quantity: number;
  expiryDate?: string;
  /** 판매자가 직접 입력한 판매 희망금액 (원 단위, 1개당). */
  desiredPrice: number;
  contactType: 'phone' | 'kakao';
  contactValue: string;
}

export function mapRowToApplication(row: Record<string, unknown>): Application {
  return {
    id: String(row.id ?? ''),
    createdAt: String(row.created_at || new Date().toISOString()),
    store: row.store as Store,
    promotionType: row.promotion_type as PromotionType,
    registrationMethod: row.registration_method === 'SCREENSHOT' ? 'SCREENSHOT' : 'MANUAL',
    screenshotFileName:
      row.screenshot_file_name == null ? undefined : String(row.screenshot_file_name),
    productName: String(row.product_name ?? ''),
    originalPaidPrice: Number(row.original_paid_price ?? 0),
    quantity: Number(row.quantity ?? 1),
    expiryDate: String(row.expiry_date ?? ''),
    unitBasePrice: Number(row.unit_base_price ?? 0),
    desiredPrice: Number(row.desired_price ?? 0),
    contactType: (row.contact_type as 'phone' | 'kakao') || 'phone',
    contactValue: String(row.contact_value ?? ''),
    status: (row.status as ApplicationStatus) || 'SUBMITTED',
  };
}

function mockApplication(params: CreateApplicationParams): string {
  return mockCreateApplication({
    store: params.store,
    promotionType: params.promotionType,
    registrationMethod: params.registrationMethod ?? 'MANUAL',
    screenshotFileName: params.screenshotFileName,
    productName: params.productName,
    originalPaidPrice: params.originalPaidPrice,
    quantity: params.quantity,
    expiryDate: params.expiryDate ?? '',
    unitBasePrice: calculateUnitBasePrice(params.originalPaidPrice, params.promotionType),
    desiredPrice: params.desiredPrice,
    contactType: params.contactType,
    contactValue: params.contactValue,
  }).id;
}

function toError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export const SCREENSHOT_STORAGE_BUCKET = 'screenshots';

function fileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === filename.length - 1) {
    return 'png';
  }
  return filename.slice(dotIndex + 1).toLowerCase();
}

export function buildScreenshotObjectPath(filename: string): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${id}.${fileExtension(filename)}`;
}

/**
 * 스크린샷 이미지를 private Storage 버킷에 업로드하고 객체 경로를 반환한다.
 * Mock 모드에서는 파일명 그대로 반환한다.
 */
export async function uploadScreenshot(file: File): Promise<string> {
  if (!supabase) {
    return file.name;
  }

  const objectPath = buildScreenshotObjectPath(file.name);
  const { error } = await supabase.storage
    .from(SCREENSHOT_STORAGE_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type || 'image/png',
      upsert: false,
    });
  if (error) {
    throw new Error(error.message || '이미지 업로드에 실패했습니다.');
  }
  return objectPath;
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
    p_desired_price: params.desiredPrice,
    p_contact_type: params.contactType,
    p_contact_value: params.contactValue,
    p_registration_method: params.registrationMethod ?? 'MANUAL',
    p_screenshot_file_name: params.screenshotFileName ?? null,
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
