export type Role = 'citizen' | 'merchant' | 'admin';

export interface Province {
  provId: number;
  provName: string;
}

export interface District {
  distId: number;
  distName: string;
  provId: number;
}

export interface User {
  userId: number;
  citizenId: string; // 13 digits
  name: string;
  role: Role;
  phone: string;
  password?: string;
  merchantId?: number;
  provId: number;
  distId?: number;
  status: 'approved' | 'pending' | 'rejected';
  registeredAt: string;
}

export interface Merchant {
  mchId: number;
  userId: number;
  shopName: string;
  category: 'อาหารและเครื่องดื่ม' | 'ของใช้ทั่วไป' | 'หัตถกรรม/ของฝาก' | 'บริการชุมชน' | 'ผลไม้/เกษตรแปรรูป' | 'เสื้อผ้าและเครื่องแต่งกาย' | 'สุขภาพและความงาม' | 'บ้านและเครื่องใช้';
  address: string;
  lat: number | null;
  lng: number | null;
  distId: number;
  provId: number;
  ownerName: string;
  phone: string;
  status: 'approved' | 'pending' | 'rejected';
  registeredAt: string;
  imageUrl: string;
  promptpayId: string;
  dailyAvgSales: number;
  currentDailySales: number;
  walletBalance?: number;
  wallet?: Wallet;
  isAiTarget: boolean;
  openingHours?: string;
  description?: string;
}

export interface SalesTransaction {
  txId: number;
  userId: number;
  userName: string;
  merchantId: number;
  merchantName: string;
  totalAmount: number;
  userPaidAmount: number;
  govSubsidizedAmount: number;
  txTimestamp: string;
  distId: number;
  status: 'completed' | 'cancelled';
  note?: string;
  earnedStampId?: number;
  missionId?: number;
}

export interface AISalesAnalysis {
  analysisId: number;
  merchantId: number;
  merchantName: string;
  salesAmount: number;
  averageSales: number;
  salesRatio: number; // e.g. 0.50 (50% drop)
  salesStatus: 'critical_low' | 'low' | 'normal' | 'thriving';
  boostRecommended: boolean;
  analyzedAt: string;
  criticalHours: string; // e.g. "13:00 - 16:00 น."
  aiInsight: string;
  suggestedAction: string;
}

export interface Mission {
  missionId: number;
  missionName: string;
  description: string;
  targetMerchantId?: number;
  targetMerchantName?: string;
  targetDistId?: number;
  minSpend: number; // typically 150 THB
  maxRecipients: number; // e.g. 10 or 50
  currentRecipients: number;
  rewardStampId: number;
  startDateTime: string;
  endDateTime: string;
  status: 'active' | 'completed' | 'draft';
  category: string;
  completedUserIds: number[];
}

export interface DistrictStamp {
  stampId: number;
  stampName: string;
  distId: number;
  provId: number;
  distName: string;
  provName: string;
  iconName: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'special';
  description: string;
  symbolMeaning: string;
}

export interface UserStamp {
  userStampId: number;
  userId: number;
  stampId: number;
  count: number;
  earnedAt: string;
  earnSource: 'mission' | 'spend_150' | 'trade';
  qualifyingAmount: number;
}

export interface Reward {
  rewardId: number;
  rewardName: string;
  rewardType: 'otop_product' | 'discount_voucher' | 'souvenir';
  description: string;
  requiredStampCount: number;
  stampIdRequired?: number; // if requires specific district stamp or any
  status: 'available' | 'out_of_stock';
  originalValue: number;
  discountValue: number;
  imageUrl: string;
  provinceName: string;
  remainingStock: number;
}

export interface StampRedemption {
  redemptionId: number;
  userId: number;
  userName: string;
  rewardId: number;
  rewardName: string;
  stampId: number;
  quantity: number;
  status: 'redeemed' | 'shipped' | 'ready_to_use';
  redeemedAt: string;
  redemptionCode: string;
}

export interface Wallet {
  walletId: number;
  userId?: number | null;
  merchantId?: number | null;
  balance: number;
  status?: string;
  updatedAt: string;
}

export interface UserGrant {
  grantId: number;
  userId: number;
  grantName: string;
  totalGrantAmount: number; // e.g. 10,000 THB
  remainingAmount: number;
  govPayRatio: number; // 0.40
  userPayRatio: number; // 0.60
  grantedAt: string;
  status: 'active' | 'exhausted' | 'pending';
}

export interface SocialImpactMetrics {
  participatingShops: number;
  totalTransactionVolume: number;
  govSubsidizedTotal: number;
  userSpentTotal: number;
  lowSalesRecoveryRate: number; // percentage e.g. 84.5%
  activeMissions: number;
  completedMissionsCount: number;
  stampsIssued: number;
  stampsRedeemed: number;
  otopRedemptionVolume: number;
}
