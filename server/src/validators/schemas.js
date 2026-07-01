import { z } from 'zod';

const email = z.string().trim().email().toLowerCase();
const password = z.string().min(8).max(72).regex(/[A-Za-z]/, 'Must contain a letter').regex(/\d/, 'Must contain a number');
const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

export const registerSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(80), email, password }) });
export const loginSchema = z.object({ body: z.object({ email, password: z.string().min(1) }) });
export const forgotSchema = z.object({ body: z.object({ email }) });
export const resetSchema = z.object({ body: z.object({ token: z.string().min(32), password }) });
export const profileSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(80) }) });
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: password }) });
export const examSchema = z.object({
  body: z.object({ name: z.string().trim().min(2).max(100), organization: z.string().trim().min(2).max(100), language: z.enum(['English', 'Hindi']), durationMinutes: z.coerce.number().int().min(1).max(120), paragraphLength: z.coerce.number().int().min(50), category: z.enum(['SSC', 'Railway', 'Police', 'High Court', 'Banking', 'State PSC', 'Practice']), logo: z.string().trim().regex(/^\/assets\/exams\/[a-z0-9-]+\.svg$/, 'Choose a valid local exam icon'), scoringRule: z.object({ mode: z.enum(['standard-word', 'character']), errorPenalty: z.coerce.number().min(0.1).max(10) }), status: z.enum(['active', 'inactive']).default('active'), description: z.string().trim().max(240).default('') })
});
export const paragraphSchema = z.object({
  body: z.object({ title: z.string().trim().min(2).max(150), content: z.string().trim().min(50), language: z.enum(['English', 'Hindi']), exam: z.string().regex(/^[a-f\d]{24}$/i), difficulty: z.enum(['Easy', 'Medium', 'Hard']) })
});
export const startTestSchema = z.object({ body: z.object({ paragraphId: z.string().regex(/^[a-f\d]{24}$/i) }) });
export const submitSchema = z.object({ body: z.object({ testToken: z.string().min(40), paragraphId: z.string().regex(/^[a-f\d]{24}$/i), typedText: z.string().max(30000), totalKeystrokes: z.coerce.number().int().min(0).max(100000).default(0), backspaceCount: z.coerce.number().int().min(0).max(100000).default(0) }) });
export const settingsSchema = z.object({ body: z.object({ siteName: z.string().trim().min(2).max(60), supportEmail: z.union([z.literal(''), z.string().trim().email()]), announcement: z.string().trim().max(240), maintenanceMode: z.boolean() }) });
export const idSchema = z.object({ params: idParams });
