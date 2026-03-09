import LearnCatalog from "@/components/LearnCatalog";
import ResponsiveSideNavLayout from "@/components/ResponsiveSideNavLayout";

export default function LearnPage() {
  return (
    <ResponsiveSideNavLayout
      title="Learn"
      links={[
        { href: "#learn-all", label: "All courses" },
        { href: "#learn-beginner", label: "Beginner" },
        { href: "#learn-intermediate", label: "Intermediate" },
        { href: "#learn-advanced", label: "Advanced" },
      ]}
    >
      <div id="learn-all">
        <LearnCatalog />
      </div>
    </ResponsiveSideNavLayout>
  );
}
