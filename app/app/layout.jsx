import Mascote from "@/components/Mascote";

// Monta o mascote flutuante em toda a área autenticada (/app/*).
export default function AppLayout({ children }) {
  return (
    <>
      {children}
      <Mascote />
    </>
  );
}
