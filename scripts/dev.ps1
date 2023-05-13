$distributionDir = './dist'
$srcDir = './src'

New-Item -Name "dist" -Type Directory
Copy-Item -Recurse -Path $srcDir/icons -Destination $distributionDir -Force

pnpm concurrently -k `
  "pnpm watch-ts" `
  "pnpm watch-tailwind" `
  "web-ext run -a %npm_package_config_pwd% -u youtube.com"
