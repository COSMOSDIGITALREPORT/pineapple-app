@echo off
echo ===================================================
echo   Packaging Pineapple cPanel 1-Click Deploy (.zip)
echo ===================================================

powershell -Command "New-Item -ItemType File -Force -Path 'cpanel_deploy\uploads\.gitkeep' | Out-Null; Remove-Item 'deploy.zip' -Force -ErrorAction SilentlyContinue; Compress-Archive -Path 'cpanel_deploy\*' -DestinationPath 'deploy.zip' -Force; Write-Host 'SUCCESS: deploy.zip created successfully!' -ForegroundColor Green"

pause
