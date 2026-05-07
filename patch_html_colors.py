import os
import re

files = [
    'src/app/modules/medecin/rapports/rapports.component.html',
    'src/app/modules/medecin/comptes/comptes.html'
]

replacements = {
    'bg-white': 'bg-[var(--mc-surface)]',
    'bg-slate-50': 'bg-[var(--mc-surface-2)]',
    'text-slate-900': 'text-[var(--mc-text-1)]',
    'text-slate-800': 'text-[var(--mc-text-1)]',
    'text-slate-700': 'text-[var(--mc-text-1)]',
    'text-slate-600': 'text-[var(--mc-text-2)]',
    'text-slate-500': 'text-[var(--mc-text-2)]',
    'text-slate-400': 'text-[var(--mc-text-3)]',
    'border-slate-100': 'border-[var(--mc-border)]',
    'border-slate-200': 'border-[var(--mc-border)]',
    'border-slate-50': 'border-[var(--mc-border)]',
}

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for k, v in replacements.items():
            # Use negative lookbehind to ensure we only replace exact tailwind classes 
            # and not things like `hover:bg-white` unless we want to. Actually simple replace is fine 
            # for these specific files as they don't use hover versions of these text colors.
            # But let's be careful with boundaries.
            content = re.sub(r'\b' + k + r'\b', v, content)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched Tailwind colors in: {filepath}")
    else:
        print(f"File not found: {filepath}")
