import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { BottomNav } from './components/layout';
import { CitizenMobilePage } from './pages/citizen/CitizenMobilePage';
import { CitizenAuthView } from './components/citizen/CitizenAuthView';

// Citizen Pages & Views
import { CitizenServicesHubPage } from './pages/citizen/CitizenServicesHubPage';
import { CitizenProfilePage } from './pages/citizen/CitizenProfilePage';
import { CitizenStatementScreen } from './components/citizen/CitizenStatementScreen';
import { CitizenQrModal } from './components/citizen/CitizenQrModal';
import { StoreMapPickerModal } from './components/merchant/StoreMapPickerModal';

// Citizen Modals
import { QRScannerModal } from './components/citizen/QRScannerModal';
import { CitizenRegistrationModal } from './components/citizen/CitizenRegistrationModal';
import { CitizenProfileModal } from './components/citizen/CitizenProfileModal';
import { MyVouchersModal } from './components/citizen/MyVouchersModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const AppContent: React.FC = () => {
  const { isAuthenticated, redemptions, setRole } = useApp();

  const [activeNav, setActiveNav] = useState('หน้าหลัก');
  const [globalScannerOpen, setGlobalScannerOpen] = useState(false);
  const [globalStatusOpen, setGlobalStatusOpen] = useState(false);
  const [globalProfileOpen, setGlobalProfileOpen] = useState(false);
  const [globalMapOpen, setGlobalMapOpen] = useState(false);
  const [globalVouchersOpen, setGlobalVouchersOpen] = useState(false);
  const [globalQrOpen, setGlobalQrOpen] = useState(false);
  const [globalStatementOpen, setGlobalStatementOpen] = useState(false);
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
    } else if (label === 'ของรางวัล' || label === 'คูปอง') {
      setGlobalVouchersOpen(true);
    } else if (label === 'โปรไฟล์' || label === 'บัญชี' || label === 'เข้าสู่ระบบ') {
      setGlobalStatementOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (label === 'หน้าหลัก') {
      setGlobalStatementOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

        {/* Content: First-time Citizen Auth View OR Logged-in Citizen Page */}
        <div className="flex-1 flex flex-col">
          {!isAuthenticated ? (
            <CitizenAuthView />
          ) : (
            <>
              {globalStatementOpen ? (
                <CitizenStatementScreen onBack={() => setGlobalStatementOpen(false)} />
              ) : activeNav === 'บริการทั้งหมด' ? (
                <CitizenServicesHubPage
                  onOpenScanner={() => setGlobalScannerOpen(true)}
                  onOpenMyQr={() => setGlobalQrOpen(true)}
                  onOpenStatement={() => setGlobalStatementOpen(true)}
                  onOpenStatus={() => setGlobalStatusOpen(true)}
                  onOpenVouchers={() => setGlobalVouchersOpen(true)}
                  onOpenProfile={() => setActiveNav('โปรไฟล์')}
                  onOpenMap={(shopId) => setGlobalShopMapId(shopId || 1)}
                  onGoToTab={() => {
                    setActiveNav('หน้าหลัก');
                  }}
                />
              ) : activeNav === 'โปรไฟล์' ? (
                <CitizenProfilePage
                  onBack={() => setActiveNav('หน้าหลัก')}
                  onOpenStatement={() => setGlobalStatementOpen(true)}
                  onOpenStatus={() => setGlobalStatusOpen(true)}
                  onOpenVouchers={() => setGlobalVouchersOpen(true)}
                  onOpenMyQr={() => setGlobalQrOpen(true)}
                  onGoToTab={(tab) => setActiveNav(tab)}
                />
              ) : (
                <CitizenMobilePage />
              )}
              {/* Fixed Bottom Navigation Bar (Citizen Only) */}
              <BottomNav
                role="citizen"
                activeNav={activeNav}
                onNavClick={handleNavClick}
              />
            </>
          )}
        </div>
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
        isOpen={globalProfileOpen}
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

      <StoreMapPickerModal
        isOpen={globalShopMapId !== null}
        onClose={() => setGlobalShopMapId(null)}
        mchId={globalShopMapId ?? undefined}
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
