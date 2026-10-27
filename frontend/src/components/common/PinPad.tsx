import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface PinPadProps {
  title?: string;
  subtitle?: string;
  error?: string;
  loading?: boolean;
  onComplete: (pin: string) => void | Promise<void>;
  onCancel?: () => void;
  length?: number;
  themeColor?: string;
}

export const PinPad: React.FC<PinPadProps> = ({
  title = 'กรุณาใส่รหัส PIN 6 หลัก',
  subtitle,
  error = '',
  loading = false,
  onComplete,
  onCancel,
  length = 6,
  themeColor = '#1769ed',
}) => {
  const [pin, setPin] = useState<string>('');
  const [localError, setLocalError] = useState<string>(error);

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleDigit = (digit: string) => {
    if (loading || pin.length >= length) return;
    setLocalError('');
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === length) {
      onComplete(newPin);
    }
  };

  const handleBackspace = () => {
    if (loading || pin.length === 0) return;
    setLocalError('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
    setLocalError('');
  };

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading]);

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto py-2">
      {/* Title & Subtitle */}
      <div className="text-center mb-4">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-[#1769ed] mb-2 shadow-sm">
          <Icon name="lock" className="size-6" />
        </div>
        <h3 className="font-bold text-base text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {/* 6 Dots Indicator */}
      <div className="flex items-center justify-center gap-3.5 my-3">
        {Array.from({ length }).map((_, idx) => {
          const filled = idx < pin.length;
          return (
            <div
              key={idx}
              className={`size-3.5 rounded-full transition-all duration-200 ${
                filled
                  ? 'scale-110 shadow-sm'
                  : 'bg-slate-200 border border-slate-300'
              }`}
              style={{
                backgroundColor: filled ? themeColor : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Error Message */}
      <div className="h-6 flex items-center justify-center mb-2">
        {localError ? (
          <p className="text-xs font-semibold text-rose-500 animate-shake text-center">
            {localError}
          </p>
        ) : loading ? (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <div className="size-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>กำลังตรวจสอบรหัส PIN...</span>
          </div>
        ) : null}
      </div>

      {/* 3x4 Numeric Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] select-none">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
          <button
            key={digit}
            type="button"
            disabled={loading}
            onClick={() => handleDigit(digit)}
            className="size-14 rounded-full bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 text-xl font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer border border-slate-200/60"
          >
            {digit}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={handleClear}
          className="size-14 rounded-full bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-500 text-xs font-bold transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 border border-slate-200/60"
        >
          ล้าง
        </button>

        {/* 0 Button */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleDigit('0')}
          className="size-14 rounded-full bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 text-xl font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer border border-slate-200/60"
        >
          0
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={handleBackspace}
          className="size-14 rounded-full bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-600 text-base font-bold transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 border border-slate-200/60"
          aria-label="ลบตัวเลข"
        >
          ⌫
        </button>
      </div>

      {/* Cancel button if provided */}
      {onCancel && (
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="mt-4 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
        >
          ยกเลิก
        </button>
      )}
    </div>
  );
};
