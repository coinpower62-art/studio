# 🚀 Fixing Netlify "ENOENT package.json" Error

If your Netlify build is failing with `Error: ENOENT: no such file or directory, open '/opt/build/repo/package.json'`, it means Netlify is looking for your files in the wrong place.

### Step 1: Check your Repository on GitHub
Go to your repo on GitHub. Look at the files.
- **Scenario A**: You see `package.json` immediately. (Files are in the root).
- **Scenario B**: You see a folder (e.g., `coinpower-italy`). You click it, and THEN you see `package.json`. (Files are in a subdirectory).

### Step 2: Fix the "Base Directory" in Netlify
1.  Log in to your **Netlify Dashboard**.
2.  Go to **Site configuration** > **Build & deploy** > **Continuous Deployment**.
3.  Scroll down to **Build settings**.
4.  Find **Base directory**:
    - If you are in **Scenario B**, type the folder name (e.g., `coinpower-italy`).
    - If you are in **Scenario A**, leave it **BLANK**.
5.  Click **Save**.
6.  Go to the **Deploys** tab, click **Trigger deploy** > **Clear cache and deploy site**.

### Step 3: Force Clean Local Git (If needed)
If the above doesn't work, run these commands in your terminal to ensure Git is tracking everything correctly:

```bash
# Clear git cache
git rm -r --cached .

# Add all files again
git add .

# Commit
git commit -m "fix: ensure project structure is clean for netlify"

# Push
git push origin main
```
