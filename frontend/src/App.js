import React, { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress, useMediaQuery, useTheme } from "@mui/material";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import MobileHeader from "./components/MobileHeader";
import InstallPrompt from "./components/InstallPrompt";
import SplashScreen from "./components/SplashScreen";

const Home = lazy(() => import("./pages/Home"));
const Explore = lazy(() => import("./pages/Explore"));
const Reels = lazy(() => import("./pages/Reels"));
const Create = lazy(() => import("./pages/Create"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Followers = lazy(() => import("./pages/Followers"));
const Following = lazy(() => import("./pages/Following"));
const Chat = lazy(() => import("./pages/Chat"));
const MessagesInbox = lazy(() => import("./pages/MessagesInbox"));
const FamLink = lazy(() => import("./pages/FamLink"));
const FamTimeline = lazy(() => import("./pages/FamTimeline"));
const FutureDrops = lazy(() => import("./pages/FutureDrops"));
const FutureDropCreate = lazy(() => import("./pages/FutureDropCreate"));
const FutureDropDetail = lazy(() => import("./pages/FutureDropDetail"));
const LivePerspective = lazy(() => import("./pages/LivePerspective"));
const LiveRoom = lazy(() => import("./pages/LiveRoom"));

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={28} sx={{ color: "#ff2d8a" }} />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppShell({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {!isMobile && <Sidebar />}
      <Box
        sx={{
          flex: 1,
          ml: isMobile ? 0 : "240px",
          pb: isMobile ? "56px" : 0,
          minHeight: "100vh",
        }}
      >
        {isMobile && <MobileHeader />}
        {children}
      </Box>
      {isMobile && <BottomNav />}
    </Box>
  );
}

function PageLoader() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="50vh"
    >
      <CircularProgress size={28} sx={{ color: "#ff2d8a" }} />
    </Box>
  );
}

function App() {
  const [splash, setSplash] = useState(true);

  return (
    <>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      <InstallPrompt />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Signup />
              </PublicOnly>
            }
          />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppShell>
                  <Home />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <PrivateRoute>
                <AppShell>
                  <Explore />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/reels"
            element={
              <PrivateRoute>
                <AppShell>
                  <Reels />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/create"
            element={
              <PrivateRoute>
                <AppShell>
                  <Create />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <AppShell>
                  <Notifications />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <AppShell>
                  <MessagesInbox />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <PrivateRoute>
                <AppShell>
                  <Chat />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <AppShell>
                  <Settings />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/fam"
            element={
              <PrivateRoute>
                <AppShell>
                  <FamLink />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/fam/:linkId"
            element={
              <PrivateRoute>
                <AppShell>
                  <FamTimeline />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/future-drops"
            element={
              <PrivateRoute>
                <AppShell>
                  <FutureDrops />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/future-drops/new"
            element={
              <PrivateRoute>
                <AppShell>
                  <FutureDropCreate />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/future-drops/:id"
            element={
              <PrivateRoute>
                <AppShell>
                  <FutureDropDetail />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/live"
            element={
              <PrivateRoute>
                <AppShell>
                  <LivePerspective />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/live/:sessionId"
            element={
              <PrivateRoute>
                <AppShell>
                  <LiveRoom />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/post/:postId"
            element={
              <PrivateRoute>
                <AppShell>
                  <PostDetail />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/:username/followers"
            element={
              <PrivateRoute>
                <AppShell>
                  <Followers />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/:username/following"
            element={
              <PrivateRoute>
                <AppShell>
                  <Following />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/:username"
            element={
              <PrivateRoute>
                <AppShell>
                  <Profile />
                </AppShell>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;