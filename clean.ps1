# =======================
#   GITHUB CLEANUP TOOL
# =======================

$Owner = "magpern"
$Repo = "TicketBrokerSpring"

# Safety switch
$DryRun = $true   # set to $false to perform deletions

Write-Host "🔍 Cleaning GitHub repository: $Owner/$Repo" -ForegroundColor Cyan
if ($DryRun) { Write-Host "DRY RUN enabled — nothing will actually be deleted." -ForegroundColor Yellow }

# ------------------------------------------------------------
# 1) DELETE RELEASES
# ------------------------------------------------------------
$releases = @(gh api "repos/$Owner/$Repo/releases" --paginate --jq '.[].tag_name' 2>$null)
if ($releases.Count -gt 0) {
    Write-Host "`nFound $($releases.Count) releases:"
    $releases | ForEach-Object { Write-Host "  - $_" }

    foreach ($r in $releases) {
        Write-Host "Deleting release $r..." -NoNewline
        if (-not $DryRun) {
            gh release delete "$r" --repo "$Owner/$Repo" --yes 2>$null
        }
        Write-Host " [OK]" -ForegroundColor Green
    }
}
else {
    Write-Host "`nNo releases found."
}

# ------------------------------------------------------------
# 2) DELETE TAGS
# ------------------------------------------------------------
Write-Host "`nFetching tags..."
$tags = @(git ls-remote --tags "https://github.com/$Owner/$Repo.git" | ForEach-Object {
        ($_ -split '\s+')[1] -replace '^refs/tags/', '' -replace '\^\{\}$', ''
    })
if ($tags.Count -gt 0) {
    Write-Host "Found $($tags.Count) tags."
    foreach ($t in $tags) {
        Write-Host "Deleting tag $t..." -NoNewline
        if (-not $DryRun) {
            gh api -X DELETE "repos/$Owner/$Repo/git/refs/tags/$t" 2>$null
        }
        Write-Host " [OK]" -ForegroundColor Green
    }
}
else {
    Write-Host "No tags found."
}

# ------------------------------------------------------------
# 3) DELETE CONTAINER PACKAGES (GHCR)
# ------------------------------------------------------------
Write-Host "`nSearching GHCR packages..."

# Try to list packages - check for permission errors
$pkgResponse = gh api -H "Accept: application/vnd.github+json" `
    "/users/$Owner/packages?package_type=container&per_page=100" --paginate 2>&1

# Check if response contains an error
$hasError = $false
if ($LASTEXITCODE -ne 0) {
    $hasError = $true
}
else {
    try {
        $jsonResponse = $pkgResponse | ConvertFrom-Json
        if ($jsonResponse.message -and ($jsonResponse.message -match "read:packages" -or $jsonResponse.status -eq 403)) {
            $hasError = $true
        }
    }
    catch {
        # If it's not JSON or parsing fails, check for error strings
        if ($pkgResponse -match "403" -or $pkgResponse -match "read:packages" -or $pkgResponse -match "status.*403") {
            $hasError = $true
        }
    }
}

if ($hasError) {
    Write-Host "⚠️  Cannot access GHCR packages: Missing 'read:packages' permission." -ForegroundColor Yellow
    Write-Host "   To fix this, run:" -ForegroundColor Yellow
    Write-Host "   gh auth refresh -s read:packages,write:packages,delete:packages" -ForegroundColor Cyan
    Write-Host "   Or visit: https://github.com/settings/tokens" -ForegroundColor Cyan
    Write-Host "   and create a token with 'read:packages', 'write:packages', and 'delete:packages' scopes" -ForegroundColor Cyan
}
else {
    try {
        $pkgs = @($pkgResponse | ConvertFrom-Json | Where-Object { 
                $_.repository -ne $null -and $_.repository.name -eq $Repo 
            } | ForEach-Object { $_.name })
    }
    catch {
        Write-Host "⚠️  Failed to parse package list response." -ForegroundColor Yellow
        $pkgs = @()
    }

    if ($pkgs.Count -gt 0) {
        Write-Host "Found container package(s):"
        $pkgs | ForEach-Object { Write-Host "  - $_" }

        foreach ($pkg in $pkgs) {
            Write-Host "`nProcessing package: $pkg" -ForegroundColor Magenta
            $versions = @(gh api -H "Accept: application/vnd.github+json" `
                    "/users/$Owner/packages/container/$pkg/versions?per_page=100" --paginate `
                    --jq ".[].id" 2>$null)

            if ($versions.Count -eq 0) {
                Write-Host "  No versions found."
            }
            else {
                foreach ($v in $versions) {
                    Write-Host "  Deleting version $v..." -NoNewline
                    if (-not $DryRun) {
                        $deleteResult = gh api -X DELETE -H "Accept: application/vnd.github+json" `
                            "/users/$Owner/packages/container/$pkg/versions/$v" 2>&1
                        if ($LASTEXITCODE -ne 0) {
                            Write-Host " [FAILED]" -ForegroundColor Red
                            Write-Host "    Error: $deleteResult" -ForegroundColor Red
                        }
                        else {
                            Write-Host " [OK]" -ForegroundColor Green
                        }
                    }
                    else {
                        Write-Host " [SKIP - DRY RUN]" -ForegroundColor Yellow
                    }
                }
            }

            Write-Host "  Removing package $pkg..." -NoNewline
            if (-not $DryRun) {
                $deleteResult = gh api -X DELETE -H "Accept: application/vnd.github+json" `
                    "/users/$Owner/packages/container/$pkg" 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-Host " [FAILED]" -ForegroundColor Red
                    Write-Host "    Error: $deleteResult" -ForegroundColor Red
                }
                else {
                    Write-Host " [OK]" -ForegroundColor Green
                }
            }
            else {
                Write-Host " [SKIP - DRY RUN]" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "No GHCR packages found for this repository."
    }
}

Write-Host "`n✅ Cleanup complete." -ForegroundColor Green
