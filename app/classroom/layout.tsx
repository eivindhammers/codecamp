import type { ReactNode } from "react";
import ResponsiveSideNavLayout from "@/components/ResponsiveSideNavLayout";

export default function ClassroomLayout({ children }: { children: ReactNode }) {
  return (
    <ResponsiveSideNavLayout
      title="Classroom"
      links={[
        { href: "/classroom", label: "Overview" },
        { href: "/classroom/leaderboards", label: "Leaderboards" },
        { href: "/classroom/members", label: "Members" },
        { href: "/classroom/assignments", label: "Assignments" },
      ]}
    >
      {children}
    </ResponsiveSideNavLayout>
  );
}
