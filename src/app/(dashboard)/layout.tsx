import { Suspense } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { getFilterOptions } from "@/lib/filters";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const options = await getFilterOptions();
  return (
    <div className="flex min-h-svh">
      <Suspense fallback={<aside className="hidden w-[244px] shrink-0 border-r border-border md:block" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b border-border" />}>
          <Topbar options={options} />
        </Suspense>
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
