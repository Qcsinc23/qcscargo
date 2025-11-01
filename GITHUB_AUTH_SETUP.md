# GitHub Authentication Setup Guide

## Quick Solutions

### Option 1: Use GitHub CLI (Recommended - Easiest)

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Follow the prompts:
# - Choose GitHub.com
# - Choose HTTPS
# - Authenticate Git with your GitHub credentials
# - Choose your preferred protocol (HTTPS recommended)
```

After authentication, try pushing:
```bash
git push --set-upstream origin refactor-code-improve-8647a
```

### Option 2: Personal Access Token (For HTTPS)

1. **Create Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: "QCS Cargo Git Push"
   - Expiration: 90 days (or your preference)
   - Scopes: Check `repo` (full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Use Token as Password:**
   ```bash
   git push --set-upstream origin refactor-code-improve-8647a
   ```
   - Username: `Qcsinc23`
   - Password: `paste_your_token_here`
   
   The token will be saved in macOS keychain.

### Option 3: Switch to SSH (Most Secure)

1. **Check if you have SSH keys:**
   ```bash
   ls -la ~/.ssh/id_*.pub
   ```

2. **If no SSH key, create one:**
   ```bash
   ssh-keygen -t ed25519 -C "sales@Quietcraftsolutions.com"
   # Press Enter to accept default location
   # Optional: Add passphrase for extra security
   ```

3. **Add SSH key to GitHub:**
   ```bash
   # Copy your public key
   cat ~/.ssh/id_ed25519.pub
   # Copy the output
   ```
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Title: "QCS Cargo Mac"
   - Key: Paste your public key
   - Click "Add SSH key"

4. **Test SSH connection:**
   ```bash
   ssh -T git@github.com
   # Should say: "Hi Qcsinc23! You've successfully authenticated..."
   ```

5. **Switch remote to SSH:**
   ```bash
   git remote set-url origin git@github.com:Qcsinc23/qcscargo.git
   ```

6. **Push:**
   ```bash
   git push --set-upstream origin refactor-code-improve-8647a
   ```

## Current Configuration

- **Remote URL:** `https://github.com/Qcsinc23/qcscargo.git` (HTTPS)
- **Credential Helper:** `osxkeychain` (macOS Keychain)
- **User:** `Qcsinc23 <sales@Quietcraftsolutions.com>`
- **Branch:** `refactor-code-improve-8647a`

## Troubleshooting

### "Authentication failed" error:
- Clear stored credentials: `git credential-osxkeychain erase` → Enter credentials
- Try Personal Access Token (Option 2)
- Or switch to SSH (Option 3)

### "Permission denied" error:
- Check token/SSH key has `repo` permissions
- Verify you have write access to the repository

### "Branch not found" error:
- The branch might need to be created on GitHub first
- Use: `git push --set-upstream origin refactor-code-improve-8647a`

## Recommended: GitHub CLI

The easiest way is to install and use GitHub CLI:
```bash
brew install gh
gh auth login
git push --set-upstream origin refactor-code-improve-8647a
```

---

**Choose the method that works best for you!** 🔐

