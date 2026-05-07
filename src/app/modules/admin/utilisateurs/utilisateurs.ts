import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UserAdminService, User } from '../../../core/services/user-admin';
import { CabinetService } from '../../../core/services/cabinet';
import { ProgressBar } from 'primeng/progressbar';

@Component({
    selector: 'app-admin-utilisateurs',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, TableModule, DialogModule, InputTextModule, ToastModule, ConfirmDialogModule, SelectModule, ProgressBar],
    providers: [MessageService, ConfirmationService, DatePipe],
    templateUrl: './utilisateurs.html',
    styleUrls: ['./utilisateurs.scss']
})
export class AdminUtilisateursComponent implements OnInit {
    users: any[] = [];
    usersFiltres: any[] = [];
    searchQuery = '';
    filtreActif = 'TOUS';
    dialogVisible = false;
    loading = false;
    form: any = { firstName: '', lastName: '', email: '', username: '', role: '', cabinet: '', gender: 'MALE', address: '', ville: '', phoneNumber: '' };

    tabs = [
        { label: 'Tous', value: 'TOUS', count: 0 },
        { label: 'Médecins', value: 'ROLE_MEDECIN', count: 0 },
        { label: 'Secrétaires', value: 'ROLE_SECRETAIRE', count: 0 },
        { label: 'Admins', value: 'ROLE_SUPER_ADMIN', count: 0 }
    ];

    roleOptions = [
        { label: 'Médecin', value: 'ROLE_MEDECIN' },
        { label: 'Secrétaire', value: 'ROLE_SECRETAIRE' },
        { label: 'Super Admin', value: 'ROLE_SUPER_ADMIN' }
    ];

    genderOptions = [
        { label: 'Masculin', value: 'MALE' },
        { label: 'Féminin', value: 'FEMALE' }
    ];

    cabinetOptions: any[] = [];

    constructor(
        private messageService: MessageService,
        private confirmService: ConfirmationService,
        private userAdminService: UserAdminService,
        private cabinetService: CabinetService,
        private datePipe: DatePipe
    ) {}

    ngOnInit() {
        this.loadCabinets();
        this.loadUsers();
    }

    loadCabinets() {
        this.cabinetService.getAll().subscribe({
            next: (data) => {
                this.cabinetOptions = data.map(c => ({ label: c.nom, value: c.nom }));
            }
        });
    }

    loadUsers() {
        this.loading = true;
        this.userAdminService.getAll().subscribe({
            next: (data) => {
                this.users = data.map((u) => this.mapUser(u));
                this.updateCounts();
                this.filtrer();
                this.loading = false;
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les utilisateurs' });
                this.loading = false;
            }
        });
    }

    private mapUser(u: User): any {
        const primaryRole = u.roles?.[0] || 'ROLE_PATIENT';
        return {
            ...u,
            nom: `${u.firstName} ${u.lastName}`,
            initiales: (u.firstName?.[0] || '') + (u.lastName?.[0] || ''),
            role: primaryRole,
            roleLabel: this.getRoleLabel(primaryRole),
            cabinet: u.tenantId ? `Cabinet #${u.tenantId}` : '—',
            derniereConnexion: this.getLastLoginDate(u),
            actif: u.active
        };
    }

    private getLastLoginDate(u: any): string {
        const lastLogin = u.lastLogin || u.lastLoginDate || u.lastConnectedAt || u.lastActivityAt || u.connectedAt || 
                          u.last_login || u.last_connected || u.last_activity || u.lastSeen || u.updatedAt;
        
        if (!lastLogin) return 'Jamais';
        return this.datePipe.transform(lastLogin, 'dd/MM/yyyy HH:mm') || 'Jamais';
    }

    private getRoleLabel(role: string): string {
        switch (role) {
            case 'ROLE_SUPER_ADMIN':
                return 'Super Admin';
            case 'ROLE_MEDECIN':
                return 'Médecin';
            case 'ROLE_SECRETAIRE':
                return 'Secrétaire';
            case 'ROLE_PATIENT':
                return 'Patient';
            default:
                return role;
        }
    }

    updateCounts() {
        this.tabs[0].count = this.users.length;
        this.tabs[1].count = this.users.filter((u) => u.role === 'ROLE_MEDECIN').length;
        this.tabs[2].count = this.users.filter((u) => u.role === 'ROLE_SECRETAIRE').length;
        this.tabs[3].count = this.users.filter((u) => u.role === 'ROLE_SUPER_ADMIN').length;
    }

    setFiltre(v: string) {
        this.filtreActif = v;
        this.filtrer();
    }

    filtrer() {
        let r = [...this.users];
        if (this.filtreActif !== 'TOUS') r = r.filter((u) => u.role === this.filtreActif);
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            r = r.filter((u) => u.nom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.cabinet && u.cabinet.toLowerCase().includes(q)));
        }
        this.usersFiltres = r;
    }

    ouvrirNouveau() {
        this.form = { firstName: '', lastName: '', email: '', username: '', password: '', role: 'ROLE_MEDECIN', cabinet: '', specialite: '', slug: '', biographie: '', gender: 'MALE', address: '', ville: '', phoneNumber: '' };
        this.dialogVisible = true;
    }

    sauvegarder() {
        if (!this.form.firstName || !this.form.email || !this.form.username) {
            this.messageService.add({ severity: 'warn', summary: 'Requis', detail: 'Champs obligatoires manquants' });
            return;
        }

        const isUpdate = !!this.form.id;

        if (!isUpdate && !this.form.password) {
            this.messageService.add({ severity: 'warn', summary: 'Requis', detail: 'Le mot de passe est obligatoire pour un nouvel utilisateur' });
            return;
        }

        const payload = {
            ...this.form,
            roles: [this.form.role],
            active: true
        };

        const request$ = isUpdate
            ? this.userAdminService.update(this.form.id, payload)
            : this.userAdminService.create(payload);

        request$.subscribe({
            next: (savedUser) => {
                const mapped = this.mapUser(savedUser);
                if (isUpdate) {
                    const idx = this.users.findIndex(u => u.id === mapped.id);
                    if (idx > -1) this.users[idx] = mapped;
                } else {
                    this.users.unshift(mapped);
                }
                
                this.updateCounts();
                this.filtrer();
                this.dialogVisible = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Utilisateur ${mapped.nom} ${isUpdate ? 'modifié' : 'créé'}` });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message || 'Impossible d\'enregistrer l\'utilisateur' });
            }
        });
    }

    modifier(u: any) {
        this.form = { 
            ...u,
            specialite: u.specialite || '',
            slug: u.slug || '',
            biographie: u.biographie || ''
        };
        this.dialogVisible = true;
    }

    resetMdp(u: any) {
        this.messageService.add({ severity: 'info', summary: 'Info', detail: `Fonction de réinitialisation pour ${u.email} appelée` });
    }

    toggleStatus(u: any) {
        const action = u.actif ? this.userAdminService.deactivate(u.id) : this.userAdminService.activate(u.id);

        action.subscribe({
            next: (updatedUser) => {
                u.actif = updatedUser.active;
                this.messageService.add({
                    severity: u.actif ? 'success' : 'warn',
                    summary: u.actif ? 'Activé' : 'Désactivé',
                    detail: u.nom
                });
                this.updateCounts();
                this.filtrer();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Opération impossible' });
            }
        });
    }
}
