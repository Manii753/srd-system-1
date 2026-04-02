# PowerShell script to update font sizes across the app
# ALL text sizes will be replaced with either text-app-heading or text-app-text

$files = Get-ChildItem -Path src -Recurse -Include *.js,*.jsx,*.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName | Out-String
    $originalContent = $content
    
    # Replace heading patterns (bold/semibold text) - these become headings
    $content = $content -replace 'text-xs\s+font-bold', 'text-app-heading font-bold'
    $content = $content -replace 'text-xs\s+font-semibold', 'text-app-heading font-semibold'
    $content = $content -replace 'text-sm\s+font-bold', 'text-app-heading font-bold'
    $content = $content -replace 'text-sm\s+font-semibold', 'text-app-heading font-semibold'
    $content = $content -replace 'text-base\s+font-bold', 'text-app-heading font-bold'
    $content = $content -replace 'text-base\s+font-semibold', 'text-app-heading font-semibold'
    $content = $content -replace 'text-lg\s+font-bold', 'text-app-heading font-bold'
    $content = $content -replace 'text-lg\s+font-semibold', 'text-app-heading font-semibold'
    $content = $content -replace 'text-xl\s+font-bold', 'text-app-heading font-bold'
    $content = $content -replace 'text-xl\s+font-semibold', 'text-app-heading font-semibold'
    $content = $content -replace 'text-2xl\s+font-bold', 'text-app-heading font-bold'
    $content = $content -replace 'text-2xl\s+font-semibold', 'text-app-heading font-semibold'
    $content = $content -replace 'text-3xl\s+font-bold', 'text-app-heading font-bold'
    $content = $content -replace 'text-3xl\s+font-semibold', 'text-app-heading font-semibold'
    
    # Replace font-bold/semibold text patterns (reverse order)
    $content = $content -replace 'font-bold\s+text-xs', 'font-bold text-app-heading'
    $content = $content -replace 'font-semibold\s+text-xs', 'font-semibold text-app-heading'
    $content = $content -replace 'font-bold\s+text-sm', 'font-bold text-app-heading'
    $content = $content -replace 'font-semibold\s+text-sm', 'font-semibold text-app-heading'
    $content = $content -replace 'font-bold\s+text-base', 'font-bold text-app-heading'
    $content = $content -replace 'font-semibold\s+text-base', 'font-semibold text-app-heading'
    $content = $content -replace 'font-bold\s+text-lg', 'font-bold text-app-heading'
    $content = $content -replace 'font-semibold\s+text-lg', 'font-semibold text-app-heading'
    $content = $content -replace 'font-bold\s+text-xl', 'font-bold text-app-heading'
    $content = $content -replace 'font-semibold\s+text-xl', 'font-semibold text-app-heading'
    $content = $content -replace 'font-bold\s+text-2xl', 'font-bold text-app-heading'
    $content = $content -replace 'font-semibold\s+text-2xl', 'font-semibold text-app-heading'
    
    # Replace ALL remaining text sizes (normal text)
    $content = $content -replace '\btext-xs\b', 'text-app-text'
    $content = $content -replace '\btext-sm\b', 'text-app-text'
    $content = $content -replace '\btext-base\b', 'text-app-text'
    $content = $content -replace '\btext-lg\b', 'text-app-text'
    $content = $content -replace '\btext-xl\b', 'text-app-text'
    $content = $content -replace '\btext-2xl\b', 'text-app-text'
    $content = $content -replace '\btext-3xl\b', 'text-app-text'
    $content = $content -replace '\btext-4xl\b', 'text-app-text'
    $content = $content -replace '\btext-5xl\b', 'text-app-text'
    $content = $content -replace '\btext-6xl\b', 'text-app-text'
    
    # Only write if content changed
    if ($content -ne $originalContent) {
        $content | Set-Content -Path $file.FullName
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "`nFont size update complete!"
