# Deployment Guide for GitHub Pages

## Quick Deploy Steps

### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Name your repository (e.g., `flexibase` or `my-database`)
3. Choose "Public" (required for free GitHub Pages)
4. Click "Create repository"

### 2. Upload Files

**Option A: Using GitHub Web Interface**

1. Click "uploading an existing file" on the repository page
2. Drag and drop ALL these files:
   - index.html
   - quickstart.html
   - styles.css
   - storage.js
   - database.js
   - views.js
   - app.js
   - config.template.js
   - .gitignore
   - README.md
3. Commit the files

**Option B: Using Git Command Line**

```bash
# Navigate to your project folder containing the files
cd path/to/flexibase

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit of FlexiBase"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Click "Pages" in the left sidebar
4. Under "Source", select "main" branch
5. Click "Save"
6. Wait 1-2 minutes for deployment

### 4. Access Your App

Your app will be live at:
```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

For example:
- `https://johndoe.github.io/flexibase/`

### 5. Quick Start Guide

Your users can access the quick start guide at:
```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/quickstart.html
```

## Setting Up filen.io (Later)

### 1. Get API Credentials

1. Sign up at https://filen.io
2. Navigate to Settings → API
3. Generate an API key
4. Create a folder for FlexiBase data
5. Get the folder UUID/ID

### 2. Configure Application

1. Copy `config.template.js` to `config.js`
2. Fill in your credentials:

```javascript
const CONFIG = {
    filen: {
        apiKey: 'your-actual-api-key',
        folderId: 'your-folder-id',
        autoSyncInterval: 300000 // 5 minutes
    }
};
```

3. **IMPORTANT**: Add `config.js` to `.gitignore` (already done)
4. Update `storage.js` with filen.io API implementation (see README)

### 3. Security Note

**NEVER commit config.js with your API keys to a public repository!**

Options for secure configuration:
- Use environment variables (for advanced users)
- Keep config.js only on your local machine
- Use a private repository
- Implement OAuth flow for user authentication

## Troubleshooting

### Pages Not Loading
- Check that you selected the correct branch (main)
- Wait a few minutes - GitHub Pages can take 1-5 minutes to deploy
- Check the Actions tab for deployment status

### 404 Error
- Make sure the repository is public
- Verify the URL matches: `username.github.io/repo-name`
- Check that `index.html` is in the root directory

### App Not Working
- Open browser console (F12) to check for errors
- Ensure all files were uploaded
- Check that JavaScript is enabled in browser

### Data Not Saving
- Check browser console for storage errors
- Verify localStorage is not disabled
- Try exporting and importing data to test

## Custom Domain (Optional)

To use a custom domain (e.g., `database.yourdomain.com`):

1. Add a `CNAME` file to your repository with your domain
2. In your domain's DNS settings, add a CNAME record pointing to:
   `YOUR-USERNAME.github.io`
3. In GitHub Pages settings, enter your custom domain
4. Wait for DNS to propagate (can take 24 hours)

## Updating Your Deployment

### Using GitHub Web Interface
1. Navigate to the file you want to edit
2. Click the pencil icon
3. Make changes
4. Commit changes

### Using Git
```bash
# Make your changes locally
git add .
git commit -m "Description of changes"
git push
```

GitHub Pages will automatically redeploy in 1-2 minutes.

## Local Development

To develop locally before deploying:

```bash
# Simple HTTP server with Python
python -m http.server 8000

# Or with Node.js
npx serve

# Or with PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Next Steps

1. ✅ Deploy to GitHub Pages
2. ✅ Create your first table
3. ✅ Add some test data
4. ✅ Try different views
5. ⏳ Set up filen.io sync (when ready)
6. ⏳ Customize for your needs
7. ⏳ Share with your team!

## Support

For issues:
1. Check browser console for errors
2. Review README.md for detailed docs
3. Check that all files are uploaded correctly
4. Verify you're using a modern browser

Happy database building! 🚀
