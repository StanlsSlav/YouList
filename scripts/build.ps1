$apiKey = $env:YOULIST_API_KEY
$apiSecret = $env:YOULIST_API_SECRET

if (-not $apiKey) {
  Write-Host "An API key is required"
}

if (-not $apiSecret) {
  Write-Host "An API secret is required"
}

$distributionDir = './dist'
$srcDir = './src'
$outDir = './.out'

# Building the extension doesn't overwrite the existing one
#   and returns a exception when doing so
if (Test-Path $outDir) {
  Write-Host "Removing previous distribution"
  Remove-Item -Path $outDir -Recurse -Force
}

Write-Host "Transpiling TypeScript"
tsc

Write-Host "Copying manifest file to distribution directory"
Copy-Item -Path manifest.json -Destination $distributionDir -Force

Write-Host "Copying icons to distribution directory"
Copy-Item -Path $srcDir/icons -Destination $distributionDir -Force

# Remove development artifacts
Write-Host "Change references of 'dist' and 'src' directories to current working directory"
(Get-Content $distributionDir\manifest.json) -replace '/dist' | Out-File $distributionDir\manifest.json -Encoding UTF8
(Get-Content $distributionDir\manifest.json) -replace '/src' | Out-File $distributionDir\manifest.json -Encoding UTF8

Write-Host "Transpiling minified Tailwind"
pnpm tailwindcss -i ./src/css/styles.css -o $distributionDir/css/styles.css --minify

Write-Host "Building a working extension in '.out' directory"
web-ext build -s $distributionDir -a $outDir --overwrite-dest

Write-Host "Signing the extension"
web-ext sign -s $distributionDir -a $outDir `
  --api-key $apiKey `
  --api-secret $apiSecret
