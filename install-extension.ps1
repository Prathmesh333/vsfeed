# VSFeed Extension Installation Script

Write-Host "VSFeed Extension Installer" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if VSIX file exists
$vsixFile = Get-ChildItem -Filter "vsfeed-*.vsix" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $vsixFile) {
    Write-Host "ERROR: No VSIX package found!" -ForegroundColor Red
    Write-Host "Please run this script from the vsfeed project directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found: $($vsixFile.Name)" -ForegroundColor Green
Write-Host ""

# Get full path
$vsixPath = $vsixFile.FullName
Write-Host "Full path: $vsixPath" -ForegroundColor Gray
Write-Host ""

# Install extension
Write-Host "Installing extension..." -ForegroundColor Yellow
Write-Host "Note: Please close VS Code before installing if it's currently open." -ForegroundColor Yellow
Write-Host ""

$result = code --install-extension "$vsixPath" --force 2>&1
Write-Host $result

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Close this VS Code window completely" -ForegroundColor White
Write-Host "2. Reopen VS Code" -ForegroundColor White
Write-Host "3. Press Ctrl+Shift+B to open VSFeed Feed Panel" -ForegroundColor White
Write-Host ""
Write-Host "If you still see a black screen:" -ForegroundColor Yellow
Write-Host "- Open Command Palette (Ctrl+Shift+P)" -ForegroundColor White
Write-Host "- Type 'Developer: Reload Window'" -ForegroundColor White
Write-Host "- Press Enter" -ForegroundColor White
