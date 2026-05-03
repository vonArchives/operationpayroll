import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

const WARNING_MS = 60 * 1000; // 1 minute warning before timeout

/**
 * Tracks user activity and triggers a warning 1 minute before session expiry,
 * then calls onTimeout when the idle threshold is reached.
 *
 * @param {Object} options
 * @param {() => void} options.onTimeout - Called when session expires
 * @param {number} [options.timeoutMs=1800000] - Idle timeout in ms (default 30 min)
 * @returns {{ isWarning: boolean, refreshSession: () => void }}
 */
export function useSessionTimeout({ onTimeout, timeoutMs = 30 * 60 * 1000 }) {
  const [isWarning, setIsWarning] = useState(false);
  const lastActivityRef = useRef(0);
  const isWarningRef = useRef(false);
  const toastIdRef = useRef(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    isWarningRef.current = false;
    setIsWarning(false);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    const handleActivity = () => {
      resetActivity();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity));

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;

      if (idle >= timeoutMs) {
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
          toastIdRef.current = null;
        }
        onTimeout();
        return;
      }

      if (idle >= timeoutMs - WARNING_MS && !isWarningRef.current) {
        isWarningRef.current = true;
        setIsWarning(true);
        toastIdRef.current = toast.warning(
          "Your session will expire in 60 seconds. Click to continue.",
          {
            action: {
              label: "Continue",
              onClick: () => resetActivity(),
            },
            duration: WARNING_MS,
          }
        );
      }
    }, 10000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearInterval(timer);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, [onTimeout, timeoutMs, resetActivity]);

  return { isWarning, refreshSession: resetActivity };
}
