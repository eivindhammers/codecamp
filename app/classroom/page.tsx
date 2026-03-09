import ClassroomDashboardClient from "./ClassroomDashboardClient";
import ResponsiveSideNavLayout from "@/components/ResponsiveSideNavLayout";

export default function ClassroomPage() {
  return (
    <ResponsiveSideNavLayout
      title="Classroom"
      links={[
        { href: "#classroom-overview", label: "Overview" },
        { href: "#classroom-leaderboards", label: "Leaderboards" },
        { href: "#classroom-section-activity", label: "Members, assignments & activity" },
      ]}
    >
      <ClassroomDashboardClient />
    </ResponsiveSideNavLayout>
  );
}
