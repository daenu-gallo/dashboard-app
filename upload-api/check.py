import os, json
import urllib.request

env_vars = {}
with open('.env') as f:
    for line in f:
        if line.strip() and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k] = v

url = f"{env_vars['VITE_SUPABASE_URL']}/rest/v1/gallery_comments?limit=1"
req = urllib.request.Request(url, headers={
    'apikey': env_vars['VITE_SUPABASE_ANON_KEY'],
    'Authorization': f"Bearer {env_vars['VITE_SUPABASE_ANON_KEY']}"
})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
