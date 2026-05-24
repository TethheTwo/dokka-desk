import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { LogoutItem } from "@/components/LogoutItem";
import { ProfileModal } from "@/components/ProfileModal";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import dokkaLogo from "@/assets/dokka-desk-navbar.png";

type MenuKey = "admin" | "asistencias" | "reporte" | "user" | null;

export function AppTopBar() {
  const { profile, user } = useAuth();
  const { can } = usePermissions();

  const showAdmin = can("view_administracion");
  const showAsist = can("view_asistencias");
  const showRep = can("view_reporte");
  const showTickets = can("view_tickets");

  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (k: MenuKey) => setOpenMenu((c) => (c === k ? null : k));

  const username = profile?.username || (user?.email?.split("@")[0] ?? "Usuario");
  const fullName = profile?.full_name || username;
  const initial = (fullName || username || "?").trim().charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url;

  return (
    <header ref={navRef} className="bg-card border-b border-border shadow-sm">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center shrink-0" aria-label="DOKKA Desk — Inicio">
            <img
              src={dokkaLogo}
              alt="DOKKA Desk"
              className="h-9 sm:h-10 w-auto object-contain select-none"
              draggable={false}
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link to="/" className="text-foreground hover:text-[var(--brand-blue)]">
              Inicio
            </Link>
            {showAdmin && (
              <NavDropdown
                label="Administración"
                isOpen={openMenu === "admin"}
                onToggle={() => toggle("admin")}
              >
                <DropdownItem to="/administracion/usuarios">Usuarios</DropdownItem>
                <DropdownItem to="/administracion/roles">Roles</DropdownItem>
                {can("view_dashboard") && (
                  <DropdownItem to="/reportes/dashboard">Dashboard</DropdownItem>
                )}
                {can("view_auditoria") && (
                  <DropdownItem to="/reportes/auditoria">Auditoría</DropdownItem>
                )}
                {can("view_listas") && (
                  <DropdownItem to="/administracion/listas">Listas</DropdownItem>
                )}
              </NavDropdown>
            )}
            {showTickets && (
              <Link
                to="/tickets/listado"
                className="text-foreground hover:text-[var(--brand-blue)]"
              >
                Tickets
              </Link>
            )}
            {showAsist && (
              <NavDropdown
                label="Asistencias"
                isOpen={openMenu === "asistencias"}
                onToggle={() => toggle("asistencias")}
              >
                <DropdownItem to="/asistencias/automotor">Automotor</DropdownItem>
                <DropdownItem to="/asistencias/mascotas">Mascotas</DropdownItem>
                <DropdownItem to="/asistencias/bici">Bici</DropdownItem>
                <DropdownItem to="/asistencias/hogar">Hogar</DropdownItem>
                <DropdownItem to="/asistencias/dental">Dental</DropdownItem>
              </NavDropdown>
            )}
            {showRep && (
              <NavDropdown
                label="Reporte"
                isOpen={openMenu === "reporte"}
                onToggle={() => toggle("reporte")}
              >
                <DropdownItem to="/reportes/accidentes-personales">
                  Accidentes Personales
                </DropdownItem>
                <DropdownItem to="/reportes/casos-generales">Casos Generales</DropdownItem>
              </NavDropdown>
            )}
          </nav>
        </div>
        <div className="relative">
          <button
            onClick={() => toggle("user")}
            className="flex items-center gap-2 text-sm text-foreground hover:text-[var(--brand-blue)]"
          >
            <span className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center bg-[var(--brand-blue)] text-white text-sm font-semibold ring-2 ring-white shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </span>
            <span className="hidden sm:inline">{username}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {openMenu === "user" && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-card shadow-lg py-1 z-20 origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setProfileOpen(true);
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                Mi perfil
              </button>
              <DropdownItem to="/configuracion">Configuración</DropdownItem>
              <div className="my-1 border-t border-border" />
              <LogoutItem />
            </div>
          )}
        </div>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}

function NavDropdown({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-foreground hover:text-[var(--brand-blue)]"
      >
        {label}
        <ChevronDown className="h-4 w-4 text-[var(--brand-blue)]" />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-52 rounded-md border border-border bg-card shadow-lg py-1 z-20 origin-top-left animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({ children, to }: { children: React.ReactNode; to?: string }) {
  const cls = "block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors";
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  return (
    <a href="#" className={cls}>
      {children}
    </a>
  );
}
