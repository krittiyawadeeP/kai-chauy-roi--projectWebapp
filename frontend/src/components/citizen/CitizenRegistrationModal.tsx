import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { INITIAL_PROVINCES, INITIAL_DISTRICTS } from '../../mock/initialData';
import { Icon } from '../common/Icon';

interface CitizenRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenRegistrationModal: React.FC<CitizenRegistrationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, registerCitizen, userGrant, users } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | 'register'>('status');
  const [citizenId, setCitizenId] = useState<string>(currentUser?.citizenId || '');
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [provId, setProvId] = useState<number>(currentUser?.provId || 1);
  const [distId, setDistId] = useState<number>(currentUser?.distId || 101);
  const [searchId, setSearchId] = useState<string>('');
  const [searchResult, setSearchResult] = useState<typeof currentUser | null>(currentUser);
  const [successNotice, setSuccessNotice] = useState<string>('');

  if (!isOpen) return null;

  const filteredDistricts = INITIAL_DISTRICTS.filter(d => d.provId === provId);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenId || citizenId.length < 13) {
      alert('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก');
      return;
    }
    const user = registerCitizen({
      citizenId,
      name,
      phone,
      provId,
      distId
    });
    setSearchResult(user);
    setSuccessNotice('ลงทะเบียนและตรวจสอบสิทธิ์สำเร็จ! ระบบเปิดใช้งานสิทธิ 60/40 เรียบร้อยแล้ว');
    setTimeout(() => {
      setActiveTab('status');
      setSuccessNotice('');
    }, 1500);
  };

  const handleSearchStatus = () => {
    const found = users.find(u => u.citizenId.replace(/[^0-9]/g, '') === searchId.replace(/[^0-9]/g, ''));
    if (found) {
      setSearchResult(found);
    } else {
      alert('ไม่พบข้อมูลการลงทะเบียนสำหรับเลขประจำตัวประชาชนนี้');
    }
  };

  const currentDisplayUser = searchResult || currentUser;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#07162d]/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf2ff] text-[#1769ed]">
              <Icon name="shield" className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800">ตรวจสอบและลงทะเบียนสิทธิ์</h3>
              <p className="text-[10px] text-slate-400">โครงการไทยช่วยไทยพลีส</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#e8effa] p-1 rounded-2xl text-xs font-bold text-slate-600 my-3">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'status' ? 'bg-white text-[#123b84] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            ติดตามสถานะ
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeTab === 'register' ? 'bg-white text-[#123b84] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            ลงทะเบียนใหม่
          </button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {activeTab === 'status' ? (
            <div className="space-y-4 text-xs">
              {/* Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ค้นหาเลขบัตรประชาชน 13 หลัก"
                  value={searchId}
                  onChange={e => setSearchId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                />
                <button
                  onClick={handleSearchStatus}
                  className="px-3 py-2 bg-[#1769ed] text-white rounded-xl font-bold flex items-center gap-1 hover:bg-blue-700"
                >
                  <Icon name="search" className="size-3.5" />
                  <span>ค้นหา</span>
                </button>
              </div>

              {currentDisplayUser && (
                <div className="rounded-[22px] bg-[#f8faff] p-4 border border-blue-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-slate-400">ผู้มีสิทธิ์</p>
                      <h4 className="font-bold text-sm text-slate-800">{currentDisplayUser.name}</h4>
                      <p className="font-mono text-[11px] text-slate-500">{currentDisplayUser.citizenId}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">
                      อนุมัติแล้ว
                    </span>
                  </div>

                  {/* 3 Steps Timeline matching snippet */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-slate-400 mb-2">ขั้นตอนการตรวจสอบสิทธิ์</p>
                    <div className="grid grid-cols-3">
                      {['ลงทะเบียน', 'ตรวจสอบข้อมูล', 'อนุมัติแล้ว'].map((label, i) => (
                        <div key={label} className="relative text-center">
                          <span
                            className={`relative z-10 mx-auto grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                              i < 3 ? 'bg-[#1769ed] text-white' : 'bg-slate-200'
                            }`}
                          >
                            ✓
                          </span>
                          {i < 2 && (
                            <span className="absolute left-1/2 top-3 h-0.5 w-full bg-[#1769ed]" />
                          )}
                          <span className="mt-2 block text-[10px] font-medium text-slate-500">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">วงเงินสิทธิรัฐช่วยจ่าย 40%:</span>
                    <strong className="text-emerald-600">฿ {userGrant.remainingAmount.toLocaleString()}</strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              {successNotice && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-medium">
                  {successNotice}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  เลขประจำตัวประชาชน 13 หลัก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="x-xxxx-xxxxx-xx-x"
                  value={citizenId}
                  onChange={e => setCitizenId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายกิตติคุณ ศรีสวัสดิ์"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  เบอร์โทรศัพท์สำหรับรับ SMS *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="081-456-7890"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1769ed]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">จังหวัด</label>
                  <select
                    value={provId}
                    onChange={e => {
                      const p = Number(e.target.value);
                      setProvId(p);
                      const d = INITIAL_DISTRICTS.find(dist => dist.provId === p);
                      if (d) setDistId(d.distId);
                    }}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    {INITIAL_PROVINCES.map(p => (
                      <option key={p.provId} value={p.provId}>{p.provName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">อำเภอ/เขต</label>
                  <select
                    value={distId}
                    onChange={e => setDistId(Number(e.target.value))}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    {filteredDistricts.map(d => (
                      <option key={d.distId} value={d.distId}>{d.distName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1769ed] hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all mt-2"
              >
                ยืนยันลงทะเบียนรับสิทธิ์
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
