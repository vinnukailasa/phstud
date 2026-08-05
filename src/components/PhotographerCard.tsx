'use client';

import Image from 'next/image';
import clsx from 'clsx';

type Props = {
  name: string;
  avatar: string;
  cover: string;
  strapline?: string;
  price?: string;
  onBook?: () => void;
};

export default function PhotographerCard({ name, avatar, cover, strapline, price = 'From $150', onBook }: Props) {
  return (
    <article className="rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-900/60 border border-slate-200 shadow-soft hover:shadow-lg transition-shadow duration-200">
      <div className="relative h-44 w-full">
        <Image src={cover} alt={`${name} cover`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        <div className="absolute top-3 left-3 rounded-full bg-white/80 dark:bg-slate-800/70 px-3 py-1 text-xs font-medium">{strapline}</div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3">
          <Image src={avatar} alt={name} width={44} height={44} className="rounded-full ring-2 ring-white dark:ring-slate-800" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{strapline}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={onBook}
            className={clsx(
              'px-3 py-1 rounded-xl text-sm font-medium text-white',
              'bg-gradient-to-r from-brand to-accent hover:opacity-95 transition-opacity duration-150'
            )}
          >
            Book
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300">{price}</span>
        </div>
      </div>
    </article>
  );
}
