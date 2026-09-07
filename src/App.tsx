import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import Dashboard from "@/pages/Dashboard"
import Practice from "@/pages/Practice"
import Mistakes from "@/pages/Mistakes"
import Words from "@/pages/Words"
import Statistics from "@/pages/Statistics"
import Settings from "@/pages/Settings"
import Learning from "@/pages/Learning"
import Landing from "@/pages/Landing"
import About from "@/pages/About"

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    element: <AppShell />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/practice", element: <Practice /> },
      { path: "/learning", element: <Learning /> },
      { path: "/mistakes", element: <Mistakes /> },
      { path: "/words", element: <Words /> },
      { path: "/statistics", element: <Statistics /> },
      { path: "/settings", element: <Settings /> },
      { path: "/about", element: <About /> },
      { path: "/dashboard/*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
