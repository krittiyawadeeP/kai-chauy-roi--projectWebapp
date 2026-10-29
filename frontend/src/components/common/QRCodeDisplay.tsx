import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 240,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 3,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        },
        error => {
          if (error) console.error('Error generating QR Code', error);
        }
      );
    }
  }, [value, size]);

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner border border-slate-200 ${className}`}>
      <canvas ref={canvasRef} className="rounded-lg shadow-xs" />
    </div>
  );
};
