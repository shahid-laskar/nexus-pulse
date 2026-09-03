I need to downgrade zod from v4 to v3 across this entire codebase.

1. Run: npm install zod@^3.24.2

2. Then audit every file that imports from 'zod' and fix these v4 → v3 breaking changes:

   - z.email() → z.string().email()
   - z.url() → z.string().url()
   - z.uuid() → z.string().uuid()
   - z.int() → z.number().int()
   - .parse() error format changed — check any catch blocks that 
     read err.issues or err.errors
   - z.object().extend() — verify usage, behavior differs slightly
   - Any .brand() usage needs review
   - z.string().trim() no longer transforms by default in v3 — 
     add .transform(s => s.trim()) explicitly if needed

3. After fixing, run: npx tsc --noEmit
   Fix any remaining TypeScript errors from the downgrade.

4. Then run: npm run test
   Fix any test failures related to zod schema changes.

Do not change anything unrelated to zod. Show me a summary of every 
file changed and what was fixed in each.