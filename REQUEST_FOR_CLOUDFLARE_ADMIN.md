# Request for Cloudflare Administrator

## Issue
Our automated blog posting system is being blocked by Cloudflare with a 403 error and JavaScript challenge. This prevents our Vercel-hosted automation from posting to WordPress via the REST API.

## What We Need

Please implement **ONE** of the following solutions in the Cloudflare dashboard for `bestcarpetinstallersnearme.com`:

---

### ✅ OPTION 1: Create Firewall Rule (RECOMMENDED - 2 minutes)

1. Go to **Security** → **WAF** → **Firewall rules**
2. Click **Create rule**
3. **Rule name**: `Allow WordPress API for Automation`
4. **Expression**:
   ```
   (http.request.uri.path contains "/wp-json/wp/v2/") and 
   (http.request.headers["authorization"] contains "Basic")
   ```
5. **Action**: Select **Skip** → Check **Managed Challenge**
6. Click **Deploy**

**This will allow authenticated WordPress API requests to bypass bot protection.**

---

### ✅ OPTION 2: Add Page Rule (Alternative - 3 minutes)

1. Go to **Rules** → **Page Rules**
2. Click **Create Page Rule**
3. **URL**: `bestcarpetinstallersnearme.com/wp-json/*`
4. **Settings**:
   - Security Level: **Essentially Off**
   - Browser Integrity Check: **Off**
5. **Save and Deploy**

---

### ✅ OPTION 3: Whitelist Vercel IPs (If using dedicated IPs)

1. Go to **Security** → **WAF** → **Tools**
2. Under **IP Access Rules**, add these Vercel IP ranges:
   - `76.76.21.0/24`
   - `76.76.19.0/24`
3. **Action**: Allow
4. **Zone**: This Website

*Note: Full Vercel IP list: https://vercel.com/docs/edge-network/regions*

---

### ✅ OPTION 4: Disable Bot Fight for API Paths

1. Go to **Security** → **Bots**
2. Under **Bot Fight Mode**, click **Configure**
3. Add exception for: `/wp-json/*`
4. Save

---

## Why This Is Needed

- Our automation runs on Vercel servers (not a browser)
- Cloudflare's JavaScript challenge cannot be solved by server-side code
- The requests are legitimate and authenticated with WordPress credentials
- This only affects the `/wp-json/wp/v2/*` API endpoints used for posting blogs

## Testing

After implementing the fix, we'll test by triggering our automation endpoint. You should see legitimate authenticated POST requests to `/wp-json/wp/v2/posts` succeed without challenges.

## Security Note

These changes only affect the WordPress REST API endpoints and maintain security through:
- WordPress username/password authentication (Basic Auth)
- Only authenticated requests will succeed
- Regular website traffic remains protected

---

**Please let me know once this is implemented so I can test the automation. Thank you!**
