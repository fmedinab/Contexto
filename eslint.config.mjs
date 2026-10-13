// eslint.config.js
// Configuración ESLint flat config (ESLint 9+).
//
// Contexto: este proyecto es JS puro sin build step, servido como
// estáticos. No hay bundler que valide imports ni tipos, así que ESLint
// es la ÚNICA red de seguridad automática antes de deploy (bug B2.5).
//
// setup:  npm install
//         npm run lint
//
// El estilo (indentación 4, comillas simples) ya viene impuesto por
// docs/RULES.md. Prettier se encarga del formateo; ESLint solo de
// lo que de verdad rompe: no-undef, no-unused-vars y los patrones que
// ya causaron bugs reales en este repo.

import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'node_modules/**',
            '.git/**',
            'dist/**',
            'docs/**',
        ],
    },

    // Todo el código de la app: ES modules de navegador.
    {
        files: ['js/**/*.js', 'config/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                // El proyecto carga supabase-js desde jsDelivr como URL ESM
                // (config/supabase.js). Ese import por URL no lo resuelve
                // ningún parser por defecto, así que se declara como
                // variable global en lugar de desactivar la regla.
                supabase: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,

            // --- Corrección ---
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            'no-undef': 'error',

            // --- Correctness: patrones que YA causaron bugs reales ---
            // Un catch vacío traga errores de datos. El proyecto tenía
            // varios (tasksService, evaluationsService, reportsService).
            'no-empty': ['warn', { allowEmptyCatch: false }],

            'no-async-promise-executor': 'error',
            'require-atomic-updates': 'off', // demasiado ruidoso en este código

            // --- Compatibilidad navegador ---
            'no-var': 'error',
            'prefer-const': 'warn',
            eqeqeq: ['warn', 'smart'],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',

            // --- Datos clínicos: nada de console.log en producción ---
            // permitidos: warn, error, info, debug. Prohibido: log (suele
            // usarse para depurar datos de paciente en claro).
            'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
        },
    },
];