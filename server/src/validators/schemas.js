import { z } from 'zod';
import { examCategories } from '../data/defaultExams.js';

const email = z.string().trim().email().toLowerCase();
const password = z.string().min(8).max(72).regex(/[A-Za-z]/, 'Must contain a letter').regex(/\d/, 'Must contain a number');
const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
const optionalId = z.string().regex(/^[a-f\d]{24}$/i).optional();

export const registerSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(80), email, password }) });
export const loginSchema = z.object({ body: z.object({ email, password: z.string().min(1) }) });
export const forgotSchema = z.object({ body: z.object({ email }) });
export const resetSchema = z.object({ body: z.object({ token: z.string().min(32), password }) });
export const profileSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(80) }) });
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: password }) });
export const examSchema = z.object({
  body: z.object({ name: z.string().trim().min(2).max(100), organization: z.string().trim().min(2).max(100), language: z.enum(['English', 'Hindi']), durationMinutes: z.coerce.number().int().min(1).max(120), paragraphLength: z.coerce.number().int().min(50), category: z.enum(examCategories), logo: z.string().trim().regex(/^(\/assets\/exams\/[a-z0-9-]+\.svg|data:image\/(?:svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/, 'Choose a valid local exam icon or upload a supported image'), scoringRule: z.object({ mode: z.enum(['standard-word', 'character']), errorPenalty: z.coerce.number().min(0.1).max(10) }), status: z.enum(['active', 'inactive']).default('active'), description: z.string().trim().max(240).default('') })
});
export const paragraphSchema = z.object({
  body: z.object({ title: z.string().trim().min(2).max(150), content: z.string().trim().min(50).max(5000), language: z.enum(['English', 'Hindi']), exam: z.string().regex(/^[a-f\d]{24}$/i), difficulty: z.enum(['Easy', 'Medium', 'Hard']) })
});
export const paragraphListSchema = z.object({ query: z.object({ search: z.string().trim().max(100).optional(), exam: optionalId, language: z.enum(['English', 'Hindi']).optional() }) });
export const startTestSchema = z.object({ params: idParams, body: z.object({ paragraphId: z.string().regex(/^[a-f\d]{24}$/i), requestedMode: z.enum(['TCS', 'NTA', 'Custom']).optional(), timerMinutes: z.coerce.number().int().min(1).max(120).optional() }) });
export const launchTestSchema = z.object({ params: idParams, body: z.object({ paragraphId: z.string().regex(/^[a-f\d]{24}$/i) }) });
export const submitSchema = z.object({ body: z.object({ testToken: z.string().min(40), paragraphId: z.string().regex(/^[a-f\d]{24}$/i), typedText: z.string().max(30000), testMode: z.enum(['TCS', 'NTA', 'Custom', 'Standard']), totalKeystrokes: z.coerce.number().int().min(0).max(100000).default(0), backspaceCount: z.coerce.number().int().min(0).max(100000).default(0) }) });
const socialLink = (pattern, message) => z.union([z.literal(''), z.string().trim().max(300).regex(pattern, message)]).default('');
export const settingsSchema = z.object({ body: z.object({ siteName: z.string().trim().min(2).max(60), supportEmail: z.union([z.literal(''), z.string().trim().email()]), contactPhone: z.union([z.literal(''), z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number')]).default(''), addressUrl: socialLink(/^https:\/\/(?:maps\.app\.goo\.gl|(?:www\.)?google\.[a-z.]+\/maps)\/.+/i, 'Enter a valid Google Maps HTTPS URL'), instagramUrl: socialLink(/^https:\/\/(?:www\.)?instagram\.com\/.+/i, 'Enter a valid Instagram HTTPS URL'), whatsappUrl: socialLink(/^https:\/\/(?:wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)\/.+/i, 'Enter a valid WhatsApp HTTPS URL'), youtubeUrl: socialLink(/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/.+/i, 'Enter a valid YouTube HTTPS URL'), announcement: z.string().trim().max(240), maintenanceMode: z.boolean() }) });
export const adminUsersSchema = z.object({ query: z.object({ search: z.string().trim().max(100).optional() }) });
export const idSchema = z.object({ params: idParams });
