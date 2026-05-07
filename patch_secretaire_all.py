"""
Patch complet pour le module secrétaire :
- Boutons colorés (import=violet, excel=vert, pdf=rouge)
- Tri des colonnes (pSortableColumn + p-sortIcon)
- Dark mode (:host-context)
- Search bar styles dans SCSS
"""

import re
import os

# ─── CSS commun à injecter dans chaque SCSS ──────────────────────────────────
COMMON_SCSS = '''
// ── Colored export/import buttons ────────────
%btn-colored-base {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    padding: .55rem 1.1rem;
    border-radius: var(--mc-radius-sm);
    font-size: .875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all .15s;
    border: 1.5px solid transparent;
    i { font-size: .82rem; }
}

.btn-import {
    @extend %btn-colored-base;
    background: rgba(124, 58, 237, 0.10);
    color: #7c3aed;
    border-color: rgba(124, 58, 237, 0.25);
    &:hover { background: #7c3aed; color: #fff; box-shadow: 0 3px 10px rgba(124,58,237,.35); transform: translateY(-1px); }
}

.btn-excel {
    @extend %btn-colored-base;
    background: rgba(5, 150, 105, 0.10);
    color: #059669;
    border-color: rgba(5, 150, 105, 0.25);
    &:hover { background: #059669; color: #fff; box-shadow: 0 3px 10px rgba(5,150,105,.35); transform: translateY(-1px); }
}

.btn-pdf {
    @extend %btn-colored-base;
    background: rgba(220, 38, 38, 0.10);
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.25);
    &:hover { background: #dc2626; color: #fff; box-shadow: 0 3px 10px rgba(220,38,38,.35); transform: translateY(-1px); }
}

// ── Sortable column header styles ────────────
::ng-deep .mc-table {
    .p-datatable-thead > tr > th[pSortableColumn] {
        cursor: pointer;
        user-select: none;
        transition: background .15s, color .15s;

        &:hover {
            background: var(--mc-primary-light);
            color: var(--mc-primary) !important;
        }

        &.p-highlight {
            background: var(--mc-primary-light);
            color: var(--mc-primary) !important;
            .p-sortable-column-icon { color: var(--mc-primary); }
        }

        .p-sortable-column-icon {
            font-size: .65rem;
            margin-left: .3rem;
            color: var(--mc-text-3);
            vertical-align: middle;
            transition: color .15s;
        }
    }
}
'''

DARK_MODE_SCSS = '''
:host-context([data-theme="dark"]) {
    --mc-primary-light:  #1e293b;
    --mc-bg:             #0f172a;
    --mc-surface:        #1e293b;
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
}
'''

def patch_scss(filepath):
    if not os.path.exists(filepath):
        print(f'  SKIP (not found): {filepath}')
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    changed = False
    if 'btn-import' not in content:
        if ':host-context' in content:
            content = content.replace(':host-context', COMMON_SCSS + '\n:host-context', 1)
        else:
            content += COMMON_SCSS
        changed = True
    if ':host-context([data-theme="dark"])' not in content:
        content += DARK_MODE_SCSS
        changed = True
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  Patched SCSS: {filepath}')
    else:
        print(f'  Already OK: {filepath}')

# ─── HTML patches ─────────────────────────────────────────────────────────────

def replace_buttons(content):
    """Replace btn-outline import/excel/pdf with colored variants."""
    # Importer
    content = re.sub(
        r'<button class="btn-outline"([^>]*?pi-upload[^>]*?)>',
        r'<button class="btn-import"\1>',
        content
    )
    # Excel
    content = re.sub(
        r'<button class="btn-outline"([^>]*?pi-file-excel[^>]*?)>',
        r'<button class="btn-excel"\1>',
        content
    )
    # PDF
    content = re.sub(
        r'<button class="btn-outline"([^>]*?pi-file-pdf[^>]*?)>',
        r'<button class="btn-pdf"\1>',
        content
    )
    return content

def add_sort_mode(content, table_selector='styleClass="mc-table"'):
    """Add [sortMode]="'single'" to p-table if not present."""
    if "[sortMode]" not in content:
        content = content.replace(
            table_selector,
            '[sortMode]="\'single\'"\n        ' + table_selector
        )
    return content

# ─── Patients secrétaire ──────────────────────────────────────────────────────
patients_html = 'src/app/modules/secretaire/patients/patients.html'
if os.path.exists(patients_html):
    with open(patients_html, 'r', encoding='utf-8') as f:
        c = f.read()
    c = replace_buttons(c)
    c = add_sort_mode(c)
    # Add sortable columns
    c = c.replace(
        '<th>Patient</th>\r\n                <th>CIN</th>\r\n                <th>Contact</th>\r\n                <th>Âge</th>\r\n                <th>Groupe Sanguin</th>\r\n                <th>Assurance</th>\r\n                <th>Médecin référent</th>\r\n                <th>Dernier RDV</th>\r\n                <th>Statut</th>',
        '<th pSortableColumn="nom">Patient <p-sortIcon field="nom"></p-sortIcon></th>\r\n                <th pSortableColumn="cin">CIN <p-sortIcon field="cin"></p-sortIcon></th>\r\n                <th pSortableColumn="telephone">Contact <p-sortIcon field="telephone"></p-sortIcon></th>\r\n                <th pSortableColumn="age">Âge <p-sortIcon field="age"></p-sortIcon></th>\r\n                <th pSortableColumn="groupeSanguin">Groupe Sanguin <p-sortIcon field="groupeSanguin"></p-sortIcon></th>\r\n                <th pSortableColumn="typeAssurance">Assurance <p-sortIcon field="typeAssurance"></p-sortIcon></th>\r\n                <th pSortableColumn="medecinRef">Médecin référent <p-sortIcon field="medecinRef"></p-sortIcon></th>\r\n                <th pSortableColumn="dernierRdv">Dernier RDV <p-sortIcon field="dernierRdv"></p-sortIcon></th>\r\n                <th pSortableColumn="actif">Statut <p-sortIcon field="actif"></p-sortIcon></th>'
    )
    with open(patients_html, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Patched HTML: patients')

# ─── Facturation secrétaire ───────────────────────────────────────────────────
facturation_html = 'src/app/modules/secretaire/facturation/facturation.html'
if os.path.exists(facturation_html):
    with open(facturation_html, 'r', encoding='utf-8') as f:
        c = f.read()
    c = add_sort_mode(c)
    # Add sortable columns to facturation
    c = c.replace(
        '<th>N° Facture</th>\r\n                <th>Patient</th>\r\n                <th>Date</th>\r\n                <th>Consultation</th>\r\n                <th>Montant TTC</th>\r\n                <th>Payé</th>\r\n                <th>Restant</th>\r\n                <th>Mode</th>\r\n                <th>Statut</th>',
        '<th pSortableColumn="numero">N° Facture <p-sortIcon field="numero"></p-sortIcon></th>\r\n                <th pSortableColumn="patient">Patient <p-sortIcon field="patient"></p-sortIcon></th>\r\n                <th pSortableColumn="date">Date <p-sortIcon field="date"></p-sortIcon></th>\r\n                <th pSortableColumn="typeConsultation">Consultation <p-sortIcon field="typeConsultation"></p-sortIcon></th>\r\n                <th pSortableColumn="montantTTC">Montant TTC <p-sortIcon field="montantTTC"></p-sortIcon></th>\r\n                <th pSortableColumn="montantPaye">Payé <p-sortIcon field="montantPaye"></p-sortIcon></th>\r\n                <th pSortableColumn="montantRestant">Restant <p-sortIcon field="montantRestant"></p-sortIcon></th>\r\n                <th>Mode</th>\r\n                <th pSortableColumn="statut">Statut <p-sortIcon field="statut"></p-sortIcon></th>'
    )
    with open(facturation_html, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Patched HTML: facturation')

# ─── SCSS patches ─────────────────────────────────────────────────────────────
scss_files = [
    'src/app/modules/secretaire/patients/patients.scss',
    'src/app/modules/secretaire/facturation/facturation.scss',
    'src/app/modules/secretaire/rendez-vous/rendez-vous.scss',
    'src/app/modules/secretaire/salle-attente/salle-attente.scss',
    'src/app/modules/secretaire/comptes/comptes.scss',
    'src/app/modules/secretaire/dashboard/dashboard.scss',
]
for f in scss_files:
    patch_scss(f)

print('\nDone!')
