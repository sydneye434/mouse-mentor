# Why changes don't show on refresh

Developed by Sydney Edwards.

## 1. Hard refresh (bypass cache)

- **Mac:** `Cmd + Shift + R`  
- **Windows/Linux:** `Ctrl + Shift + R`

Or: open DevTools (F12) → right‑click the refresh button → **Empty Cache and Hard Reload**.

## 2. If using Cursor's Simple Browser

It can cache heavily. Try:

- Close the Simple Browser tab and open it again (Cmd+Shift+P → "Simple Browser: Show" → `http://localhost:5173`).
- Or open **http://localhost:5173** in Chrome/Safari/Firefox and do a hard refresh there.

## 3. Restart the frontend

If it still looks old:

```bash
# Stop anything on 5173, then:
cd /path/to/mouse-mentor
npm run dev
```

Then hard refresh the page again.

## 4. Dev mode: disable cache (optional)

In Chrome DevTools: **Network** tab → check **Disable cache**, then keep DevTools open while developing. Then a normal refresh will load the latest code.
