export const environment = {
    production: false,
    apiUrl: 'http://localhost:8080/api',
    services: {
        auth: 'http://localhost:8088/api/auth',
        users: 'http://localhost:8088/api/users',
        patients: 'http://localhost:8083/api/patients',
        appointments: 'http://localhost:8082/api/appointments',
        dossiers: 'http://localhost:8084/api/dossiers',
        consultations: 'http://localhost:8084/api/consultations',
        factures: 'http://localhost:8085/api/factures',
        notifications: 'http://localhost:8086/api/notifications',
        ordonnances: 'http://localhost:8087/api/ordonnances',
        cabinets: 'http://localhost:8088/api/cabinets',
        plans: 'http://localhost:8088/api/plans',
        ai: 'http://localhost:8000/api/ai',
        aiWs: 'ws://localhost:8000/ws/chat'
    }
};
