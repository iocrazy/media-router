from supabase import create_client, Client
from app.core.config import settings

# Client with anon key (respects RLS)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Client with service role key (bypasses RLS, for admin operations)
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
