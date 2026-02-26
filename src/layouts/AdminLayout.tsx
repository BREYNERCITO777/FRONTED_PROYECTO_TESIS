import React from "react";
import Sidebar from "../components/Sidebar";
import { Topbar } from "./Topbar";


type Props = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Topbar />
        <main style={{ padding: 20 }}>{children}</main>
      </div>
    </div>
  );
}
