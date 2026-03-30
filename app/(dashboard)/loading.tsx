export default function DashboardLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
            <div className="h-3 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-7 w-16 bg-gray-300 rounded mb-2" />
            <div className="h-2.5 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-200 animate-pulse overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 px-6 py-4 border-b border-gray-100">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded ml-auto" />
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
            <div className="h-3 w-40 bg-gray-100 rounded" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-5 w-16 bg-gray-100 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
