import os
import re

files = [
    'src/app/modules/secretaire/comptes/comptes.html'
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
            content = re.sub(r'\b' + k + r'\b', v, content)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched Tailwind colors in: {filepath}")
    else:
        print(f"File not found: {filepath}")
