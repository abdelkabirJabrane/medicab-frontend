# Script to remove hardcoded light theme variables from all component :host blocks
# This allows the dark-mode.scss global variables to take effect

$targetDir = "src\app\modules"
$layoutDir = "src\app\layout"

# Pattern to match: find all .scss files and remove the hardcoded mc variables from :host
# We only keep accent-specific variables (adm-accent, sec-accent, etc.)

$scssFiles = Get-ChildItem -Path $targetDir, $layoutDir -Recurse -Filter "*.scss"

$hostVarPattern = @"
    --mc-primary:        #2563EB;
    --mc-primary-dark:   #1D4ED8;
    --mc-primary-light:  #EFF4FF;
    --mc-bg:             #F1F5FA;
    --mc-surface:        #FFFFFF;
    --mc-surface-2:      #F8FAFD;
    --mc-border:         #E5EAF4;
    --mc-border-hover:   #C9D4E8;
    --mc-text-1:         #0D1B3E;
    --mc-text-2:         #4A5878;
    --mc-text-3:         #8A95B0;
    --mc-green:          #059669;
    --mc-green-bg:       #ECFDF5;
    --mc-red:            #DC2626;
    --mc-red-bg:         #FEF2F2;
    --mc-orange:         #D97706;
    --mc-orange-bg:      #FFFBEB;
    --mc-blue:           #2563EB;
    --mc-blue-bg:        #EFF6FF;
"@

foreach ($file in $scssFiles) {
    $content = Get-Content $file.FullName -Raw
    
    if ($null -eq $content) { continue }

    # Collect lines, remove any line matching the hardcoded mc- variable pattern in :host block
    $varLinesToRemove = @(
        '    --mc-primary:        #2563EB;',
        '    --mc-primary-dark:   #1D4ED8;',
        '    --mc-primary-light:  #EFF4FF;',
        '    --mc-bg:             #F1F5FA;',
        '    --mc-surface:        #FFFFFF;',
        '    --mc-surface-2:      #F8FAFD;',
        '    --mc-border:         #E5EAF4;',
        '    --mc-border-hover:   #C9D4E8;',
        '    --mc-text-1:         #0D1B3E;',
        '    --mc-text-2:         #4A5878;',
        '    --mc-text-3:         #8A95B0;',
        '    --mc-green:          #059669;',
        '    --mc-green-bg:       #ECFDF5;',
        '    --mc-red:            #DC2626;',
        '    --mc-red-bg:         #FEF2F2;',
        '    --mc-orange:         #D97706;',
        '    --mc-orange-bg:      #FFFBEB;',
        '    --mc-blue:           #2563EB;',
        '    --mc-blue-bg:        #EFF6FF;',
        '    --mc-purple:         #7C3AED;',
        '    --mc-purple-bg:      #F5F3FF;',
        '    --mc-teal:           #0D9488;',
        '    --mc-teal-bg:        #F0FDFA;',
        '    --mc-radius:         12px;',
        '    --mc-radius-sm:      8px;',
        '    --mc-radius-lg:      16px;',
        '    --mc-shadow-sm:      0 1px 4px rgba(13,27,62,.07), 0 1px 2px rgba(13,27,62,.04);',
        '    --mc-shadow-md:      0 4px 16px rgba(13,27,62,.08), 0 1px 4px rgba(13,27,62,.04);',
        '    // Même variables de base que médecin'
    )
    
    $lines = $content -split "`n"
    $newLines = @()
    $changed = $false
    
    foreach ($line in $lines) {
        $trimmed = $line.TrimEnd("`r")
        $shouldRemove = $false
        foreach ($varLine in $varLinesToRemove) {
            if ($trimmed -eq $varLine) {
                $shouldRemove = $true
                $changed = $true
                break
            }
        }
        if (-not $shouldRemove) {
            $newLines += $line
        }
    }
    
    if ($changed) {
        # Remove consecutive blank lines (more than 2)
        $finalLines = @()
        $blankCount = 0
        foreach ($line in $newLines) {
            if ($line.Trim() -eq '' -or $line.TrimEnd("`r") -eq '') {
                $blankCount++
                if ($blankCount -le 1) {
                    $finalLines += $line
                }
            } else {
                $blankCount = 0
                $finalLines += $line
            }
        }
        
        $newContent = $finalLines -join "`n"
        Set-Content $file.FullName -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "Fixed: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "`nDark mode fix complete!" -ForegroundColor Cyan
