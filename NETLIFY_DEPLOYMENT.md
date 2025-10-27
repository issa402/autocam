# Netlify Deployment Guide for AutoCam

This guide walks you through deploying AutoCam to Netlify.

## Prerequisites

- GitHub account with the AutoCam repository pushed
- Netlify account (https://app.netlify.com)
- Environment variables ready

## Step 1: Connect GitHub to Netlify

1. Go to https://app.netlify.com/teams/issa402/projects
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** as your Git provider
4. Authorize Netlify to access your GitHub account
5. Find and select the **issa402/autocam** repository
6. Click **"Import"**

## Step 2: Configure Build Settings

Netlify should auto-detect the build settings:
- **Build command**: `npm run build`
- **Publish directory**: `.next`

If not auto-detected, set them manually:
1. Go to **Site settings** → **Build & deploy** → **Build settings**
2. Set **Build command** to: `npm run build`
3. Set **Publish directory** to: `.next`

## Step 3: Set Environment Variables

1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Click **"Edit variables"**
3. Add the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=your-database-url
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AI_WORKER_URL=your-modal-ai-worker-url
JWT_SECRET=your-jwt-secret
```

**Important**: Get these values from:
- **Supabase**: Project settings → API
- **Google OAuth**: Google Cloud Console
- **Modal**: After deploying AI worker
- **JWT_SECRET**: Generate a secure random string

## Step 4: Configure Google OAuth Redirect URI

1. Go to Google Cloud Console
2. Find your OAuth 2.0 credentials
3. Add your Netlify domain to **Authorized redirect URIs**:
   - `https://your-netlify-domain.netlify.app/api/auth/callback/google`
   - Replace `your-netlify-domain` with your actual Netlify domain

## Step 5: Deploy AI Worker to Modal

Before deploying the frontend, deploy the AI worker:

```bash
# Install Modal CLI
pip install modal

# Authenticate
modal token new

# Deploy AI worker
modal deploy ai-worker/main.py
```

Get the deployment URL and add it as `AI_WORKER_URL` environment variable.

## Step 6: Trigger Deployment

1. Go back to Netlify
2. Click **"Deploy site"** or push a commit to trigger auto-deployment
3. Wait for the build to complete
4. Check the deployment logs if there are any errors

## Step 7: Test the Deployment

1. Visit your Netlify domain
2. Test the following:
   - ✅ Login/signup works
   - ✅ Photo upload works
   - ✅ AI analysis runs
   - ✅ Google Photos export works
   - ✅ Database queries work

## Troubleshooting

### Build Fails with "Cannot find module"
- Check that all dependencies are in `package.json`
- Run `npm install` locally and commit `package-lock.json`

### Environment Variables Not Working
- Verify variables are set in Netlify dashboard
- Restart the deployment after adding variables
- Check that variable names match exactly

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check Supabase connection pooler is enabled
- Ensure IP whitelist allows Netlify IPs

### AI Worker Not Responding
- Verify `AI_WORKER_URL` is correct
- Check Modal deployment is running
- Test the Modal endpoint directly

### Google OAuth Not Working
- Verify redirect URI is correct in Google Cloud Console
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure OAuth consent screen is configured

## Continuous Deployment

Netlify automatically deploys when you push to the main branch:

1. Make changes locally
2. Commit and push to GitHub
3. Netlify automatically builds and deploys
4. Check deployment status in Netlify dashboard

## Rollback

To rollback to a previous deployment:

1. Go to **Deploys** in Netlify dashboard
2. Find the previous successful deployment
3. Click **"Publish deploy"**

## Performance Optimization

### Enable Caching
- Netlify automatically caches static assets
- Configure cache headers in `netlify.toml`

### Enable CDN
- Netlify uses a global CDN by default
- No additional configuration needed

### Monitor Performance
- Use Netlify Analytics
- Check Core Web Vitals in Netlify dashboard

## Next Steps

1. ✅ Deploy to Netlify
2. ✅ Test all features
3. ✅ Set up custom domain (optional)
4. ✅ Enable HTTPS (automatic)
5. ✅ Set up monitoring and alerts

## Support

For issues:
- Check Netlify deployment logs
- Review Netlify documentation: https://docs.netlify.com
- Check Next.js documentation: https://nextjs.org/docs

