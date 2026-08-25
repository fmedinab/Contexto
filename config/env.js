// config/env.js
// Variables de entorno de la aplicación.
// IMPORTANTE: Este archivo no debe commitearse a control de versiones.
// Usar un archivo .env local y un script de build para inyectar valores en producción.

const Env = {
    supabase: {
        url: 'https://bpfouoddrdelcqicdnor.supabase.co',
        anonKey: 'sb_publishable_TT386pKgfPIukn7QiqD3ZA_am0SsTKO'
    },
    app: {
        name: 'CONTEXTO',
        tagline: 'Gestión psicológica inteligente',
        developer: 'Frank Medina',
        version: '1.0.0'
    },
    api: {
        timeout: 30000
    },
    storage: {
        tokenKey: 'contexto-auth-token',
        userKey: 'contexto-user',
        themeKey: 'contexto-theme'
    },
    security: {
        sessionTimeout: 30 * 60 * 1000,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000
    },
    ui: {
        toastDuration: 5000,
        paginationMaxVisible: 5
    }
};

export default Env;
