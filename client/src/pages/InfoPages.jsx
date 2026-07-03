import { Link } from 'react-router-dom';
import { BookOpenCheck, FileText, Scale, ShieldCheck, Sparkles, Target, UsersRound } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { Footer } from '../components/Footer.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

const updated = '2 July 2026';

function PageShell({ eyebrow, title, intro, icon: Icon, children }) {
  const { settings } = useSiteSettings();
  return <div className="info-page"><header className="public-nav"><Link to="/" aria-label={`${settings.siteName} home`}><Brand /></Link><div><Link className="text-link" to="/login">Log in</Link><Link className="button button-primary" to="/register">Create account</Link></div></header><main className="info-main"><section className="info-hero"><span><Icon />{eyebrow}</span><h1>{title}</h1><p>{intro}</p></section>{children}</main><Footer /></div>;
}

function LegalSections({ sections }) {
  return <div className="legal-layout"><aside><span>On this page</span>{sections.map((section, index) => <a key={section.title} href={`#section-${index + 1}`}>{section.title}</a>)}</aside><article className="legal-document"><div className="legal-updated">Last updated: {updated}</div>{sections.map((section, index) => <section key={section.title} id={`section-${index + 1}`}><h2>{section.title}</h2>{section.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</article></div>;
}

export function About() {
  const { settings } = useSiteSettings();
  return <PageShell eyebrow="About us" title="Practice designed around real exam focus." intro={`${settings.siteName} helps typing aspirants build speed, accuracy and confidence in a clean, exam-style environment.`} icon={UsersRound}><section className="about-story"><div><span>Why we exist</span><h2>Better practice should create better habits.</h2><p>Typing performance is more than a WPM number. It depends on accuracy, consistency, familiarity with the test interface and the ability to stay composed under a timer. Our platform brings those pieces together in one focused workspace.</p><p>Students can practise exam-specific passages, review word-level mistakes and use their result history to understand what to improve next.</p></div><div className="about-mark"><Target /><strong>Accuracy first</strong><small>Speed becomes dependable when clean typing becomes repeatable.</small></div></section><section className="about-values"><article><Sparkles /><h3>Purposeful practice</h3><p>Every screen is designed to reduce distraction and keep attention on the passage.</p></article><article><BookOpenCheck /><h3>Useful feedback</h3><p>Results explain errors clearly instead of showing a score without context.</p></article><article><ShieldCheck /><h3>Student trust</h3><p>Account and performance information is handled with care and transparent controls.</p></article></section></PageShell>;
}

export function Terms() {
  const { settings } = useSiteSettings();
  return <PageShell eyebrow="Legal" title="Terms of Service" intro={`These terms explain the rules for accessing and using ${settings.siteName}.`} icon={Scale}><LegalSections sections={[
    { title: 'Acceptance and eligibility', content: [`By creating an account or using ${settings.siteName}, you agree to these Terms of Service. If you do not agree, do not use the service. You must provide accurate account information and be legally able to accept these terms.`] },
    { title: 'Account responsibilities', content: ['You are responsible for keeping your login credentials confidential and for activity performed through your account. Do not share passwords, attempt to access another account or use the platform in a way that disrupts other users.'] },
    { title: 'Permitted use', content: ['The service is provided for lawful typing practice, learning and performance review. You may not scrape the service, bypass security controls, upload harmful content, interfere with scoring, or copy and redistribute protected platform material without permission.'] },
    { title: 'Tests, scores and availability', content: ['Typing scores are generated from the submitted text and configured evaluation rules. We work to keep calculations reliable, but the service may be updated, interrupted or temporarily unavailable. Features, passages and exam configurations may change over time.'] },
    { title: 'Account suspension and termination', content: ['We may restrict or terminate access when an account violates these terms, threatens platform security or is used unlawfully. You may stop using the service at any time.'] },
    { title: 'Changes and contact', content: [`We may update these terms when the service or applicable requirements change. Continued use after an update means you accept the revised terms. Questions can be sent through the Contact page${settings.supportEmail ? ` or to ${settings.supportEmail}` : ''}.`] }
  ]} /></PageShell>;
}

export function Privacy() {
  const { settings } = useSiteSettings();
  return <PageShell eyebrow="Your data" title="Privacy Policy" intro={`This policy describes how ${settings.siteName} handles account and typing-performance information.`} icon={ShieldCheck}><LegalSections sections={[
    { title: 'Information we collect', content: ['We collect information you provide, such as your name and email address, along with account authentication data. Passwords are stored using secure one-way hashing rather than as readable text.', 'When you take a test, we store the selected exam, paragraph, typed text, timing, keystroke counts and calculated performance metrics needed to show results and analytics.'] },
    { title: 'How information is used', content: ['Information is used to operate accounts, deliver typing tests, calculate results, provide analytics, maintain security, troubleshoot problems and improve the service.'] },
    { title: 'Browser storage', content: ['The website uses browser storage for authentication, theme choices and practice preferences. Clearing browser storage may sign you out or reset preferences. We do not use these preferences to change official exam scoring rules.'] },
    { title: 'Sharing and disclosure', content: ['We do not sell personal information. Information may be processed by hosting, database, email or infrastructure providers that help operate the service, or disclosed when required by law, security or protection of users and the platform.'] },
    { title: 'Retention and security', content: ['Information is retained while needed to provide the service, preserve result history, meet legal obligations or resolve disputes. Reasonable technical and organizational safeguards are used, but no internet service can guarantee absolute security.'] },
    { title: 'Your choices and contact', content: [`You can update supported profile information and delete individual results from your account. For privacy questions or other requests, use the Contact page${settings.supportEmail ? ` or email ${settings.supportEmail}` : ''}.`] }
  ]} /></PageShell>;
}

export function Disclaimer() {
  const { settings } = useSiteSettings();
  return <PageShell eyebrow="Important notice" title="Disclaimer" intro={`Please understand the scope and limitations of the practice tools provided by ${settings.siteName}.`} icon={FileText}><LegalSections sections={[
    { title: 'Independent practice platform', content: [`${settings.siteName} is an independent typing-practice platform. Unless expressly stated, it is not affiliated with, endorsed by or operated by SSC, TCS, NTA or any government department, examination authority or recruiting organization.`] },
    { title: 'Not an official exam result', content: ['Practice scores, WPM, accuracy and error classifications are educational estimates produced by this platform. They are not official marks, qualifications, certificates or guarantees of performance in an actual examination.'] },
    { title: 'Exam patterns may change', content: ['Interfaces, rules, formulas, eligibility requirements and examination patterns may be revised by the relevant authority. Users should verify current requirements through official notifications and websites before relying on any exam-related information.'] },
    { title: 'No guarantee of outcome', content: ['Regular practice can support improvement, but use of the service does not guarantee selection, appointment, rank, score or any other examination or employment outcome.'] },
    { title: 'Limitation of reliance', content: ['The service is provided for practice and informational purposes. You remain responsible for preparation decisions, device suitability, internet access and verification of official exam instructions.'] },
    { title: 'Questions', content: [`If you believe any content or exam configuration needs correction, please report it through the Contact page${settings.supportEmail ? ` or at ${settings.supportEmail}` : ''}.`] }
  ]} /></PageShell>;
}
