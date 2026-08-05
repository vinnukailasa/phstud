'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function FullScreenViewer({ src, alt }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full h-full">
        <div className="w-full h-48 relative">
          <Image src={src} alt={alt || 'photo'} fill className="object-cover rounded-lg" />
        </div>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-[98%] max-h-[98%] relative">
            <Image src={src} alt={alt || 'photo'} width={1200} height={800} className="object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
