import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing env vars. API calls will fail.");
}

function getCustomToken() {
  const match = document.cookie.match(new RegExp('(?:^|; )jpmc_auth_token=([^;]*)'));
  return match ? match[1] : null;
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: (url, options) => {
        const token = getCustomToken();
        if (token) {
          // Safely inject the header whether it's a Headers class or a standard object
          if (options.headers instanceof Headers) {
            options.headers.set('Authorization', `Bearer ${token}`);
          } else {
            options.headers = {
              ...options.headers,
              Authorization: `Bearer ${token}`
            };
          }
        }
        return fetch(url, options);
      }
    }
  }
);