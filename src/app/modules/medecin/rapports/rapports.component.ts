import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BillingService } from '../../../core/services/billing';
import { AppointmentService } from '../../../core/services/appointment';

interface ReportData {
  period: string;
  consultations: number;
  ca: number;
  impayes: number;
  taux: number;
}

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [CommonModule, ButtonModule, ChartModule, TableModule],
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss']
})
export class RapportsComponent implements OnInit {

  reportData: ReportData[] = [];
  
  totalCa = 0;
  totalConsultations = 0;
  totalImpayes = 0;
  tauxRecouvrement = 0;

  lineChartData: any;
  chartOptions: any;

  pieChartData: any;
  pieOptions: any;

  constructor(
      private billingService: BillingService,
      private appointmentService: AppointmentService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    forkJoin({
        factures: this.billingService.getAll().pipe(catchError(() => of([]))),
        rdvs: this.appointmentService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
        next: (res) => {
            this.processDataObjects(res.factures, res.rdvs);
        },
        error: (err) => console.error("Erreur de chargement des rapports", err)
    });
  }

  processDataObjects(factures: any[], rdvs: any[]) {
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      
      const now = new Date();
      let last6Months = [];
      for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          last6Months.push({ monthIndex: d.getMonth(), year: d.getFullYear(), label: monthNames[d.getMonth()] });
      }

      this.reportData = last6Months.map(m => {
          let ca = 0;
          let impayes = 0;
          let consultations = 0;

          factures.forEach(f => {
              const d = f.dateEmission ? new Date(f.dateEmission) : new Date(f.dateCreation);
              if (d.getMonth() === m.monthIndex && d.getFullYear() === m.year) {
                  const t = f.montantTotal || 0;
                  const p = f.montantPaye || 0;
                  ca += t;
                  impayes += (t - p);
              }
          });

          rdvs.forEach(r => {
              if (!r.dateHeureDebut) return;
              const d = new Date(r.dateHeureDebut);
              if (d.getMonth() === m.monthIndex && d.getFullYear() === m.year) {
                  if (r.statut === 'CONFIRME' || r.statut === 'TERMINE' || r.statut === 'EN_COURS') {
                    consultations++;
                  }
              }
          });

          const mCa = ca;
          const taux = mCa > 0 ? Math.round(((mCa - impayes) / mCa) * 100) : 100;

          return {
              period: m.label,
              consultations: consultations,
              ca: ca,
              impayes: Math.max(0, impayes),
              taux: taux
          };
      });

      this.totalCa = this.reportData.reduce((acc, curr) => acc + curr.ca, 0);
      this.totalConsultations = this.reportData.reduce((acc, curr) => acc + curr.consultations, 0);
      this.totalImpayes = this.reportData.reduce((acc, curr) => acc + curr.impayes, 0);
      this.tauxRecouvrement = this.totalCa === 0 ? 100 : Math.round(((this.totalCa - this.totalImpayes) / this.totalCa) * 100);

      this.initCharts(rdvs);
  }

  initCharts(rdvs: any[] = []) {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.lineChartData = {
      labels: this.reportData.map(d => d.period),
      datasets: [
        {
          label: 'Chiffre d\'Affaires (DH)',
          data: this.reportData.map(d => d.ca),
          fill: false,
          borderColor: documentStyle.getPropertyValue('--blue-500'),
          tension: 0.4
        },
        {
          label: 'Impayés (DH)',
          data: this.reportData.map(d => d.impayes),
          fill: false,
          borderColor: documentStyle.getPropertyValue('--red-500'),
          tension: 0.4
        }
      ]
    };

    this.chartOptions = {
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
            x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder, drawBorder: false } },
            y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder, drawBorder: false } }
        }
    };

    // Compter les types de rdv valides pour le pie chart
    let countNouvelles = 0; let countSuivi = 0; let countUrgence = 0;
    const now = new Date();
    (rdvs || []).forEach(r => {
        if (!r.dateHeureDebut) return;
        const d = new Date(r.dateHeureDebut);
        if (now.getTime() - d.getTime() < 1000 * 3600 * 24 * 180) { // last 6 months
            if (r.statut !== 'ANNULE') {
                if (r.typeConsultation === 'Urgence') countUrgence++;
                else if (r.typeConsultation === 'Suivi') countSuivi++;
                else countNouvelles++;
            }
        }
    });
    // Fallback if no rdvs
    if (countNouvelles === 0 && countSuivi === 0 && countUrgence === 0) {
        countNouvelles = 1;
    }

    this.pieChartData = {
      labels: ['Consultations', 'Suivi', 'Urgence'],
      datasets: [
        {
          data: [countNouvelles, countSuivi, countUrgence],
          backgroundColor: [
            documentStyle.getPropertyValue('--blue-500'),
            documentStyle.getPropertyValue('--green-500'),
            documentStyle.getPropertyValue('--orange-500')
          ],
          hoverBackgroundColor: [
            documentStyle.getPropertyValue('--blue-400'),
            documentStyle.getPropertyValue('--green-400'),
            documentStyle.getPropertyValue('--orange-400')
          ]
        }
      ]
    };

    this.pieOptions = { plugins: { legend: { labels: { usePointStyle: true, color: textColor } } } };
  }

  exportPdf() {
    const doc = new jsPDF();
    
    // Titre
    doc.setFontSize(20);
    doc.text('Rapport Financier', 14, 22);
    
    // Sous-titre - Synthèse
    doc.setFontSize(12);
    doc.text(`Total Chiffre d'Affaires : ${this.totalCa} DH`, 14, 32);
    doc.text(`Total Consultations : ${this.totalConsultations}`, 14, 40);
    doc.text(`Total Impayés : ${this.totalImpayes} DH`, 14, 48);
    doc.text(`Taux de Recouvrement : ${this.tauxRecouvrement}%`, 14, 56);

    autoTable(doc, {
        startY: 65,
        head: [['Période', 'Consultations', 'Chiffre d\'Affaires', 'Impayés', 'Recouvrement']],
        body: this.reportData.map(d => [
            d.period, 
            d.consultations.toString(), 
            d.ca + ' DH', 
            d.impayes > 0 ? d.impayes + ' DH' : '-', 
            d.taux + '%'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10 }
    });

    doc.save('rapport_financier.pdf');
  }

  exportExcel() {
    const dataToExport = this.reportData.map(d => ({
        'Période': d.period,
        'Consultations': d.consultations,
        'Chiffre d\'Affaires (DH)': d.ca,
        'Impayés (DH)': d.impayes,
        'Taux Recouvrement (%)': d.taux
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Add summary
    XLSX.utils.sheet_add_aoa(worksheet, [
        [],
        ['Synthèse'],
        ['Total CA (DH)', this.totalCa],
        ['Total Consultations', this.totalConsultations],
        ['Total Impayés (DH)', this.totalImpayes],
        ['Taux Global (%)', this.tauxRecouvrement]
    ], { origin: -1 });

    const workbook = { Sheets: { 'Rapport': worksheet }, SheetNames: ['Rapport'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'rapport_financier');
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

}
