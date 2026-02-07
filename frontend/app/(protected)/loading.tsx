export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        </div>
        <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    </div>
  );
}
