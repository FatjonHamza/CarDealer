export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto py-12 grid gap-3 animate-pulse">
      <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
      <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800 rounded" />
      <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
    </div>
  );
}
