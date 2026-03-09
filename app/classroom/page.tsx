import ClassroomDashboardClient from "./ClassroomDashboardClient";
import ResponsiveSideNavLayout from "@/components/ResponsiveSideNavLayout";

export default function ClassroomPage() {
  return (
    <ResponsiveSideNavLayout
      title="Classroom"
      links={[
        { href: "#classroom-overview", label: "Overview" },
        { href: "#classroom-archive-governance", label: "Archive governance" },
        { href: "#classroom-risk-audit", label: "Risk policy audit" },
        { href: "#classroom-section-activity", label: "Section activity" },
      ]}
    >
      <ClassroomDashboardClient />
    </ResponsiveSideNavLayout>
  );
}
