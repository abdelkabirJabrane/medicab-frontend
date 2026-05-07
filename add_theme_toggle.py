import os

code = """
            <!-- Theme toggle -->
            <button class="topbar__btn topbar__btn--text"
                    (click)="themeService.toggle()"
                    title="Mode clair/sombre">
                <i [class]="themeService.isDark() ? 'pi pi-moon' : 'pi pi-sun'"></i>
            </button>
"""

files = [
    'src/app/layout/medecin-layout/medecin-layout.html',
    'src/app/layout/admin-layout/admin-layout.html',
    'src/app/layout/secretaire-layout/secretaire-layout.html'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if '<!-- Theme toggle -->' not in content:
        content = content.replace('<div class="topbar__right">', '<div class="topbar__right">' + code)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Added theme toggle to {f}")
    else:
        print(f"Theme toggle already in {f}")
