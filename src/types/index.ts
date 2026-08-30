export type Store = 'GS25' | 'CU';
export type PromotionType = '1+1' | '2+1';
export type RecruitmentStatus = 'OPEN' | 'PAUSED' | 'CLOSED';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'CONTACTED'
  | 'EVIDENCE_VERIFIED'
  | 'QR_RECEIVED'
  | 'COMPLETED'
  | 'NOT_PURCHASED'
  | 'FAILED';

export interface PriceOption {
  ratio: number;
  price: number;
  isRepresentative: boolean;
}

export interface Application {
  id: string;
  createdAt: string;
  store: Store;
  promotionType: PromotionType;
  productName: string;
  originalPaidPrice: number;
  quantity: number;
  expiryDate: string;
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
  status: ApplicationStatus;
}
