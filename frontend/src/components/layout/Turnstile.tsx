import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile captcha widget.
 *
 * Shows a small widget. When solved, calls onSuccess(token).
 * Token is then sent with login/register request.
 *
 * If siteKey is empty (dev mode), widget is not rendered and onSuccess('')
 * is called immediately to not block the form.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible' | 'invisible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface Props {
  siteKey: string;
  onSuccess: (token: string) => void;
  theme?: 'light' | 'dark' | 'auto';
}

export function Turnstile({ siteKey, onSuccess, theme = 'dark' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) {
      // Dev mode — no captcha, immediately "succeed"
      onSuccess('');
      return;
    }

    // Load Turnstile script once
    const existing = document.getElementById('turnstile-script');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const render = () => {
      if (!window.turnstile || !ref.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onSuccess(token),
        'error-callback': () => onSuccess(''),
        'expired-callback': () => onSuccess(''),
        theme,
      });
    };

    if (window.turnstile) {
      render();
    } else {
      window.onloadTurnstileCallback = render;
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {}
      }
    };
  }, [siteKey, theme, onSuccess]);

  if (!siteKey) return null;

  return <div ref={ref} className="flex justify-center" />;
}
