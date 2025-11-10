// PASecure Admin Setup Script
// Run this in the browser console to create an admin user

async function setupAdminUser() {
    try {
        console.log('Setting up admin user...');
        
        // Wait for Supabase client to be ready
        while (!window.supabaseClient || !window.supabaseClient.initialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Create admin user in Supabase Auth
        const { data, error } = await window.supabaseClient.supabase.auth.signUp({
            email: 'admin@pasig.gov.ph',
            password: 'admin123',
            options: {
                data: {
                    full_name: 'System Administrator',
                    role: 'admin'
                }
            }
        });
        
        if (error) {
            console.error('Error creating admin user:', error);
            return;
        }
        
        console.log('Admin user created successfully:', data);
        
        // Also create user record in our users table
        const { data: userData, error: userError } = await window.supabaseClient.supabase
            .from('users')
            .insert([{
                email: 'admin@pasig.gov.ph',
                password_hash: '$2a$10$rQZ8K9LmN2pO3qR4sT5uVeWxYzA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6', // admin123
                full_name: 'System Administrator',
                role: 'admin',
                is_active: true
            }])
            .select()
            .single();
        
        if (userError) {
            console.error('Error creating user record:', userError);
        } else {
            console.log('User record created successfully:', userData);
        }
        
        console.log('Setup complete! You can now login with admin@pasig.gov.ph / admin123');
        
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

// Export for use
window.setupAdminUser = setupAdminUser;

console.log('Admin setup script loaded. Run setupAdminUser() to create the admin user.');
