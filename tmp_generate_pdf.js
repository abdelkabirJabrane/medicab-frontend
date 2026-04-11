const { jsPDF } = require("jspdf");
const fs = require("fs");

const doc = new jsPDF();

doc.setFontSize(22);
doc.text("Rapport de Projet — MediCab Pro", 20, 20);

doc.setFontSize(12);
doc.text("Date: 11 Avril 2026", 20, 30);
doc.text("Version: 1.0.0", 20, 38);

doc.setFontSize(16);
doc.text("1. Vue d'Ensemble", 20, 50);
doc.setFontSize(10);
const desc = "MediCab Pro est une plateforme SaaS de gestion de cabinets medicaux. Le projet vise a digitaliser l'integralite du workflow clinique et administratif.";
doc.text(doc.splitTextToSize(desc, 170), 20, 60);

doc.setFontSize(16);
doc.text("2. Architecture Technique", 20, 80);
doc.setFontSize(10);
doc.text("- Frontend: Angular 21, PrimeNG 21", 25, 90);
doc.text("- Backend: Spring Boot Microservices", 25, 98);
doc.text("- AI: FastAPI (Llama 3 / Groq)", 25, 106);

doc.setFontSize(16);
doc.text("3. Modules Principaux", 20, 120);
doc.setFontSize(10);
doc.text("- Tableau de Bord Admin (Revenus, Plans, Cabinets)", 25, 130);
doc.text("- Dossier Patient Informatise (DPI)", 25, 138);
doc.text("- Facturation & Comptabilite (Excel/PDF)", 25, 146);

doc.setFontSize(16);
doc.text("4. Travaux Recents (Avril 2026)", 20, 160);
doc.setFontSize(10);
const recent = "- Synchronisation dynamique du formulaire de creation de cabinet.\n- Refonte visuelle des outils analytiques admin.\n- Fix de l'affichage des Select (appendTo body).\n- Fallback pour le suivi des connexions utilisateurs.";
doc.text(doc.splitTextToSize(recent, 170), 20, 170);

doc.save("MediCab_Pro_Report.pdf");
console.log("PDF généré : MediCab_Pro_Report.pdf");
