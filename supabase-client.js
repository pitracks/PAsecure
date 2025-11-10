// Supabase Client for PASecure
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Supabase client...');
            
            // Load Supabase client library
            if (typeof supabase === 'undefined') {
                console.log('Loading Supabase library...');
                await this.loadSupabaseLibrary();
            }
            
            console.log('Creating Supabase client with URL:', CONFIG.supabase.url);
            this.supabase = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey, {
                auth: {
                    // Disable auto-refresh to prevent auth calls
                    autoRefreshToken: false,
                    // Don't persist session to avoid auth checks
                    persistSession: false,
                    // Don't detect session in URL
                    detectSessionInUrl: false
                }
            });
            this.initialized = true;
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            // Enable REST fallback paths by marking initialized true even if SDK failed
            this.initialized = true;
            this.supabase = null;
        }
    }

    async loadSupabaseLibrary() {
        // Prefer UMD build which exposes global `supabase`
        const cdns = [
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/dist/umd/supabase.js',
            'https://unpkg.com/@supabase/supabase-js@2.38.4/dist/umd/supabase.js',
            // Fallback to ESM via Skypack which also exposes a global shim
            'https://cdn.skypack.dev/@supabase/supabase-js@2.38.4'
        ];

        if (typeof supabase !== 'undefined') {
            console.log('Supabase library already present');
            return;
        }

        console.log('Loading Supabase library from CDN (UMD priority)...');

        const tryLoad = (index) => new Promise((resolve, reject) => {
            if (index >= cdns.length) {
                return reject(new Error('Supabase SDK failed to load from all CDNs'));
            }
            const url = cdns[index];
            const s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = async () => {
                // Wait a tick for global to appear
                let attempts = 0;
                const check = () => {
                    if (typeof supabase !== 'undefined') {
                        console.log('Supabase SDK loaded from', url);
                        resolve();
                        return;
                    }
                    if (++attempts > 20) {
                        console.warn('Supabase global not found after load from', url);
                        // Try next CDN
                        tryLoad(index + 1).then(resolve).catch(reject);
                        return;
                    }
                    setTimeout(check, 50);
                };
                check();
            };
            s.onerror = () => {
                console.warn('Failed loading Supabase SDK from', url);
                tryLoad(index + 1).then(resolve).catch(reject);
            };
            document.head.appendChild(s);
        });

        await tryLoad(0);
    }

    // Authentication methods
    async signIn(email, password) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        // For demo purposes, use simple authentication
        // In production, you would use Supabase Auth
        if (email === 'admin@pasig.gov.ph' && password === 'admin123') {
            // Create a mock user object
            const mockUser = {
                id: 'admin-user-id',
                email: email,
                user_metadata: { full_name: 'System Administrator' },
                role: 'admin'
            };
            
            // Store in session storage
            sessionStorage.setItem('passecure_user', JSON.stringify(mockUser));
            
            return { user: mockUser };
        } else {
            throw new Error('Invalid credentials');
        }
    }

    async signOut() {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        // Clear session storage
        sessionStorage.removeItem('passecure_user');
        
        // Also sign out from Supabase auth if client is available
        if (this.supabase && this.supabase.auth) {
            try {
                await this.supabase.auth.signOut();
            } catch (error) {
                // Ignore auth errors for demo mode
                console.warn('Supabase signOut failed:', error.message);
            }
        }
    }

    async getCurrentUser() {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        // Check session storage first
        const storedUser = sessionStorage.getItem('passecure_user');
        if (storedUser) {
            return JSON.parse(storedUser);
        }
        
        // For public users, don't make any auth calls to avoid 403 errors
        // Only authenticated users (admins) will have data in session storage
        return null;
    }

    // Verification methods
    async createVerification(verificationData) {
        console.log('createVerification called with:', { verificationData, initialized: this.initialized });
        
        if (!this.initialized) {
            console.error('Supabase client not initialized, attempting to initialize...');
            await this.init();
            if (!this.initialized) {
                throw new Error('Supabase client not initialized after retry');
            }
        }
        
        if (this.supabase) {
            console.log('Using Supabase SDK for create...');
            const { data, error } = await this.supabase
                .from('verifications')
                .insert([verificationData])
                .select()
                .single();
            if (error) {
                console.error('Supabase SDK create error:', error);
                throw error;
            }
            console.log('Supabase SDK create success:', data);
            return data;
        }
        
        console.log('Using REST API fallback for create...');
        // REST fallback
        const res = await this.restRequest('/rest/v1/verifications', 'POST', verificationData, { preferReturn: true });
        console.log('REST API create result:', res);
        return Array.isArray(res) ? res[0] : res;
    }

    async getVerifications(limit = 50, offset = 0) {
        console.log('getVerifications called with:', { limit, offset, initialized: this.initialized });
        
        if (!this.initialized) {
            console.error('Supabase client not initialized, attempting to initialize...');
            await this.init();
            if (!this.initialized) {
                throw new Error('Supabase client not initialized after retry');
            }
        }
        
        if (this.supabase) {
            console.log('Using Supabase SDK for getVerifications...');
            const { data, error } = await this.supabase
                .from('verifications')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (error) {
                console.error('Supabase SDK getVerifications error:', error);
                throw error;
            }
            
            console.log('Supabase SDK getVerifications success:', data);
            return data || [];
        }
        
        console.log('Using REST API fallback for getVerifications...');
        // REST fallback
        const res = await this.restRequest(`/rest/v1/verifications?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`, 'GET');
        console.log('REST API getVerifications result:', res);
        return Array.isArray(res) ? res : [];
    }

    async getVerificationById(id) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        const { data, error } = await this.supabase
            .from('verifications')
            .select(`
                *,
                id_cards(*),
                users(full_name, email)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateVerification(id, updates) {
        console.log('updateVerification called with:', { id, updates, initialized: this.initialized });
        
        if (!this.initialized) {
            console.error('Supabase client not initialized, attempting to initialize...');
            await this.init();
            if (!this.initialized) {
                throw new Error('Supabase client not initialized after retry');
            }
        }
        
        if (this.supabase) {
            console.log('Using Supabase SDK for update...');
            const { data, error } = await this.supabase
                .from('verifications')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                console.error('Supabase SDK update error:', error);
                throw error;
            }
            console.log('Supabase SDK update success:', data);
            return data;
        }
        
        console.log('Using REST API fallback for update...');
        // REST fallback (PATCH)
        const res = await this.restRequest(`/rest/v1/verifications?id=eq.${encodeURIComponent(id)}`, 'PATCH', updates, { preferReturn: true });
        console.log('REST API update result:', res);
        return Array.isArray(res) ? res[0] : res;
    }

    // ID Cards methods
    async getIDCards(limit = 50, offset = 0) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        const { data, error } = await this.supabase
            .from('id_cards')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        return data;
    }

    async getIDCardByNumber(idNumber) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        const { data, error } = await this.supabase
            .from('id_cards')
            .select('*')
            .eq('id_number', idNumber)
            .single();
        
        if (error) throw error;
        return data;
    }

    // Analytics methods
    async getVerificationStats() {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        const { data, error } = await this.supabase
            .from('verifications')
            .select('status, confidence_score, created_at');
        
        if (error) throw error;
        
        const stats = {
            total: data.length,
            verified: data.filter(v => v.status === 'verified').length,
            flagged: data.filter(v => v.status === 'flagged').length,
            failed: data.filter(v => v.status === 'failed').length,
            pending: data.filter(v => v.status === 'pending').length,
            avgConfidence: data.reduce((sum, v) => sum + (v.confidence_score || 0), 0) / data.length || 0
        };
        
        return stats;
    }

    async getVerificationTrends(days = 7) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await this.supabase
            .from('verifications')
            .select('created_at, status')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data;
    }

    // System logs methods
    async createLog(level, message, context = {}) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        const payload = [{ level, message, context }];
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('system_logs')
                .insert(payload)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
        const res = await this.restRequest('/rest/v1/system_logs', 'POST', payload, { preferReturn: true });
        return Array.isArray(res) ? res[0] : res;
    }

    async getSystemLogs(limit = 100, offset = 0) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        console.log('Fetching system logs from database...');
        
        const { data, error } = await this.supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) {
            console.error('Error fetching system logs:', error);
            throw error;
        }
        
        console.log('System logs fetched:', data);
        return data || [];
    }

    // Settings methods
    async getSettings() {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        let data;
        if (this.supabase) {
            const res = await this.supabase.from('system_settings').select('*');
            if (res.error) throw res.error;
            data = res.data;
        } else {
            data = await this.restRequest('/rest/v1/system_settings?select=*', 'GET');
        }
        const settings = {};
        (data || []).forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
        });
        return settings;
    }

    async updateSetting(key, value) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        const { data, error } = await this.supabase
            .from('system_settings')
            .update({ setting_value: value })
            .eq('setting_key', key)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // File upload methods
    async uploadFile(file, path) {
        // Try SDK first; if it fails (e.g., CDN blocked), fall back to REST API
        if (!this.initialized || !this.supabase || !this.supabase.storage) {
            return await this.uploadFileViaRest(file, path);
        }

        try {
            const { data, error } = await this.supabase.storage
                .from('id-uploads')
                .upload(path, file, { cacheControl: '3600', upsert: false });

            if (error) throw error;
            return data;
        } catch (err) {
            console.warn('SDK upload failed, falling back to REST:', err?.message || err);
            return await this.uploadFileViaRest(file, path);
        }
    }

    async uploadFileViaRest(file, path) {
        // Upload directly to Supabase Storage REST API
        const url = `${CONFIG.supabase.url}/storage/v1/object/id-uploads/${encodeURIComponent(path)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': CONFIG.supabase.anonKey,
                'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert': 'false'
            },
            body: file
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Storage REST upload failed (${res.status}): ${text}`);
        }

        // REST returns 200 with JSON or empty; normalize response
        return { path };
    }

    async getFileUrl(path) {
        if (!this.initialized) throw new Error('Supabase client not initialized');
        
        if (this.supabase) {
            const { data } = this.supabase.storage
                .from('id-uploads')
                .getPublicUrl(path);
            return data.publicUrl;
        }
        // REST public URL construction (if bucket is public)
        return `${CONFIG.supabase.url}/storage/v1/object/public/id-uploads/${encodeURIComponent(path)}`;
    }

    // Real-time subscriptions
    subscribeToVerifications(callback) {
        if (!this.initialized || !this.supabase) {
            console.warn('Realtime unavailable (SDK not loaded).');
            return { unsubscribe: () => {} };
        }
        return this.supabase
            .channel('verifications')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'verifications' }, 
                callback
            )
            .subscribe();
    }

    subscribeToLogs(callback) {
        if (!this.initialized || !this.supabase) {
            console.warn('Realtime unavailable (SDK not loaded).');
            return { unsubscribe: () => {} };
        }
        return this.supabase
            .channel('system_logs')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'system_logs' }, 
                callback
            )
            .subscribe();
    }

    // Generic REST helper
    async restRequest(path, method = 'GET', body = null, options = {}) {
        const url = `${CONFIG.supabase.url}${path}`;
        const headers = {
            'apikey': CONFIG.supabase.anonKey,
            'Authorization': `Bearer ${CONFIG.supabase.anonKey}`
        };
        if (body != null) headers['Content-Type'] = 'application/json';
        if (options.preferReturn) headers['Prefer'] = 'return=representation';
        const res = await fetch(url, { method, headers, body: body != null ? JSON.stringify(body) : undefined });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`REST ${method} ${path} failed (${res.status}): ${text}`);
        }
        if (res.status === 204) return null;
        return await res.json();
    }
}

// Create global instance
window.supabaseClient = new SupabaseClient();
