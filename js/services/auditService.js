// js/services/auditService.js
// Servicio de registro de auditoría.

import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';

export class AuditService {
    async log(action, module, resourceId = null, oldValues = null, newValues = null) {
        const user = authService.getCurrentUser();
        if (!user) return;

        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action,
                module,
                resource_id: resourceId,
                old_values: oldValues,
                new_values: newValues,
                ip_address: await this._getClientIp(),
                user_agent: navigator.userAgent
            });
        } catch (error) {
            // No bloquear la operación principal si falla el log
            console.error('Error al registrar auditoría:', error);
        }
    }

    async _getClientIp() {
        // En producción, obtener IP desde headers del servidor o Edge Function.
        // En frontend no es posible obtener la IP real del cliente directamente.
        return null;
    }
}

export const auditService = new AuditService();
