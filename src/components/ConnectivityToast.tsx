import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wifi, WifiOff, X } from 'lucide-react';
import { AuthMode } from '../api/client';

interface ConnectivityToastProps {
  isOnline: boolean;
  authMode?: AuthMode;
}

type ToastVariant = 'offline' | 'online';

export function ConnectivityToast({ isOnline, authMode = 'offline' }: ConnectivityToastProps) {
  const [visibleVariant, setVisibleVariant] = useState<ToastVariant | null>(() =>
    isOnline ? null : 'offline'
  );
  const prevOnlineRef = useRef<boolean>(isOnline);

  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    if (wasOnline === isOnline) return;
    prevOnlineRef.current = isOnline;

    setVisibleVariant(isOnline ? 'online' : 'offline');
  }, [isOnline]);

  useEffect(() => {
    if (!visibleVariant) return;
    const timeoutMs = visibleVariant === 'online' ? 4000 : 7000;
    const timer = window.setTimeout(() => {
      setVisibleVariant(null);
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [visibleVariant]);

  const isOfflineNotice = visibleVariant === 'offline';
  const title = isOfflineNotice ? 'No internet connection' : 'Back online';
  const description = isOfflineNotice
    ? authMode === 'online'
      ? 'Changes are saved to local SQLite. Cloud sync will resume when you reconnect.'
      : 'Changes are saved locally to SQLite. Cloud backup and online sign-in are unavailable.'
    : 'Internet connection restored. Cloud backup and sync are available.';

  return (
    <AnimatePresence>
      {visibleVariant && (
        <motion.div
          key={visibleVariant}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-[360px] pointer-events-auto"
        >
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
              isOfflineNotice
                ? 'border-[#B89260]/40 bg-[#1F221B]/95 text-[#FAF8F3]'
                : 'border-[#5F7356]/35 bg-[#FAF8F3]/95 text-[#23281E]'
            }`}
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isOfflineNotice
                  ? 'bg-[#B89260]/20 text-[#D9B98C]'
                  : 'bg-[#5F7356]/15 text-[#495B41]'
              }`}
            >
              {isOfflineNotice ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug">{title}</p>
              <p
                className={`mt-0.5 text-[12px] leading-relaxed ${
                  isOfflineNotice ? 'text-[#C8C7BD]' : 'text-[#5A6052]'
                }`}
              >
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setVisibleVariant(null)}
              aria-label="Dismiss connectivity notification"
              className={`shrink-0 rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89260] ${
                isOfflineNotice
                  ? 'text-[#A6A79C] hover:bg-white/10 hover:text-[#FAF8F3]'
                  : 'text-[#6A7062] hover:bg-black/5 hover:text-[#23281E]'
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
