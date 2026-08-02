const fs = require('fs');
let content = fs.readFileSync('app/dashboard/dashboard-client-layout.tsx', 'utf8');

// Add useRouter
content = content.replace('import { usePathname } from "next/navigation";', 'import { usePathname, useRouter } from "next/navigation";');

// Add createClient
content = content.replace('import { signOutAction } from "@/app/actions/auth";', 'import { signOutAction } from "@/app/actions/auth";\nimport { createClient } from "@/lib/supabase/client";');

// Add router instance
content = content.replace('const pathname = usePathname();', 'const pathname = usePathname();\n  const router = useRouter();');

// Replace await signOutAction() with instant logout logic (desktop)
content = content.replace(
  /onClick=\{async \(\) => \{\n\s*console\.log\(`\$\{LOG_PREFIX\} Sign out button clicked`\);\n\s*await signOutAction\(\);\n\s*\}\}/g,
  'onClick={() => {\n              console.log(`${LOG_PREFIX} Sign out button clicked`);\n              router.push("/");\n              const supabase = createClient();\n              supabase.auth.signOut();\n              signOutAction().catch(() => {});\n            }}'
);

// Replace await signOutAction() with instant logout logic (mobile)
content = content.replace(
  /onClick=\{async \(\) => \{\n\s*console\.log\(`\$\{LOG_PREFIX\} Sign out button clicked \(mobile\)`\);\n\s*await signOutAction\(\);\n\s*setSidebarOpen\(false\);\n\s*\}\}/g,
  'onClick={() => {\n              console.log(`${LOG_PREFIX} Sign out button clicked (mobile)`);\n              setSidebarOpen(false);\n              router.push("/");\n              const supabase = createClient();\n              supabase.auth.signOut();\n              signOutAction().catch(() => {});\n            }}'
);

fs.writeFileSync('app/dashboard/dashboard-client-layout.tsx', content);
