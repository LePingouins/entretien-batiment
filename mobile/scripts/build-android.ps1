# Helper: Run an Android production EAS build for this project
# Usage: open PowerShell as your normal user and run this file from the repo root
#   pwsh .\mobile\scripts\build-android.ps1

cd "$PSScriptRoot\.."
Write-Host "Working directory: $(Get-Location)"
# Ensure you're logged in
Write-Host "Make sure you ran: eas login"
Write-Host "Starting EAS build (android, production). Follow interactive prompts..."

# Run the build
eas build --platform android --profile production

Write-Host "When the build finishes, run: eas submit --platform android --latest"