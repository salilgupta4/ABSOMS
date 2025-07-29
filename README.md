# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3.  Run the app:
    `npm run dev`

---

## Troubleshooting

### EPERM: operation not permitted error during `npm install`

If you encounter an `EPERM` error while running `npm install`, it means npm lacks the necessary permissions to write to its global installation directory. This is a common issue with local development environments.

Here are two ways to resolve it:

#### **Option 1: Use a Node Version Manager (NVM) (Recommended)**

NVM is a tool that allows you to manage multiple versions of Node.js on your machine without requiring `sudo`. It installs Node.js in your user's home directory, which avoids permission issues.

1.  **Install NVM:** Follow the installation instructions on the [official NVM repository](https://github.com/nvm-sh/nvm#installing-and-updating).
2.  **Install and use a Node version:**
    ```bash
    nvm install --lts
    nvm use --lts
    ```
3.  **Re-run `npm install`:** Now, `npm install` should work without any permission errors.

#### **Option 2: Run with `sudo` (Quick Fix)**

You can force the command to run with administrator privileges. **Note:** This is generally not recommended as it can lead to other issues, but it can work as a temporary fix.

```bash
sudo npm install
```

You will be prompted to enter your computer's password.
