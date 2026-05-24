import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, Vote, BarChart3, Settings, Monitor, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem { to: string; label: string; icon: ReactNode; show?: boolean }

export function AppLayout() {
  const { isAdmin, isOrganizer, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = [
    { to: "/inicio", label: "Inicio", icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: "/proyectos", label: "Proyectos", icon: <FolderKanban className="h-5 w-5" />, show: isOrganizer },
    { to: "/registrar-voto", label: "Registrar voto", icon: <Vote className="h-5 w-5" /> },
    { to: "/resultados", label: "Resultados", icon: <BarChart3 className="h-5 w-5" /> },
    { to: "/administracion", label: "Administración", icon: <Settings className="h-5 w-5" />, show: isAdmin },
    { to: "/pantalla-publica", label: "Pantalla pública", icon: <Monitor className="h-5 w-5" /> },
  ].filter(i => i.show !== false);

  const handleSignOut = async () => { await signOut(); navigate({ to: "/login" }); };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-6 border-b border-sidebar-border">
          <Logo variant="dark" size="md" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map(it => {
            const active = location.pathname === it.to || (it.to !== "/inicio" && location.pathname.startsWith(it.to));
            return (
              <Link key={it.to} to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {it.icon}<span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-sidebar-border text-xs space-y-3">
          <div className="opacity-80 truncate">{user?.email}</div>
          <Button variant="secondary" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-sidebar text-sidebar-foreground px-4 h-16">
        <Logo variant="dark" size="sm" />
        <button onClick={() => setOpen(o => !o)} className="p-2 rounded-md hover:bg-sidebar-accent" aria-label="Menú">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 top-16 z-30 bg-sidebar/95 backdrop-blur p-4">
          <nav className="space-y-1">
            {items.map(it => (
              <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sidebar-foreground hover:bg-sidebar-accent">
                {it.icon}<span>{it.label}</span>
              </Link>
            ))}
            <Button variant="secondary" className="w-full mt-4" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
            </Button>
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="lg:pl-64 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-[1500px] mx-auto">
          <Outlet />
        </div>
        <footer className="lg:pl-64 px-6 py-6 text-xs text-muted-foreground text-center border-t border-border mt-10">
          INVENTIVA EAFIT · Periodo 2026-1 · Sistema interno de votación por mesa
        </footer>
      </main>
    </div>
  );
}
