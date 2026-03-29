import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/radar/BottomNav";

const ReijdarChat = lazy(() => import("@/components/radar/ReijdarChat"));

export default function ConsultantLayout() {
  return (
    <div className="min-h-screen bg-background" data-layout="consultant">
      <Navbar />
      <main className="pt-14 md:pt-16 pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <Suspense fallback={null}>
        <ReijdarChat />
      </Suspense>
    </div>
  );
}
