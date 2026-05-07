import os
import glob
import re

dark_vars = """
:host-context([data-theme="dark"]) {
    --mc-primary-light:  #1e293b;
    --mc-bg:             #0f172a;
    --mc-surface:         #1e293b;
    --mc-surface-2:      #1a2744;
    --mc-border:         #334155;
    --mc-border-hover:   #475569;
    --mc-text-1:         #f1f5f9;
    --mc-text-2:         #94a3b8;
    --mc-text-3:         #64748b;
    
    --mc-green-bg:       #022c22;
    --mc-red-bg:         #450a0a;
    --mc-orange-bg:      #451a03;
    --mc-blue-bg:        #172554;

    --sec-accent-light:  #042f2e;
    --admin-accent-light: #431407;
}
"""

scss_files = glob.glob('src/app/**/*.scss', recursive=True)

modified_count = 0
for filepath in scss_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if the file has a :host block
    if ':host {' in content or ':host{' in content:
        # Check if we already added it
        if ':host-context([data-theme="dark"])' not in content:
            # Append it to the end of the file
            content += "\n" + dark_vars
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            modified_count += 1
            print(f"Patched: {filepath}")

print(f"Done! Patched {modified_count} files.")
