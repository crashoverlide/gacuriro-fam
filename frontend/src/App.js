import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Reels from "./pages/Reels";
import Create from "./pages/Create";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import PostDetail from "./pages/PostDetail";
import Settings from "./pages/Settings";
import Followers from "./pages/Followers";
import Following from "./pages/Following";
import Chat from "./pages/Chat";
import MessagesInbox from "./pages/MessagesInbox";
import FamLink from "./pages/FamLink";
import FamTimeline from "./pages/FamTimeline";
import FutureDrops from "./pages/FutureDrops";
import FutureDropCreate from "./pages/FutureDropCreate";
import FutureDropDetail from "./pages/FutureDropDetail";
import LivePerspective from "./pages/LivePerspective";
import LiveRoom from "./pages/LiveRoom";

import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import MobileHeader from "./components/MobileHeader";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
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

function App() {
  return (
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
  );
}

export default App;