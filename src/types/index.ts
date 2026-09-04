export type Store = 'GS25' | 'CU';
export type PromotionType = '1+1' | '2+1';
export type RegistrationMethod = 'SCREENSHOT' | 'MANUAL';
export type RecruitmentStatus = 'OPEN' | 'PAUSED' | 'CLOSED';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'CONTACTED'
  | 'EVIDENCE_VERIFIED'
  | 'QR_RECEIVED'
  | 'COMPLETED'
  | 'NOT_PURCHASED'
  | 'FAILED';

export interface Application {
  id: string;
  createdAt: string;
  store: Store;
  promotionType: PromotionType;
  registrationMethod: RegistrationMethod;
  screenshotFileName?: string;
  productName: string;
  originalPaidPrice: number;
  quantity: number;
  expiryDate: string;
  unitBasePrice: number;
  /** 판매자가 직접 입력한 판매 희망금액 (원 단위, 1개당). */
  desiredPrice: number;
  contactType: 'phone' | 'kakao';
  contactValue: string;
  status: ApplicationStatus;
}
