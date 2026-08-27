import { supabase } from '../../config/supabase.js';
import { authService } from './authService.js';

class ProfilesService {
    async getProfile() {
        const user = authService.getCurrentUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            return this._createProfileFromUser(user);
        }
        if (error) throw error;
        return data;
    }

    async _createProfileFromUser(user) {
        const meta = user.user_metadata || {};
        const profile = {
            id: user.id,
            email: user.email,
            full_name: meta.full_name || user.email.split('@')[0],
            dni: meta.dni || null,
            phone: meta.phone || null,
            avatar_url: meta.avatar_url || null,
            birth_date: meta.birth_date || null,
            currency: meta.currency || 'PEN',
            language: meta.language || 'es',
        };

        const { data, error } = await supabase
            .from('profiles')
            .upsert(profile, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateProfile(updates) {
        const user = authService.getCurrentUser();
        if (!user) throw new Error('No hay sesión activa');

        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        await supabase.auth.updateUser({
            data: { full_name: updates.full_name || user.user_metadata?.full_name }
        });

        return data;
    }

    async changePassword(newPassword) {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    }

    async uploadAvatar(file) {
        const user = authService.getCurrentUser();
        if (!user) throw new Error('No hay sesión activa');

        const ext = file.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(path);

        await this.updateProfile({ avatar_url: urlData.publicUrl });
        return urlData.publicUrl;
    }
}

export const profilesService = new ProfilesService();
