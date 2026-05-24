import { useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";

export function LogoutItem() {
  const navigate = useNavigate();
  const handle = async () => {
    await signOut();
    navigate({ to: "/login", search: { redirect: "/" } });
  };
  return (
    <button
      onClick={handle}
      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
    >
      Cerrar sesión
    </button>
  );
}
