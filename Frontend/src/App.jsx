import React, { useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Reveal from './components/ScrollAnimation';
import { PageFallback } from './components/PageLoader';
import { DashboardSkeleton } from './components/ClassicSkeleton';

// Code-split pages for production performance and network loading transitions
const Home = lazy(() => import('./pages/Home'));
const SignUp = lazy(() => import('./pages/Register'));
const SignIn = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documentation = lazy(() => import('./pages/Documentation'));
const FAQSupport = lazy(() => import('./pages/FAQSupport'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function AppContent() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] flex flex-col selection:bg-[#E36A6A]/25 selection:text-[#850E35] overflow-x-hidden">
      <ScrollToTop />
      <Navbar />
      <Reveal key={location.pathname} className="flex-1 flex flex-col">
        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<PageFallback message="Loading Home..." />}>
                  <Home />
                </Suspense>
              }
            />
            <Route
              path="/signup"
              element={
                <Suspense fallback={<PageFallback message="Loading Sign Up..." />}>
                  <SignUp />
                </Suspense>
              }
            />
            <Route
              path="/signin"
              element={
                <Suspense fallback={<PageFallback message="Loading Sign In..." />}>
                  <SignIn />
                </Suspense>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Suspense
                  fallback={
                    <div className="pt-24 pb-16">
                      <DashboardSkeleton theme="syllometry" shimmer={true} />
                    </div>
                  }
                >
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="/documentation"
              element={
                <Suspense fallback={<PageFallback message="Loading Documentation..." />}>
                  <Documentation />
                </Suspense>
              }
            />
            <Route
              path="/faq"
              element={
                <Suspense fallback={<PageFallback message="Loading FAQ & Support..." />}>
                  <FAQSupport />
                </Suspense>
              }
            />
            <Route
              path="/privacy"
              element={
                <Suspense fallback={<PageFallback message="Loading Privacy Policy..." />}>
                  <PrivacyPolicy />
                </Suspense>
              }
            />
            <Route
              path="/terms"
              element={
                <Suspense fallback={<PageFallback message="Loading Terms of Service..." />}>
                  <TermsOfService />
                </Suspense>
              }
            />
            <Route
              path="/404"
              element={
                <Suspense fallback={<PageFallback message="Page Not Found..." />}>
                  <NotFound />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<PageFallback message="Page Not Found..." />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Routes>
        </main>
      </Reveal>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

