import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationService, NotificationResponse, NotificationRequest } from '../../../core/services/notification';
import { PatientService } from '../../../core/services/patient';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        TagModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './notifications.html',
    styleUrls: ['./notifications.scss']
})
export class NotificationsComponent implements OnInit {
    notifications: NotificationResponse[] = [];
    loading = false;
    dialogVisible = false;

    // Filter
    statutFiltre = 'TOUS';
    statutOptions = [
        { label: 'Tous', value: 'TOUS' },
        { label: 'Envoyée', value: 'ENVOYEE' },
        { label: 'Programmée', value: 'PROGRAMMEE' },
        { label: 'Échec', value: 'ECHEC' },
        { label: 'Annulée', value: 'ANNULEE' }
    ];

    // New Notification Form
    newNotif: NotificationRequest = {
        tenantId: 1,
        destinataireId: undefined,
        destinataireContact: '',
        type: 'INFORMATION',
        canal: 'EMAIL',
        sujet: '',
        contenu: '',
        dateProgrammee: undefined
    };

    canalOptions = [
        { label: 'Email', value: 'EMAIL' },
        { label: 'SMS', value: 'SMS' },
        { label: 'WhatsApp', value: 'WHATSAPP' }
    ];

    typeOptions = [
        { label: 'Information', value: 'INFORMATION' },
        { label: 'Rappel', value: 'RAPPEL_RDV' },
        { label: 'Marketing', value: 'MARKETING' },
        { label: 'Alerte', value: 'ALERTE' }
    ];

    patients: any[] = [];
    patientOptions: any[] = [];

    constructor(
        private notificationService: NotificationService,
        private patientService: PatientService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.loadNotifications();
        this.loadPatients();
    }

    loadNotifications() {
        this.loading = true;
        if (this.statutFiltre === 'TOUS') {
            this.notificationService.getAll().subscribe({
                next: (res) => {
                    this.notifications = res;
                    this.loading = false;
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message });
                    this.loading = false;
                }
            });
        } else {
            this.notificationService.getByStatut(this.statutFiltre).subscribe({
                next: (res) => {
                    this.notifications = res;
                    this.loading = false;
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message });
                    this.loading = false;
                }
            });
        }
    }

    loadPatients() {
        this.patientService.getAll().subscribe({
            next: (res) => {
                this.patients = res;
                this.patientOptions = res.map(p => ({
                    label: `${p.nom} ${p.prenom}`,
                    value: p.id,
                    email: p.email,
                    tel: p.telephone
                }));
            }
        });
    }

    onPatientSelect(event: any) {
        const patientId = event.value;
        const patient = this.patientOptions.find(p => p.value === patientId);
        if (patient) {
            this.newNotif.destinataireContact = this.newNotif.canal === 'EMAIL' ? patient.email : patient.tel;
        }
    }

    onCanalChange() {
        if (this.newNotif.destinataireId) {
            const patient = this.patientOptions.find(p => p.value === this.newNotif.destinataireId);
            if (patient) {
                this.newNotif.destinataireContact = this.newNotif.canal === 'EMAIL' ? patient.email : patient.tel;
            }
        }
    }

    ouvrirDialogue() {
        this.newNotif = {
            tenantId: 1,
            destinataireId: undefined,
            destinataireContact: '',
            type: 'INFORMATION',
            canal: 'EMAIL',
            sujet: '',
            contenu: '',
            dateProgrammee: undefined
        };
        this.dialogVisible = true;
    }

    envoyerNotification() {
        if (!this.newNotif.destinataireContact || !this.newNotif.contenu) {
            this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Veuillez remplir les informations obligatoires' });
            return;
        }

        if (this.newNotif.dateProgrammee) {
            this.notificationService.programmer(this.newNotif).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Notification programmée' });
                    this.dialogVisible = false;
                    this.loadNotifications();
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message });
                }
            });
        } else {
            this.notificationService.envoyer(this.newNotif).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Notification envoyée' });
                    this.dialogVisible = false;
                    this.loadNotifications();
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message });
                }
            });
        }
    }

    annulerNotification(id: number) {
        this.confirmationService.confirm({
            message: 'Voulez-vous vraiment annuler cette notification programmée ?',
            header: 'Confirmation d\'annulation',
            icon: 'pi pi-exclamation-circle',
            acceptLabel: 'Oui, annuler',
            rejectLabel: 'Non',
            accept: () => {
                this.notificationService.annuler(id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'info', summary: 'Action', detail: 'Notification annulée' });
                        this.loadNotifications();
                    },
                    error: (err) => {
                        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.message });
                    }
                });
            }
        });
    }

    getSeverity(statut: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
        switch (statut) {
            case 'ENVOYEE': return 'success';
            case 'PROGRAMMEE': return 'info';
            case 'ECHEC': return 'danger';
            case 'ANNULEE': return 'secondary';
            default: return 'info';
        }
    }
}
