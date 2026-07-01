import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AdminLayout } from './layouts/AdminLayout.jsx';
import Home from './pages/Home.jsx'; import AuthPage from './pages/AuthPage.jsx'; import ForgotPassword from './pages/ForgotPassword.jsx'; import ResetPassword from './pages/ResetPassword.jsx'; import Dashboard from './pages/Dashboard.jsx'; import Profile from './pages/Profile.jsx'; import TypingTest from './pages/TypingTest.jsx'; import Result from './pages/Result.jsx'; import ResultsHistory from './pages/ResultsHistory.jsx'; import StudentSettings from './pages/StudentSettings.jsx';
import { Loader } from './components/Loader.jsx';
import AdminOverview from './pages/admin/AdminOverview.jsx'; import ManageExams from './pages/admin/ManageExams.jsx'; import ManageParagraphs from './pages/admin/ManageParagraphs.jsx'; import ManageUsers from './pages/admin/ManageUsers.jsx'; import SettingsPage from './pages/admin/SettingsPage.jsx';
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard.jsx'));
export default function App() { return <Suspense fallback={<Loader label="Loading page…" />}><Routes>
  <Route path="/" element={<Home />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/admin/login" element={<AuthPage mode="login" adminOnly />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
  <Route element={<ProtectedRoute />}><Route element={<AppLayout />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/results" element={<ResultsHistory />} /><Route path="/analytics" element={<AnalyticsDashboard />} /><Route path="/profile" element={<Profile />} /><Route path="/student-settings" element={<StudentSettings />} /><Route path="/result/:id" element={<Result />} /></Route><Route path="/test/:examId" element={<TypingTest />} /></Route>
  <Route element={<ProtectedRoute admin />}><Route path="/admin" element={<AdminLayout />}><Route index element={<AdminOverview />} /><Route path="exams" element={<ManageExams />} /><Route path="paragraphs" element={<ManageParagraphs />} /><Route path="users" element={<ManageUsers />} /><Route path="settings" element={<SettingsPage />} /></Route></Route>
  <Route path="*" element={<main className="empty-state"><h1>Page not found</h1><a href="/">Return home</a></main>} />
  </Routes></Suspense>; }
