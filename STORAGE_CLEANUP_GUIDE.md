# Storage Cleanup Guide

## The Problem

Every Excel statement uploaded to Vercel Blob stays there forever, consuming storage:
- 50 customers × 2 statements/month = 100 files/month
- 100 files × 50KB = 5MB/month
- After 1 year: 60MB
- After 3 years: 180MB
- **Vercel Free Tier: 500MB limit**

---

## The Solution

### **Automatic Cleanup (Recommended)**

Files are automatically managed in two ways:

#### 1. Cache Headers (7 days)
Files are uploaded with cache headers that suggest deletion after 7 days:
```typescript
cacheControlMaxAge: 604800 // 7 days
```

#### 2. Manual Cleanup API
Call the cleanup endpoint to delete old files:
```bash
GET /api/whatsapp/cleanup-files?days=7
```

---

## Setup Options

### **Option A: Vercel Cron Jobs (Easiest)**

**1. Create `vercel.json` in project root:**
```json
{
  "crons": [
    {
      "path": "/api/whatsapp/cleanup-files?days=7",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

**Schedule explanation:**
- `0 0 * * 0` = Every Sunday at midnight
- Runs automatically on Vercel
- Free on all plans

**2. Deploy to Vercel:**
```bash
git add vercel.json
git commit -m "Add automatic file cleanup"
git push
```

**3. Verify in Vercel Dashboard:**
- Go to Project → Settings → Cron Jobs
- Should see the cleanup job listed

---

### **Option B: External Cron Service**

Use services like:
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **GitHub Actions** (free)

**Setup:**
1. Create account on cron-job.org
2. Add new cron job:
   - URL: `https://yourdomain.vercel.app/api/whatsapp/cleanup-files?days=7`
   - Schedule: Weekly (Sunday)
3. Save and activate

---

### **Option C: Manual Cleanup**

Run cleanup manually when needed:

**Via Browser:**
```
https://yourdomain.vercel.app/api/whatsapp/cleanup-files?days=7
```

**Via Command Line:**
```bash
curl https://yourdomain.vercel.app/api/whatsapp/cleanup-files?days=7
```

**Response:**
```json
{
  "success": true,
  "deleted": 42,
  "message": "Successfully deleted 42 old files"
}
```

---

## Cleanup Schedule Recommendations

### **Low Volume (< 50 statements/month)**
- **Schedule**: Monthly
- **Cron**: `0 0 1 * *` (1st of every month)
- **Storage used**: ~2-3MB

### **Medium Volume (50-200 statements/month)**
- **Schedule**: Weekly
- **Cron**: `0 0 * * 0` (Every Sunday)
- **Storage used**: ~5-10MB

### **High Volume (200+ statements/month)**
- **Schedule**: Daily
- **Cron**: `0 0 * * *` (Every day at midnight)
- **Storage used**: ~10-20MB

---

## Monitoring Storage Usage

### **Check Vercel Blob Usage:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Storage** tab
4. View **Blob Storage** usage

### **Check via API:**
```bash
# List all files
curl https://yourdomain.vercel.app/api/whatsapp/cleanup-files?days=0
```

---

## File Lifecycle

```
1. Excel Generated
   ↓
2. Uploaded to Vercel Blob (public URL)
   ↓
3. WhatsApp downloads file (within seconds)
   ↓
4. Customer receives file
   ↓
5. File sits in storage (7 days)
   ↓
6. Cleanup job deletes file
```

**Important:** Files are only needed for WhatsApp to download them (happens within seconds). After that, they serve no purpose.

---

## Storage Calculations

### **Example: 50 Customers**

**Monthly:**
- 50 customers × 2 statements = 100 files
- 100 files × 50KB = 5MB

**With Weekly Cleanup:**
- Max files at any time: ~25 files
- Max storage used: ~1.25MB
- **Well within 500MB limit!**

**With Monthly Cleanup:**
- Max files at any time: ~100 files
- Max storage used: ~5MB
- **Still safe!**

---

## Troubleshooting

### **Cleanup Not Running**
- Check Vercel Cron Jobs dashboard
- Verify `vercel.json` is in project root
- Check deployment logs

### **Storage Still Growing**
- Manually run cleanup: `/api/whatsapp/cleanup-files?days=7`
- Check for failed deletions in logs
- Verify Blob token has delete permissions

### **Files Deleted Too Soon**
- Increase retention: `/api/whatsapp/cleanup-files?days=14`
- Update cron schedule to run less frequently

---

## Best Practices

1. ✅ **Set up automatic cleanup** (Vercel Cron or external)
2. ✅ **Monitor storage monthly** (Vercel Dashboard)
3. ✅ **Keep 7-day retention** (enough time for any issues)
4. ✅ **Run manual cleanup** if approaching 500MB limit
5. ✅ **Upgrade to Pro plan** if consistently hitting limits

---

## Cost Comparison

### **Free Tier (500MB)**
- Good for: 50-100 customers
- Cleanup: Weekly
- Cost: **₹0/month**

### **Pro Tier (1TB = 1,000GB)**
- Good for: 1000+ customers
- Cleanup: Optional
- Cost: **$20/month** (~₹1,650/month)

**Recommendation:** Start with free tier + weekly cleanup. Upgrade only if needed.

---

## Quick Setup (Recommended)

**1. Create `vercel.json`:**
```bash
cd smartbooks
cat > vercel.json << 'EOF'
{
  "crons": [
    {
      "path": "/api/whatsapp/cleanup-files?days=7",
      "schedule": "0 0 * * 0"
    }
  ]
}
EOF
```

**2. Commit and push:**
```bash
git add vercel.json
git commit -m "Add automatic weekly file cleanup"
git push
```

**3. Done!** Files will auto-delete after 7 days, every Sunday.

---

## Summary

✅ **Files auto-cleanup after 7 days**
✅ **Vercel Cron runs weekly (free)**
✅ **Manual cleanup available anytime**
✅ **500MB free tier is plenty**
✅ **No storage issues!**
