# VS Code Configuration

## Setup Instructions

### 1. Copy the example launch configuration

**First time setup:**
```powershell
Copy-Item .vscode\launch.json.example .vscode\launch.json
```

### 2. Edit launch.json with your credentials

Open `.vscode/launch.json` and replace the `CHANGE_ME` placeholders with your actual passwords:

- `POSTGRES_DEV_PASSWORD`: Your development database password
- `POSTGRES_PROD_PASSWORD`: Your production database password  
- `ADMIN_PASSWORD`: Your admin password
- `MAIL_USERNAME`: Your email username (if using email)
- `MAIL_PASSWORD`: Your email password (if using email)

**Example:**
```json
"env": {
    "POSTGRES_DEV_PASSWORD": "your_actual_dev_password",
    "POSTGRES_PROD_PASSWORD": "your_actual_prod_password",
    ...
}
```

### 3. Security

✅ **The `launch.json` file is gitignored** - it will NOT be committed to GitHub  
✅ **Only `launch.json.example` is committed** - safe template without real passwords

## Available Debug Configurations

- **Spring Boot - Dev**: Debug with development profile
- **Spring Boot - Prod**: Debug with production profile  
- **Launch Chrome against localhost**: Debug React frontend
- **Spring Boot + React (Dev)**: Start both backend and frontend together

## Important Security Notes

⚠️ **Never commit `launch.json`** - it contains sensitive passwords  
⚠️ **Always use `launch.json.example`** as the template for new team members  
✅ **The file is already in `.gitignore`** - but double-check before committing

