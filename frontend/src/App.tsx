import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RoleSwitcherBar, BottomNav } from './components/layout';
import { CitizenMobilePage } from './pages/citizen/CitizenMobilePage';
import { MerchantMobilePage } from './pages/merchant/MerchantMobilePage';
import { MerchantRevenuePage } from './pages/merchant/MerchantRevenuePage';
import { AdminPortalPage } from './pages/admin/AdminPortalPage';

// Modals
import { QRScannerModal } from './components/citizen/QRScannerModal';
import { QRGeneratorModal } from './components/merchant/QRGeneratorModal';
import { CitizenRegistrationModal } from './components/citizen/CitizenRegistrationModal';
import { AuthModal } from './components/auth/AuthModal';
import { MerchantProfileSettingsModal } from './components/merchant/MerchantProfileSettingsModal';
import { StoreMapPickerModal } from './components/merchant/StoreMapPickerModal';

const AppContent: React.FC = () => {
  const {
    role,
    setRole,
    resetAllData,
    currentUser,
    currentMerchant,
    isAuthenticated,
  } = useApp();

  const [activeNav, setActiveNav] = useState('หน้าหลัก');
  const [globalScannerOpen, setGlobalScannerOpen] = useState(false);
  const [globalQrGenOpen, setGlobalQrGenOpen] = useState(false);
  const [globalStatusOpen, setGlobalStatusOpen] = useState(false);
  const [globalAuthOpen, setGlobalAuthOpen] = useState(false);
  const [globalProfileOpen, setGlobalProfileOpen] = useState(false);
  const [globalMapOpen, setGlobalMapOpen] = useState(false);

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
    } else if (label === 'ยอดขาย') {
      // Navigates directly to dedicated full page
    } else if (label === 'สถานะ' || label === 'สิทธิ์ 60/40') {
      setGlobalStatusOpen(true);
    } else if (label === 'เข้าสู่ระบบ' || label === 'ยืนยันตัวตน') {
      setGlobalAuthOpen(true);
    } else if (label === 'ตั้งค่าร้าน' || label === 'โปรไฟล์') {
      setGlobalProfileOpen(true);
    } else if (label === 'ปักหมุดร้าน' || label === 'พิกัด') {
      setGlobalMapOpen(true);
    } else if (label === 'สลับบทบาท') {
      setActiveNav('หน้าหลัก');
      if (role === 'citizen') setRole('merchant');
      else if (role === 'merchant') setRole('admin');
      else setRole('citizen');
    }
  };

  return (
    <main className="min-h-screen bg-[#f1f5fb] text-[#14213d] flex flex-col items-center justify-start py-0 md:py-4">
      {/* 430px Mobile Frame Shell */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#f8faff] shadow-2xl relative flex flex-col overflow-hidden md:rounded-[40px] md:border-4 md:border-slate-300/40">
        
        {/* Dynamic Island on Desktop frame */}
        <div className="hidden md:flex justify-center pt-2 pb-1 bg-slate-900 select-none">
          <div className="w-24 h-4 bg-black rounded-full" />
        </div>

        {/* Top Sticky Bar: Role Switcher & Feature Shortcuts */}
        <RoleSwitcherBar
          role={role}
          currentUser={currentUser}
          currentMerchant={currentMerchant}
          isAuthenticated={isAuthenticated}
          onSelectRole={handleRoleSelect}
          onReset={resetAllData}
          onOpenAuth={() => setGlobalAuthOpen(true)}
          onOpenRevenue={() => setActiveNav('ยอดขาย')}
          onOpenProfile={() => setGlobalProfileOpen(true)}
          onOpenMap={() => setGlobalMapOpen(true)}
          onOpenStatus={() => setGlobalStatusOpen(true)}
        />

        {/* Dynamic Active Role View from Pages */}
        <div className="flex-1">
          {role === 'citizen' && <CitizenMobilePage />}
          {role === 'merchant' && (
            activeNav === 'ยอดขาย' ? (
              <MerchantRevenuePage onBack={() => setActiveNav('หน้าหลัก')} />
            ) : (
              <MerchantMobilePage onOpenRevenuePage={() => setActiveNav('ยอดขาย')} />
            )
          )}
          {role === 'admin' && <AdminPortalPage />}
        </div>

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav
          role={role}
          activeNav={activeNav}
          onNavClick={handleNavClick}
        />
      </div>

      {/* Global Modals */}
      <QRScannerModal
        isOpen={globalScannerOpen}
        onClose={() => setGlobalScannerOpen(false)}
      />

      <QRGeneratorModal
        isOpen={globalQrGenOpen}
        onClose={() => setGlobalQrGenOpen(false)}
      />

      <CitizenRegistrationModal
        isOpen={globalStatusOpen}
        onClose={() => setGlobalStatusOpen(false)}
      />

      <AuthModal
        isOpen={globalAuthOpen}
        onClose={() => setGlobalAuthOpen(false)}
        defaultRole={role === 'merchant' ? 'merchant' : 'citizen'}
      />

      <MerchantProfileSettingsModal
        isOpen={globalProfileOpen}
        onClose={() => setGlobalProfileOpen(false)}
      />

      <StoreMapPickerModal
        isOpen={globalMapOpen}
        onClose={() => setGlobalMapOpen(false)}
        mchId={currentMerchant?.mchId}
      />
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
