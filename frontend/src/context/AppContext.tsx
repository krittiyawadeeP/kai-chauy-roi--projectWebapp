import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Role,
  User,
  Merchant,
  SalesTransaction,
  AISalesAnalysis,
  Mission,
  DistrictStamp,
  UserStamp,
  Reward,
  StampRedemption,
  Wallet,
  UserGrant,
  SocialImpactMetrics,
  AiTargetShop
} from '../types';
import {
  INITIAL_PROVINCES,
  INITIAL_DISTRICTS,
  INITIAL_USERS,
  INITIAL_MERCHANTS,
  INITIAL_AI_ANALYSIS,
  INITIAL_DISTRICT_STAMPS,
  INITIAL_MISSIONS,
  INITIAL_USER_STAMPS,
  INITIAL_REWARDS,
  INITIAL_TRANSACTIONS,
  INITIAL_WALLET,
  INITIAL_USER_GRANT,
  INITIAL_REDEMPTIONS
} from '../mock/initialData';
import { api, authStorage } from '../services/api';
import { ApiMerchant, ApiSale, merchantService, mapApiMerchant, getCoordinates } from '../services/merchantService';
import { citizenService } from '../services/citizenService';

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  viewMode: 'mobile' | 'desktop';
  setViewMode: (mode: 'mobile' | 'desktop') => void;
  users: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  merchants: Merchant[];
  currentMerchant: Merchant;
  setCurrentMerchant: (merchant: Merchant) => void;
  transactions: SalesTransaction[];
  aiAnalysis: AISalesAnalysis[];
  missions: Mission[];
  districtStamps: DistrictStamp[];
  userStamps: UserStamp[];
  rewards: Reward[];
  redemptions: StampRedemption[];
  wallet: Wallet;
  userGrant: UserGrant;
  aiTargetShops: AiTargetShop[];
  
  // Auth & Profile
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  loginCitizen: (citizenId: string, phoneOrOtp?: string, dbUser?: any) => { success: boolean; message: string; user?: User };
  loginMerchant: (phoneOrTax: string, passwordOrPin?: string, mchId?: number) => { success: boolean; message: string; merchant?: Merchant };
  logout: () => void;
  updateMerchantProfile: (mchId: number, data: Partial<Merchant>) => Promise<void>;
  updateMerchantLocation: (mchId: number, lat: number, lng: number, address?: string, distId?: number) => Promise<void>;
  refreshMerchantData: () => Promise<void>;
  refreshCitizenData: () => Promise<void>;

  // Actions
  registerCitizen: (data: { citizenId: string; name: string; phone: string; provId: number; distId?: number; password?: string }) => User;
  registerMerchant: (data: { shopName: string; category: Merchant['category']; address: string; ownerName: string; phone: string; provId: number; distId: number; imageUrl?: string; lat?: number; lng?: number; openingHours?: string; description?: string }) => Merchant;
  approveMerchant: (mchId: number) => void;
  rejectMerchant: (mchId: number) => void;
  createMission: (mission: Omit<Mission, 'missionId' | 'currentRecipients' | 'completedUserIds'>) => Mission;
  executePayment: (params: {
    merchantId: number;
    totalAmount: number;
    note?: string;
  }) => Promise<{ success: boolean; message: string; earnedStamp?: DistrictStamp; tx?: SalesTransaction }>;
  redeemReward: (rewardId: number) => { success: boolean; message: string; redemption?: StampRedemption };
  tradeStamp: (stampId: number, targetName: string) => { success: boolean; message: string };
  topupWallet: (amount: number) => void;
  withdrawMerchantWallet: (amount: number, promptpayOrAccount?: string) => Promise<{ success: boolean; message: string; newBalance?: number }>;
  getMetrics: () => SocialImpactMetrics;
  resetAllData: () => void;
  triggerAIReanalysis: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'thai_chuay_thai_please_state_v1';
const DUMMY_TO_REAL_DISTRICT: Record<number, { provId: number; distId: number }> = {
  101: { provId: 12, distId: 1201 }, // เมืองนนทบุรี
  102: { provId: 12, distId: 1206 }, // ปากเกร็ด
  103: { provId: 12, distId: 1202 }, // บางกรวย
  104: { provId: 12, distId: 1203 }, // บางใหญ่
  201: { provId: 10, distId: 1001 }, // พระนคร
  202: { provId: 10, distId: 1002 }, // ดุสิต
  203: { provId: 10, distId: 1013 }, // สัมพันธวงศ์
  301: { provId: 50, distId: 5001 }, // เมืองเชียงใหม่
  302: { provId: 50, distId: 5007 }, // แม่ริม
  303: { provId: 50, distId: 5013 }, // สันกำแพง
  401: { provId: 14, distId: 1401 }, // พระนครศรีอยุธยา
  1: { provId: 10, distId: 1007 },   // Pathum Wan
  2: { provId: 50, distId: 5001 },   // Mueang Chiang Mai
};


function mapApiSale(data: ApiSale, usersList?: User[]): SalesTransaction {
  const customerName = data.users?.Name?.trim();
  const matchedUser = usersList?.find(u => u.userId === data.User_ID);
  const fallbackName = matchedUser?.name?.trim();
  const phone = data.users?.Phone?.trim();

  // If customer has a real Name, show the Name! Otherwise phone or user ID
  const userName = customerName || fallbackName || phone || `ผู้ใช้ ${data.User_ID}`;

  return {
    txId: Number(data.Tx_ID),
    userId: data.User_ID,
    userName,
    userPhone: phone,
    merchantId: data.Merchant_ID,
    merchantName: '',
    totalAmount: Number(data.Total_Amount),
    userPaidAmount: Number(data.User_Paid_Amount),
    govSubsidizedAmount: Number(data.Gov_Subsidized_Amount),
    txTimestamp: data.Tx_Timestamp,
    distId: data.District_ID,
    status: data.Status.toLowerCase() === 'cancelled' ? 'cancelled' : 'completed',
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('citizen');
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  // Stored state with default fallback
  const [merchants, setMerchants] = useState<Merchant[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_merchants`);
    const rawList: Merchant[] = saved ? JSON.parse(saved) : INITIAL_MERCHANTS;
    return rawList.map(m => {
      if (m.distId && DUMMY_TO_REAL_DISTRICT[m.distId]) {
        return {
          ...m,
          provId: DUMMY_TO_REAL_DISTRICT[m.distId].provId,
          distId: DUMMY_TO_REAL_DISTRICT[m.distId].distId,
        };
      }
      return m;
    });
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => users[0] || INITIAL_USERS[0]);
  const [currentMerchant, setCurrentMerchant] = useState<Merchant>(() => merchants[0] || INITIAL_MERCHANTS[0]);
  const [transactions, setTransactions] = useState<SalesTransaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep existing sales while adding new demo transactions to an older demo session.
          if (!parsed.some((tx: SalesTransaction) => tx.txId === 981248)) return parsed;
          const existingIds = new Set(parsed.map((tx: SalesTransaction) => tx.txId));
          return [...parsed, ...INITIAL_TRANSACTIONS.filter(tx => !existingIds.has(tx.txId))]
            .sort((a, b) => b.txTimestamp.localeCompare(a.txTimestamp));
        }
      } catch (e) {
        // use initial
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const refreshMerchantData = React.useCallback(async () => {
    if (!authStorage.getToken()) return;
    const [profile, sales] = await Promise.all([
      merchantService.getMyProfile(),
      merchantService.getSalesSummary<ApiSale[]>()
    ]);
    const mappedMerchant = mapApiMerchant(profile);
    setCurrentMerchant(mappedMerchant);
    setMerchants(previous => [mappedMerchant, ...previous.filter(item => item.mchId !== mappedMerchant.mchId)]);
    setTransactions(sales.map(s => mapApiSale(s, users)));
  }, []);

  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_missions`);
    return saved ? JSON.parse(saved) : INITIAL_MISSIONS;
  });

  const [aiAnalysis, setAiAnalysis] = useState<AISalesAnalysis[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_ai`);
    return saved ? JSON.parse(saved) : INITIAL_AI_ANALYSIS;
  });

  const [districtStamps, setDistrictStamps] = useState<DistrictStamp[]>(INITIAL_DISTRICT_STAMPS);

  const [userStamps, setUserStamps] = useState<UserStamp[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_user_stamps`);
    return saved ? JSON.parse(saved) : INITIAL_USER_STAMPS;
  });

  const [rewards, setRewards] = useState<Reward[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rewards`);
    return saved ? JSON.parse(saved) : INITIAL_REWARDS;
  });

  const [redemptions, setRedemptions] = useState<StampRedemption[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_redemptions`);
    return saved ? JSON.parse(saved) : INITIAL_REDEMPTIONS;
  });

  const [wallet, setWallet] = useState<Wallet>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_wallet`);
    return saved ? JSON.parse(saved) : INITIAL_WALLET;
  });

  const [userGrant, setUserGrant] = useState<UserGrant>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_grant`);
    return saved ? JSON.parse(saved) : INITIAL_USER_GRANT;
  });

  const [aiTargetShops, setAiTargetShops] = useState<AiTargetShop[]>([]);

  useEffect(() => {
    let active = true;
    const refreshPolicy = async () => {
      try {
        const policy = await api.get<{ Gov_Pay_Ratio: string; User_Pay_Ratio: string }>('/policy');
        const govPayRatio = Number(policy.Gov_Pay_Ratio);
        const userPayRatio = Number(policy.User_Pay_Ratio);
        if (active && Number.isFinite(govPayRatio) && Number.isFinite(userPayRatio)) {
          setUserGrant(previous => ({ ...previous, govPayRatio, userPayRatio }));
        }
      } catch { /* Keep the last known ratio while the API is unavailable. */ }
    };
    void refreshPolicy();
    window.addEventListener('grant-policy-updated', refreshPolicy);
    window.addEventListener('focus', refreshPolicy);
    const interval = window.setInterval(refreshPolicy, 60000);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('grant-policy-updated', refreshPolicy); window.removeEventListener('focus', refreshPolicy); };
  }, [role]);

  // Save to localStorage when key states change
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_merchants`, JSON.stringify(merchants));
  }, [merchants]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_missions`, JSON.stringify(missions));
  }, [missions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_user_stamps`, JSON.stringify(userStamps));
  }, [userStamps]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_wallet`, JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_grant`, JSON.stringify(userGrant));
  }, [userGrant]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_redemptions`, JSON.stringify(redemptions));
  }, [redemptions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_ai`, JSON.stringify(aiAnalysis));
  }, [aiAnalysis]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_is_auth`);
    return saved !== null ? JSON.parse(saved) : !!authStorage.getToken();
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_is_auth`, JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  const refreshCitizenData = React.useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const userRes = await api.get<any>('/user/me');
      if (userRes && userRes.User_ID) {
        const mappedUser: User = {
          userId: Number(userRes.User_ID),
          citizenId: userRes.Citizen_ID,
          name: userRes.Phone ? `คุณ (${userRes.Phone})` : 'ประชาชนผู้ใช้สิทธิ์',
          role: 'citizen',
          phone: userRes.Phone,
          provId: Number(userRes.Province_ID || 1),
          distId: Number(userRes.Dist_ID || 101),
          status: 'approved',
          registeredAt: new Date().toISOString(),
        };
        setCurrentUser(mappedUser);
        setIsAuthenticated(true);

        if (userRes.wallets) {
          setWallet({
            walletId: userRes.wallets.Wallet_ID,
            userId: userRes.User_ID,
            balance: Number(userRes.wallets.Balance || 0),
            status: 'active',
            updatedAt: userRes.wallets.Updated_At || new Date().toISOString(),
          });
        }

        if (Array.isArray(userRes.user_grants) && userRes.user_grants.length > 0) {
          const g = userRes.user_grants[0];
          setUserGrant(previous => ({
            ...previous,
            grantId: Number(g.Grant_ID || 1),
            userId: userRes.User_ID,
            totalGrantAmount: Number(g.Total_Grant_Amount || 1000),
            remainingAmount: Number(g.Remaining_Amount || 1000),
            status: 'active',
          }));
        }
      }

      const txs = await citizenService.getMyTransactions();
      if (Array.isArray(txs)) {
        setTransactions(txs);
      }

      // Sync Database Stamps, Rewards, Missions, Redemptions, and AI Target Shops
      const [stampsRes, myStampsRes, rewardsRes, missionsRes, redemptionsRes, aiTargetShopsRes] = await Promise.all([
        api.get<DistrictStamp[]>('/district-stamps').catch(() => []),
        api.get<UserStamp[]>('/users/me/stamps').catch(() => []),
        api.get<Reward[]>('/rewards').catch(() => []),
        api.get<Mission[]>('/missions').catch(() => []),
        api.get<StampRedemption[]>('/users/me/stamp-redemptions').catch(() => []),
        api.get<AiTargetShop[]>('/ai/target-shops').catch(() => []),
      ]);

      if (Array.isArray(stampsRes) && stampsRes.length > 0) setDistrictStamps(stampsRes);
      if (Array.isArray(myStampsRes)) setUserStamps(myStampsRes);
      if (Array.isArray(rewardsRes) && rewardsRes.length > 0) setRewards(rewardsRes);
      if (Array.isArray(missionsRes) && missionsRes.length > 0) setMissions(missionsRes);
      if (Array.isArray(redemptionsRes)) setRedemptions(redemptionsRes);
      if (Array.isArray(aiTargetShopsRes) && aiTargetShopsRes.length > 0) setAiTargetShops(aiTargetShopsRes);
    } catch (err: any) {
      console.warn('refreshCitizenData notice:', err);
      if (err?.status === 401 || err?.status === 403) {
        authStorage.removeToken();
        setIsAuthenticated(false);
      }
    }
  }, []);

  useEffect(() => {
    if (authStorage.getToken()) {
      refreshCitizenData();
    }
  }, [refreshCitizenData]);

  // Login Citizen
  const loginCitizen = (citizenId: string, phoneOrOtp?: string, dbUser?: any) => {
    if (dbUser) {
      const mappedUser: User = {
        userId: Number(dbUser.User_ID || Date.now()),
        citizenId: dbUser.Citizen_ID || citizenId,
        name: dbUser.Name || (dbUser.Phone ? `คุณผู้ใช้ ${dbUser.Phone}` : 'ผู้ใช้งานระบบไทยช่วยไทยพลีส'),
        role: 'citizen',
        phone: dbUser.Phone || phoneOrOtp || '',
        provId: Number(dbUser.Province_ID || 1),
        distId: Number(dbUser.Dist_ID || 101),
        status: 'approved',
        registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      setUsers(prev => [mappedUser, ...prev.filter(u => u.userId !== mappedUser.userId)]);
      setCurrentUser(mappedUser);
      setRole('citizen');
      setIsAuthenticated(true);

      if (dbUser.wallets) {
        setWallet(prev => ({
          ...prev,
          walletId: dbUser.wallets.Wallet_ID || prev.walletId,
          userId: Number(dbUser.User_ID),
          balance: Number(dbUser.wallets.Balance || 0),
        }));
      }

      if (Array.isArray(dbUser.user_grants) && dbUser.user_grants.length > 0) {
        const g = dbUser.user_grants[0];
        setUserGrant(previous => ({
          ...previous,
          grantId: g.Grant_ID || 1,
          userId: Number(dbUser.User_ID),
          totalGrantAmount: Number(g.Total_Grant_Amount || 1000),
          remainingAmount: Number(g.Remaining_Amount || 1000),
          status: 'active',
        }));
      }

      // Sync transactions from backend
      fetch('/api/user/me/transactions', {
        headers: authStorage.getToken() ? { Authorization: `Bearer ${authStorage.getToken()}` } : {},
      })
        .then(r => r.json())
        .then(res => {
          if (Array.isArray(res)) {
            setTransactions(res);
          }
        })
        .catch(console.error);

      return { success: true, message: `ยินดีต้อนรับ ${mappedUser.name}`, user: mappedUser };
    }

    const cleanId = citizenId.replace(/[^0-9]/g, '');
    const found = users.find(u => u.citizenId.replace(/[^0-9]/g, '') === cleanId || (phoneOrOtp && u.phone.replace(/[^0-9]/g, '') === phoneOrOtp.replace(/[^0-9]/g, '')));
    if (found) {
      setCurrentUser(found);
      setRole('citizen');
      setIsAuthenticated(true);
      return { success: true, message: `ยินดีต้อนรับ ${found.name}`, user: found };
    }

    // Auto-create for friendly testing if doesn't exist
    const newUser: User = {
      userId: Date.now(),
      citizenId: citizenId.length >= 13 ? citizenId : '1-1037-02948-11-2',
      name: `คุณผู้ใช้ (${phoneOrOtp || citizenId})`,
      role: 'citizen',
      phone: phoneOrOtp || '081-456-7890',
      provId: 1,
      distId: 101,
      status: 'approved',
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    setRole('citizen');
    setIsAuthenticated(true);
    return { success: true, message: `เข้าสู่ระบบสำเร็จในชื่อ ${newUser.name}`, user: newUser };
  };

  // Login Merchant
  const loginMerchant = (phoneOrTax: string, passwordOrPin?: string, mchId?: number) => {
    const cleanPhone = phoneOrTax.replace(/[^0-9]/g, '');
    let target = mchId ? merchants.find(m => m.mchId === mchId) : null;
    if (!target) {
      target = merchants.find(m => m.phone.replace(/[^0-9]/g, '') === cleanPhone || m.promptpayId === cleanPhone);
    }
    if (!target && merchants.length > 0) {
      target = merchants[0];
    }

    if (target && authStorage.getToken()) {
      setRole('merchant');
      setIsAuthenticated(true);
      return { success: true, message: 'เข้าสู่ระบบร้านค้าสำเร็จ', merchant: target };
    }

    if (target) {
      setCurrentMerchant(target);
      const linkedUser = users.find(u => u.userId === target!.userId) || {
        userId: target.userId,
        citizenId: '3-1005-00482-83-1',
        name: target.ownerName,
        role: 'merchant' as Role,
        phone: target.phone,
        provId: target.provId,
        distId: target.distId,
        status: 'approved' as const,
        registeredAt: target.registeredAt
      };
      setCurrentUser(linkedUser);
      setRole('merchant');
      setIsAuthenticated(true);
      return { success: true, message: `เข้าสู่ระบบร้านค้า ${target.shopName}`, merchant: target };
    }

    return { success: false, message: 'กรุณาเข้าสู่ระบบผ่าน API ก่อนใช้งานบัญชีร้านค้า' };
  };

  // Logout
  const logout = () => {
    authStorage.removeToken();
    setIsAuthenticated(false);
  };

  // Update Merchant Profile
  const updateMerchantProfile = async (mchId: number, data: Partial<Merchant>) => {
    if (mchId === currentMerchant?.mchId && authStorage.getToken()) {
      await merchantService.updateProfile({
        ...(data.shopName !== undefined ? { Shop_Name: data.shopName } : {}),
        ...(data.ownerName !== undefined ? { Owner_Name: data.ownerName } : {}),
        ...(data.category !== undefined ? { Category: data.category } : {}),
        ...(data.distId !== undefined ? { Dist_ID: data.distId } : {}),
      });
      await refreshMerchantData();
      return;
    }
    setMerchants(prev =>
      prev.map(m => {
        if (m.mchId === mchId) {
          const updated = { ...m, ...data };
          if (currentMerchant?.mchId === mchId) {
            setCurrentMerchant(updated);
          }
          return updated;
        }
        return m;
      })
    );
  };

  // Update Merchant Pin Location (Lat, Lng, Dist_ID)
  const updateMerchantLocation = async (mchId: number, lat: number, lng: number, address?: string, distId?: number) => {
    if (!getCoordinates(lat, lng)) throw new Error('กรุณาระบุละติจูดและลองจิจูดให้ถูกต้อง');
    if (mchId === currentMerchant?.mchId && authStorage.getToken()) {
      await merchantService.updateProfile({ Lat: lat, Lng: lng, ...(distId ? { Dist_ID: distId } : {}) });
      await refreshMerchantData();
      return;
    }
    setMerchants(prev =>
      prev.map(m => {
        if (m.mchId === mchId) {
          const updated = {
            ...m,
            lat,
            lng,
            ...(address ? { address } : {})
          };
          if (currentMerchant?.mchId === mchId) {
            setCurrentMerchant(updated);
          }
          return updated;
        }
        return m;
      })
    );
  };

  // Citizen Registration
  const registerCitizen = (data: { citizenId: string; name: string; phone: string; provId: number; distId?: number; password?: string }) => {
    const existingIndex = users.findIndex(u => u.citizenId === data.citizenId);
    let newUser: User;
    if (existingIndex >= 0) {
      newUser = {
        ...users[existingIndex],
        name: data.name,
        phone: data.phone,
        provId: data.provId,
        distId: data.distId,
        status: 'approved',
        ...(data.password ? { password: data.password } : {})
      };
      const updated = [...users];
      updated[existingIndex] = newUser;
      setUsers(updated);
    } else {
      newUser = {
        userId: Date.now(),
        citizenId: data.citizenId,
        name: data.name,
        role: 'citizen',
        phone: data.phone,
        provId: data.provId,
        distId: data.distId,
        password: data.password,
        status: 'approved',
        registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      setUsers(prev => [newUser, ...prev]);
    }
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    return newUser;
  };

  // Merchant Registration
  const registerMerchant = (data: {
    shopName: string;
    category: Merchant['category'];
    address: string;
    ownerName: string;
    phone: string;
    provId: number;
    distId: number;
    imageUrl?: string;
    lat?: number;
    lng?: number;
    openingHours?: string;
    description?: string;
  }) => {
    const newMerchant: Merchant = {
      mchId: Date.now(),
      userId: currentUser.userId,
      shopName: data.shopName,
      category: data.category,
      address: data.address,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      distId: data.distId,
      provId: data.provId,
      ownerName: data.ownerName,
      phone: data.phone,
      status: 'pending', // Pending approval by Gov Admin
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
      promptpayId: data.phone.replace(/[^0-9]/g, ''),
      dailyAvgSales: 4000,
      currentDailySales: 0,
      isAiTarget: false,
      openingHours: data.openingHours || '08:00 - 18:00 น.',
      description: data.description || 'ร้านค้าชุมชนเข้าร่วมโครงการไทยช่วยไทยพลีส'
    };

    setMerchants(prev => [newMerchant, ...prev]);
    setCurrentMerchant(newMerchant);
    setIsAuthenticated(true);
    return newMerchant;
  };

  const approveMerchant = (mchId: number) => {
    setMerchants(prev =>
      prev.map(m => (m.mchId === mchId ? { ...m, status: 'approved' } : m))
    );
  };

  const rejectMerchant = (mchId: number) => {
    setMerchants(prev =>
      prev.map(m => (m.mchId === mchId ? { ...m, status: 'rejected' } : m))
    );
  };

  const createMission = (
    mission: Omit<Mission, 'missionId' | 'currentRecipients' | 'completedUserIds'>
  ) => {
    const newMission: Mission = {
      ...mission,
      missionId: Date.now(),
      currentRecipients: 0,
      completedUserIds: []
    };
    setMissions(prev => [newMission, ...prev]);

    // If target shop specified, mark merchant
    if (mission.targetMerchantId) {
      setMerchants(prev =>
        prev.map(m =>
          m.mchId === mission.targetMerchantId ? { ...m, isAiTarget: true } : m
        )
      );
    }

    return newMission;
  };

  // Execute 60/40 Co-payment
  const executePayment = async ({
    merchantId,
    totalAmount,
    note
  }: {
    merchantId: number;
    totalAmount: number;
    note?: string;
  }) => {
    const targetShop = merchants.find(m => m.mchId === merchantId);
    if (!targetShop) {
      return { success: false, message: 'ไม่พบข้อมูลร้านค้าในระบบ' };
    }

    const govRatio = userGrant?.govPayRatio ?? 0.60;
    const requestedGovShare = Math.round(totalAmount * govRatio * 100) / 100;
    const govShare = Math.min(requestedGovShare, userGrant.remainingAmount);
    const userShare = (Math.round(totalAmount * 100) - Math.round(govShare * 100)) / 100;

    if (wallet.balance < userShare) {
      return {
        success: false,
        message: `ยอดเงินในกระเป๋าไม่เพียงพอ (ต้องการ ${userShare.toLocaleString()} บาท มีอยู่ ${wallet.balance.toLocaleString()} บาท) กรุณาเติมเงิน`
      };
    }

    if (userGrant.remainingAmount < govShare) {
      return {
        success: false,
        message: `วงเงินสิทธิรัฐช่วยจ่ายคงเหลือไม่เพียงพอ (คงเหลือ ${userGrant.remainingAmount.toLocaleString()} บาท)`
      };
    }

    // Try Real Backend DB Transaction
    if (authStorage.getToken()) {
      try {
        const res = await citizenService.pay({
          Merchant_ID: merchantId,
          Total_Amount: totalAmount,
          District_ID: targetShop.distId,
        });

        if (res && res.transaction) {
          if (res.wallet) {
            setWallet(prev => ({
              ...prev,
              balance: Number(res.wallet.balance),
              updatedAt: res.wallet.updatedAt || new Date().toISOString(),
            }));
          }
          if (res.grant) {
            setUserGrant(prev => ({
              ...prev,
              remainingAmount: Number(res.grant.remainingAmount),
            }));
          }

          let awardedStamp: DistrictStamp | undefined = undefined;
          if (res.awardedStamp) {
            awardedStamp = districtStamps.find(s => s.stampId === res.awardedStamp.Stamp_ID) || {
              stampId: res.awardedStamp.Stamp_ID,
              stampName: res.awardedStamp.district_stamps?.Stamp_Name || 'แสตมป์ดิจิทัล',
              distName: targetShop.address,
              distId: targetShop.distId,
              provId: targetShop.provId,
              imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
              provName: '',
              iconName: 'stamp',
              rarity: 'common',
              description: 'แสตมป์ดิจิทัลประจำอำเภอ',
              symbolMeaning: '',
            };
          }

          const newTx: SalesTransaction = {
            txId: Number(res.transaction.txId),
            userId: currentUser.userId,
            userName: currentUser.name,
            merchantId,
            merchantName: targetShop.shopName,
            totalAmount,
            userPaidAmount: Number(res.transaction.userPaidAmount),
            govSubsidizedAmount: Number(res.transaction.govSubsidizedAmount),
            txTimestamp: String(res.transaction.txTimestamp),
            distId: targetShop.distId,
            status: 'completed',
            note: note || 'ชำระค่าสินค้าสิทธิ 60/40 (บันทึกลงฐานข้อมูลจริง)',
            earnedStampId: awardedStamp?.stampId,
          };

          setTransactions(prev => [newTx, ...prev]);
          refreshCitizenData().catch(console.warn);

          return {
            success: true,
            message: `ชำระเงินสำเร็จ ฿${totalAmount.toLocaleString()} (คุณจ่าย ฿${newTx.userPaidAmount.toLocaleString()}, รัฐช่วยจ่าย ฿${newTx.govSubsidizedAmount.toLocaleString()})`,
            earnedStamp: awardedStamp,
            tx: newTx,
          };
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'ชำระเงินไม่สำเร็จ' };
      }
      return { success: false, message: 'ชำระเงินไม่สำเร็จ' };
    }

    // Deduct balances (local fallback)
    setWallet(prev => ({
      ...prev,
      balance: Math.round((prev.balance - userShare) * 100) / 100,
      updatedAt: new Date().toISOString()
    }));

    setUserGrant(prev => ({
      ...prev,
      remainingAmount: Math.round((prev.remainingAmount - govShare) * 100) / 100
    }));

    // Update merchant sales
    setMerchants(prev =>
      prev.map(m =>
        m.mchId === merchantId
          ? { ...m, currentDailySales: m.currentDailySales + totalAmount }
          : m
      )
    );

    // Check Missions & Stamps
    // Conditions from doc: Purchase >= 150 THB OR Complete General Mission -> Award Stamp
    let awardedStamp: DistrictStamp | undefined = undefined;
    let matchingMissionId: number | undefined = undefined;

    // Check if there is an active mission for this merchant
    const shopStamp = districtStamps.find(s => s.distId === targetShop.distId);
    const activeMission = shopStamp && missions.find(
      ms =>
        ms.status === 'active' &&
        (ms.targetMerchantId === merchantId || ms.targetDistId === targetShop.distId) &&
        totalAmount >= ms.minSpend &&
        ms.currentRecipients < ms.maxRecipients &&
        !ms.completedUserIds.includes(currentUser.userId)
    );

    if (activeMission) {
      matchingMissionId = activeMission.missionId;
      awardedStamp = shopStamp;

      // Increment mission recipients
      setMissions(prev =>
        prev.map(m =>
          m.missionId === activeMission.missionId
            ? {
                ...m,
                currentRecipients: m.currentRecipients + 1,
                completedUserIds: [...m.completedUserIds, currentUser.userId],
                status: m.currentRecipients + 1 >= m.maxRecipients ? 'completed' : 'active'
              }
            : m
        )
      );
    } else if (totalAmount >= 150) {
      // General rule: Spend >= 150 THB gets a district stamp based on merchant location
      awardedStamp = shopStamp;
    }

    if (awardedStamp) {
      // Add to user stamps
      setUserStamps(prev => {
        const existing = prev.find(us => us.stampId === awardedStamp!.stampId);
        if (existing) {
          return prev.map(us =>
            us.stampId === awardedStamp!.stampId ? { ...us, count: us.count + 1 } : us
          );
        } else {
          return [
            ...prev,
            {
              userStampId: Date.now(),
              userId: currentUser.userId,
              stampId: awardedStamp!.stampId,
              count: 1,
              earnedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              earnSource: matchingMissionId ? 'mission' : 'spend_150',
              qualifyingAmount: totalAmount
            }
          ];
        }
      });
    }

    // Create transaction record
    const newTx: SalesTransaction = {
      txId: Math.floor(100000 + Math.random() * 900000),
      userId: currentUser.userId,
      userName: currentUser.name,
      merchantId,
      merchantName: targetShop.shopName,
      totalAmount,
      userPaidAmount: userShare,
      govSubsidizedAmount: govShare,
      txTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      distId: targetShop.distId,
      status: 'completed',
      note: note || (matchingMissionId ? 'สำเร็จภารกิจและใช้สิทธิ 60/40' : 'ชำระค่าสินค้าสิทธิ 60/40'),
      earnedStampId: awardedStamp?.stampId,
      missionId: matchingMissionId,
    };

    setTransactions(prev => [newTx, ...prev]);

    return {
      success: true,
      message: `ชำระเงินสำเร็จ ฿${totalAmount.toLocaleString()} (คุณจ่าย ฿${userShare.toLocaleString()}, รัฐจ่าย ฿${govShare.toLocaleString()})`,
      earnedStamp: awardedStamp,
      tx: newTx
    };
  };

  // Stamp Redemption for OTOP products or discount vouchers
  const redeemReward = (rewardId: number) => {
    const reward = rewards.find(r => r.rewardId === rewardId);
    if (!reward) return { success: false, message: 'ไม่พบของรางวัล' };

    // Calculate total stamps available
    const totalUserStamps = userStamps.reduce((acc, curr) => acc + curr.count, 0);

    if (totalUserStamps < reward.requiredStampCount) {
      return {
        success: false,
        message: `จำนวนแสตมป์ไม่เพียงพอ (ต้องการ ${reward.requiredStampCount} ดวง คุณมี ${totalUserStamps} ดวง)`
      };
    }

    // Check if requires specific stamp
    let targetStampId = reward.stampIdRequired;
    if (targetStampId) {
      const specific = userStamps.find(s => s.stampId === targetStampId && s.count >= reward.requiredStampCount);
      if (!specific) {
        return {
          success: false,
          message: `ของรางวัลนี้ต้องการแสตมป์เฉพาะพื้นที่ ${reward.provinceName} จำนวน ${reward.requiredStampCount} ดวง`
        };
      }
    }

    // Deduct stamps
    let needed = reward.requiredStampCount;
    setUserStamps(prev => {
      return prev
        .map(us => {
          if (needed <= 0) return us;
          if (targetStampId && us.stampId !== targetStampId) return us;
          const deduct = Math.min(us.count, needed);
          needed -= deduct;
          return { ...us, count: us.count - deduct };
        })
        .filter(us => us.count > 0);
    });

    // Update reward stock
    setRewards(prev =>
      prev.map(r => (r.rewardId === rewardId ? { ...r, remainingStock: r.remainingStock - 1 } : r))
    );

    // Save to Database
    if (authStorage.getToken()) {
      try {
        const stampId = targetStampId || userStamps[0]?.stampId || 1;
        api.post('/stamp-redemptions', {
          Reward_ID: rewardId,
          Stamp_ID: stampId,
          Quantity: 1,
        }).then(() => refreshCitizenData()).catch(console.warn);
      } catch (e) {
        console.warn('Real redeem error:', e);
      }
    }
    const redemptionCode = `THAI-REWARD-${reward.rewardId}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRedemption: StampRedemption = {
      redemptionId: Date.now(),
      userId: currentUser.userId,
      userName: currentUser.name,
      rewardId: reward.rewardId,
      rewardName: reward.rewardName,
      stampId: targetStampId || userStamps[0]?.stampId || 1,
      quantity: 1,
      status: 'ready_to_use',
      redeemedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      redemptionCode
    };

    setRedemptions(prev => [newRedemption, ...prev]);

    return {
      success: true,
      message: `แลกรับ ${reward.rewardName} สำเร็จ! รหัสรับสิทธิ์: ${redemptionCode}`,
      redemption: newRedemption
    };
  };

  // Stamp Trading
  const tradeStamp = (stampId: number, targetName: string) => {
    const userStamp = userStamps.find(s => s.stampId === stampId && s.count > 0);
    if (!userStamp) {
      return { success: false, message: 'คุณไม่มีแสตมป์ดวงนี้' };
    }

    setUserStamps(prev =>
      prev
        .map(s => (s.stampId === stampId ? { ...s, count: s.count - 1 } : s))
        .filter(s => s.count > 0)
    );

    return {
      success: true,
      message: `ส่งมอบแสตมป์ให้แก่ ${targetName} เรียบร้อยแล้ว`
    };
  };

  const topupWallet = async (amount: number = 500) => {
    if (authStorage.getToken()) {
      try {
        const res = await citizenService.topupWallet(amount);
        const newBal = res?.wallet?.balance;
        if (newBal !== undefined) {
          setWallet(prev => ({
            ...prev,
            balance: Number(newBal),
            updatedAt: res?.wallet?.updatedAt || new Date().toISOString(),
          }));
          return;
        }
      } catch (e) {
        console.warn('Real topup API warning, using local state:', e);
      }
    }
    setWallet(prev => ({
      ...prev,
      balance: Math.round((prev.balance + amount) * 100) / 100,
      updatedAt: new Date().toISOString()
    }));
  };

  const withdrawMerchantWallet = async (amount: number, promptpayOrAccount?: string): Promise<{ success: boolean; message: string; newBalance?: number }> => {
    if (authStorage.getToken()) {
      try {
        const res = await merchantService.withdrawWallet(amount, promptpayOrAccount);
        await refreshMerchantData();
        return { success: true, message: res.message, newBalance: res.newBalance };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการถอนเงิน'
        };
      }
    }

    const balance = currentMerchant.walletBalance ?? (currentMerchant.wallet ? Number(currentMerchant.wallet.balance) : 0);
    if (balance < amount) {
      return { success: false, message: 'ยอดเงินในกระเป๋าไม่เพียงพอ' };
    }

    const newBalance = Math.round((balance - amount) * 100) / 100;
    const updatedMch = {
      ...currentMerchant,
      walletBalance: newBalance,
      wallet: {
        walletId: currentMerchant.wallet?.walletId ?? (1000 + currentMerchant.mchId),
        merchantId: currentMerchant.mchId,
        balance: newBalance,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString()
      }
    };
    setCurrentMerchant(updatedMch);
    setMerchants(prev => prev.map(m => m.mchId === updatedMch.mchId ? updatedMch : m));

    return {
      success: true,
      message: 'ถอนเงินจำนวน ฿' + amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' สำเร็จ เข้าบัญชี/พร้อมเพย์ ' + (promptpayOrAccount || currentMerchant.phone),
      newBalance
    };
  };

  // Compute Social Impact Metrics as in Section 5.5
  const getMetrics = (): SocialImpactMetrics => {
    const totalTransactionVolume = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
    const govSubsidizedTotal = transactions.reduce((acc, t) => acc + t.govSubsidizedAmount, 0);
    const userSpentTotal = transactions.reduce((acc, t) => acc + t.userPaidAmount, 0);
    const stampsIssued = transactions.filter(t => t.earnedStampId).length + 5;
    const stampsRedeemed = redemptions.length;
    const completedMissionsCount = missions.reduce((acc, m) => acc + m.currentRecipients, 0);

    return {
      participatingShops: merchants.filter(m => m.status === 'approved').length,
      totalTransactionVolume,
      govSubsidizedTotal,
      userSpentTotal,
      lowSalesRecoveryRate: 84.5,
      activeMissions: missions.filter(m => m.status === 'active').length,
      completedMissionsCount,
      stampsIssued,
      stampsRedeemed,
      otopRedemptionVolume: redemptions.length * 350 + 1200
    };
  };

  const triggerAIReanalysis = () => {
    setAiAnalysis(prev =>
      prev.map(item => {
        const mch = merchants.find(m => m.mchId === item.merchantId);
        const currentSales = mch ? mch.currentDailySales : item.salesAmount;
        const ratio = mch ? currentSales / mch.dailyAvgSales : item.salesRatio;
        const isLow = ratio < 0.70;
        return {
          ...item,
          salesAmount: currentSales,
          salesRatio: Math.round(ratio * 100) / 100,
          salesStatus: ratio < 0.5 ? 'critical_low' : ratio < 0.7 ? 'low' : ratio < 1.1 ? 'normal' : 'thriving',
          boostRecommended: isLow,
          analyzedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      })
    );
  };

  const resetAllData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_merchants`);
    localStorage.removeItem(`${STORAGE_KEY}_transactions`);
    localStorage.removeItem(`${STORAGE_KEY}_missions`);
    localStorage.removeItem(`${STORAGE_KEY}_user_stamps`);
    localStorage.removeItem(`${STORAGE_KEY}_wallet`);
    localStorage.removeItem(`${STORAGE_KEY}_grant`);
    localStorage.removeItem(`${STORAGE_KEY}_redemptions`);
    localStorage.removeItem(`${STORAGE_KEY}_ai`);

    setMerchants(INITIAL_MERCHANTS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setCurrentMerchant(INITIAL_MERCHANTS[0]);
    setTransactions(INITIAL_TRANSACTIONS);
    setMissions(INITIAL_MISSIONS);
    setAiAnalysis(INITIAL_AI_ANALYSIS);
    setUserStamps(INITIAL_USER_STAMPS);
    setRewards(INITIAL_REWARDS);
    setRedemptions(INITIAL_REDEMPTIONS);
    setWallet(INITIAL_WALLET);
    setUserGrant(INITIAL_USER_GRANT);
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        viewMode,
        setViewMode,
        users,
        currentUser,
        setCurrentUser,
        merchants,
        currentMerchant,
        setCurrentMerchant,
        transactions,
        aiAnalysis,
        missions,
        districtStamps,
        userStamps,
        rewards,
        redemptions,
        wallet,
        userGrant,
        aiTargetShops,
        isAuthenticated,
        setIsAuthenticated,
        loginCitizen,
        loginMerchant,
        logout,
        updateMerchantProfile,
        updateMerchantLocation,
        refreshMerchantData,
        refreshCitizenData,
        registerCitizen,
        registerMerchant,
        approveMerchant,
        rejectMerchant,
        createMission,
        executePayment,
        redeemReward,
        tradeStamp,
        topupWallet,
        withdrawMerchantWallet,
        getMetrics,
        resetAllData,
        triggerAIReanalysis
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
