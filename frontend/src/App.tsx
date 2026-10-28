import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RoleSwitcherBar, BottomNav } from './components/layout';
import { CitizenMobilePage } from './pages/citizen/CitizenMobilePage';
import { MerchantMobilePage } from './pages/merchant/MerchantMobilePage';
import { MerchantRevenuePage } from './pages/merchant/MerchantRevenuePage';
import { MerchantWalletPage } from './pages/merchant/MerchantWalletPage';
import { AdminDesktopShell } from './components/admin/AdminDesktopShell';
import { AuthPage } from './pages/auth/AuthPage';

// Citizen Pages & Views
import { CitizenServicesHubPage } from './pages/citizen/CitizenServicesHubPage';
import { CitizenProfilePage } from './pages/citizen/CitizenProfilePage';
import { CitizenRewardsPage } from './pages/citizen/CitizenRewardsPage';
import { CitizenStatementScreen } from './components/citizen/CitizenStatementScreen';
import { CitizenQrModal } from './components/citizen/CitizenQrModal';
import { StoreMapPickerModal } from './components/merchant/StoreMapPickerModal';

import { QRScannerModal } from './components/citizen/QRScannerModal';
import { QRGeneratorModal } from './components/merchant/QRGeneratorModal';
import { CitizenRegistrationModal } from './components/citizen/CitizenRegistrationModal';
import { CitizenProfileModal } from './components/citizen/CitizenProfileModal';
import { MyVouchersModal } from './components/citizen/MyVouchersModal';
import { AuthModal } from './components/auth/AuthModal';
import { MerchantProfileSettingsModal } from './components/merchant/MerchantProfileSettingsModal';
import { StampPassportModal } from './components/citizen/StampPassportModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const AppContent: React.FC = () => {
  const {
    role,
    setRole,
    resetAllData,
    currentUser,
    currentMerchant,
    isAuthenticated,
    logout,
    redemptions,
  } = useApp();

  const [activeNav, setActiveNav] = useState('หน้าหลัก');
  const [citizenTab, setCitizenTab] = useState<'home' | 'missions' | 'wallet'>('home');
  const [globalScannerOpen, setGlobalScannerOpen] = useState(false);
  const [globalStatusOpen, setGlobalStatusOpen] = useState(false);
  const [globalQrGenOpen, setGlobalQrGenOpen] = useState(false);
  const [globalAuthOpen, setGlobalAuthOpen] = useState(false);
  const [globalProfileOpen, setGlobalProfileOpen] = useState(false);
  const [globalMapOpen, setGlobalMapOpen] = useState(false);
  const [globalVouchersOpen, setGlobalVouchersOpen] = useState(false);
  const [globalQrOpen, setGlobalQrOpen] = useState(false);
  const [globalStatementOpen, setGlobalStatementOpen] = useState(false);
  const [globalPassportOpen, setGlobalPassportOpen] = useState(false);
  const [globalShopMapId, setGlobalShopMapId] = useState<number | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'admin') setRole('admin');
  }, [setRole]);

  const handleRoleSelect = (selected: 'ประชาชน' | 'ร้านค้า' | 'ภาครัฐ') => {
    setActiveNav('หน้าหลัก');
    if (selected === 'ประชาชน') setRole('citizen');
    else if (selected === 'ร้านค้า') setRole('merchant');
    else setRole('admin');
  };

  const handleNavClick = (label: string) => {
    setActiveNav(label);
    if (label === 'สแกนจ่าย' || label === 'สแกน') {
      setGlobalScannerOpen(true);
    } else if (label === 'สร้าง QR') {
      setGlobalQrGenOpen(true);
    } else if (label === 'ถุงเงิน' || label === 'กระเป๋าเงิน') {
      // Navigates directly to dedicated Merchant Wallet page
    } else if (label === 'ยอดขาย') {
      // Navigates directly to dedicated full page
    } else if (label === 'ของรางวัล' || label === 'คูปอง') {
      setActiveNav('ของรางวัล');
      setGlobalStatementOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (label === 'สถานะ' || label === 'สิทธิ์ 60/40') {
      setGlobalStatusOpen(true);
    } else if (label === 'ออกจากระบบ') {
      logout();
      setActiveNav('หน้าหลัก');
    } else if (label === 'เข้าสู่ระบบ' || label === 'ยืนยันตัวตน') {
      if (isAuthenticated) {
        logout();
        setActiveNav('หน้าหลัก');
      } else {
        setGlobalAuthOpen(true);
      }
    } else if (label === 'ตั้งค่าร้าน') {
      setGlobalProfileOpen(true);
    } else if (label === 'โปรไฟล์' || label === 'บัญชี') {
      if (role === 'merchant') {
        setGlobalProfileOpen(true);
      } else {
        setGlobalStatementOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (label === 'บริการทั้งหมด') {
      setGlobalStatementOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (label === 'หน้าหลัก') {
      setActiveNav('หน้าหลัก');
      setCitizenTab('home');
      setGlobalStatementOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (label === 'ปักหมุดร้าน' || label === 'พิกัด') {
      setGlobalMapOpen(true);
    } else if (label === 'สลับบทบาท') {
      setActiveNav('หน้าหลัก');
      if (role === 'citizen') setRole('merchant');
      else if (role === 'merchant') setRole('admin');
      else setRole('citizen');
    }
  };

  // Admin: full-screen desktop layout, no mobile shell
  if (role === 'admin') {
    return <AdminDesktopShell />;
  }

  // First screen must be Login / Register Page before accessing Citizen or Merchant
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f1f5fb] text-[#14213d] flex flex-col items-center justify-start py-0 md:py-4">
        <div className="w-full max-w-[430px] min-h-screen bg-[#f8faff] shadow-2xl relative flex flex-col overflow-y-auto md:rounded-[40px] md:border-4 md:border-slate-300/40">
          <div className="hidden md:flex justify-center pt-2 pb-1 bg-slate-900 select-none">
            <div className="w-24 h-4 bg-black rounded-full" />
          </div>
          <AuthPage
            defaultRole={role === 'merchant' ? 'merchant' : 'citizen'}
            onSuccess={(loggedRole) => {
              setRole(loggedRole);
              setActiveNav('หน้าหลัก');
            }}
            onGoToAdmin={() => setRole('admin')}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f1f5fb] text-[#14213d] flex flex-col items-center justify-start py-0 md:py-4">
      {/* 430px Mobile Frame Shell */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#f8faff] shadow-2xl relative flex flex-col overflow-hidden md:rounded-[40px] md:border-4 md:border-slate-300/40">

        {/* Dynamic Island on Desktop frame */}
        <div className="hidden md:flex justify-center pt-2 pb-1 bg-slate-900 select-none">
          <div className="w-24 h-4 bg-black rounded-full" />
        </div>



        {/* Dynamic Active Role View from Pages */}
        <div className="flex-1 flex flex-col">
          {role === 'citizen' && (
            <>
              {globalStatementOpen ? (
                <CitizenStatementScreen onBack={() => setGlobalStatementOpen(false)} />
              ) : activeNav === 'ของรางวัล' ? (
                <CitizenRewardsPage
                  onBack={() => setActiveNav('หน้าหลัก')}
                  onOpenPassport={() => setGlobalPassportOpen(true)}
                  onOpenVouchers={() => setGlobalVouchersOpen(true)}
                />
              ) : activeNav === 'บริการทั้งหมด' ? (
                <CitizenServicesHubPage
                  onOpenScanner={() => setGlobalScannerOpen(true)}
                  onOpenMyQr={() => setGlobalQrOpen(true)}
                  onOpenStatement={() => setGlobalStatementOpen(true)}
                  onOpenStatus={() => setGlobalStatusOpen(true)}
                  onOpenVouchers={() => setGlobalVouchersOpen(true)}
                  onOpenProfile={() => setActiveNav('โปรไฟล์')}
                  onOpenPassport={() => setGlobalPassportOpen(true)}
                  onOpenRewards={() => setActiveNav('ของรางวัล')}
                  onOpenMap={(shopId) => {
                    setGlobalShopMapId(shopId || 1);
                    setGlobalMapOpen(true);
                  }}
                  onGoToTab={(tab) => {
                    setCitizenTab(tab);
                    setActiveNav('หน้าหลัก');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ) : activeNav === 'โปรไฟล์' ? (
                <CitizenProfilePage
                  onBack={() => setActiveNav('หน้าหลัก')}
                  onOpenStatement={() => setGlobalStatementOpen(true)}
                  onOpenStatus={() => setGlobalStatusOpen(true)}
                  onOpenVouchers={() => setGlobalVouchersOpen(true)}
                  onOpenMyQr={() => setGlobalQrOpen(true)}
                  onGoToTab={(tab) => {
                    if (tab === 'missions' || tab === 'wallet' || tab === 'home') {
                      setCitizenTab(tab);
                    }
                    setActiveNav('หน้าหลัก');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ) : (
                <CitizenMobilePage
                  activeTab={citizenTab}
                  onTabChange={setCitizenTab}
                  onOpenPassport={() => setGlobalPassportOpen(true)}
                />
              )}
            </>
          )}

          {role === 'merchant' && (
            activeNav === 'ยอดขาย' ? (
              <MerchantRevenuePage onBack={() => setActiveNav('หน้าหลัก')} />
            ) : activeNav === 'ถุงเงิน' || activeNav === 'กระเป๋าเงิน' ? (
              <MerchantWalletPage
                onBack={() => setActiveNav('หน้าหลัก')}
                onOpenRevenue={() => setActiveNav('ยอดขาย')}
              />
            ) : (
              <MerchantMobilePage
                onOpenRevenuePage={() => setActiveNav('ยอดขาย')}
                onOpenWalletPage={() => setActiveNav('ถุงเงิน')}
              />
            )
          )}
        </div>

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav
          role={role}
          activeNav={activeNav}
          onNavClick={handleNavClick}
        />
      </div>

      {/* Global Citizen Modals */}
      <QRScannerModal
        isOpen={globalScannerOpen}
        onClose={() => setGlobalScannerOpen(false)}
      />

      <CitizenRegistrationModal
        isOpen={globalStatusOpen}
        onClose={() => setGlobalStatusOpen(false)}
      />

      <CitizenProfileModal
        isOpen={globalProfileOpen && role === 'citizen'}
        onClose={() => setGlobalProfileOpen(false)}
      />

      <MyVouchersModal
        isOpen={globalVouchersOpen}
        onClose={() => setGlobalVouchersOpen(false)}
        redemptions={redemptions}
      />

      <CitizenQrModal
        isOpen={globalQrOpen}
        onClose={() => setGlobalQrOpen(false)}
      />

      <StampPassportModal
        isOpen={globalPassportOpen}
        onClose={() => setGlobalPassportOpen(false)}
        onGoToRewards={() => {
          setGlobalPassportOpen(false);
          setActiveNav('ของรางวัล');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenMapWithDistrict={(_distId) => {
          setGlobalPassportOpen(false);
          setGlobalMapOpen(true);
        }}
      />

      {/* Global Merchant Modals */}
      <QRGeneratorModal
        isOpen={globalQrGenOpen}
        onClose={() => setGlobalQrGenOpen(false)}
      />

      <MerchantProfileSettingsModal
        isOpen={globalProfileOpen && role === 'merchant'}
        onClose={() => setGlobalProfileOpen(false)}
      />

      <StoreMapPickerModal
        isOpen={globalMapOpen || globalShopMapId !== null}
        onClose={() => {
          setGlobalMapOpen(false);
          setGlobalShopMapId(null);
        }}
        mchId={globalShopMapId ?? undefined}
      />

      <AuthModal
        isOpen={globalAuthOpen}
        onClose={() => setGlobalAuthOpen(false)}
      />
    </main>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
