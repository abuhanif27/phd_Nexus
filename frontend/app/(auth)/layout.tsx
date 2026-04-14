export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-white px-4 dark:from-gray-900 dark:via-gray-800 dark:to-gray-800">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
