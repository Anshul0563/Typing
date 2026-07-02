import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx'; import AuthPage from './pages/AuthPage.jsx';
import { Loader } from './components/Loader.jsx';
const AppLayout = lazy(() => import('./layouts/AppLayout.jsx').then((module) => ({ default: module.AppLayout })));
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx').then((module) => ({ default: module.AdminLayout })));
const About = lazy(() => import('./pages/InfoPages.jsx').then((module) => ({ default: module.About })));
const Disclaimer = lazy(() => import('./pages/InfoPages.jsx').then((module) => ({ default: module.Disclaimer })));
const Privacy = lazy(() => import('./pages/InfoPages.jsx').then((module) => ({ default: module.Privacy })));
const Terms = lazy(() => import('./pages/InfoPages.jsx').then((module) => ({ default: module.Terms })));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const WindowsDownload = lazy(() => import('./pages/WindowsDownload.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Exams = lazy(() => import('./pages/Exams.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const TypingTest = lazy(() => import('./pages/TypingTest.jsx'));
const Result = lazy(() => import('./pages/Result.jsx'));
const ResultsHistory = lazy(() => import('./pages/ResultsHistory.jsx'));
const StudentSettings = lazy(() => import('./pages/StudentSettings.jsx'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview.jsx'));
const ManageExams = lazy(() => import('./pages/admin/ManageExams.jsx'));
const ManageParagraphs = lazy(() => import('./pages/admin/ManageParagraphs.jsx'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers.jsx'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage.jsx'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard.jsx'));
export default function App() { return <Suspense fallback={<Loader label="Loading page…" />}><Routes>
  <Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="/contact" element={<Contact />} /><Route path="/download" element={<WindowsDownload />} /><Route path="/terms" element={<Terms />} /><Route path="/privacy" element={<Privacy />} /><Route path="/disclaimer" element={<Disclaimer />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/admin/login" element={<AuthPage mode="login" adminOnly />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
  <Route element={<ProtectedRoute />}><Route element={<AppLayout />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/exams" element={<Exams />} /><Route path="/results" element={<ResultsHistory />} /><Route path="/analytics" element={<AnalyticsDashboard />} /><Route path="/profile" element={<Profile />} /><Route path="/student-settings" element={<StudentSettings />} /><Route path="/result/:id" element={<Result />} /></Route><Route path="/test/:examId" element={<TypingTest />} /></Route>
  <Route element={<ProtectedRoute admin />}><Route path="/admin" element={<AdminLayout />}><Route index element={<AdminOverview />} /><Route path="exams" element={<ManageExams />} /><Route path="paragraphs" element={<ManageParagraphs />} /><Route path="users" element={<ManageUsers />} /><Route path="settings" element={<SettingsPage />} /></Route></Route>
  <Route path="*" element={<main className="empty-state"><h1>Page not found</h1><a href="/">Return home</a></main>} />
  </Routes></Suspense>; }
