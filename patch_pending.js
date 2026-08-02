const fs = require('fs');
let content = fs.readFileSync('app/dashboard/pending/pending-client.tsx', 'utf8');

// Add createClient import
content = content.replace('import { Button } from "@/components/ui/button";', 'import { Button } from "@/components/ui/button";\nimport { createClient } from "@/lib/supabase/client";');

// Replace router.push("/api/logout") with instant optimistic logout
content = content.replace(
  'onClick={() => router.push("/api/logout")}',
  'onClick={() => {\n              router.push("/");\n              const supabase = createClient();\n              supabase.auth.signOut();\n              fetch("/api/logout", { method: "POST" }).catch(() => {});\n            }}'
);

fs.writeFileSync('app/dashboard/pending/pending-client.tsx', content);
