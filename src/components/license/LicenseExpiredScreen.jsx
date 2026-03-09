'use client';

export default function LicenseExpiredScreen({
  grace = false,
  graceDaysLeft = null,
  message = 'This installation needs a valid license before it can be used.',
}) {
  const hasGraceDays = typeof graceDaysLeft === 'number';
  const graceLabel = grace ? 'Active' : 'Ended';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-600">
          License required
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-gray-900">
          License expired
        </h1>
        <p className="mt-3 text-gray-600">{message}</p>
        {hasGraceDays ? (
          <div className="mt-6 rounded-xl bg-gray-100 p-4 text-sm text-gray-700">
            <p>Grace period: {graceLabel}</p>
            <p>Days remaining: {graceDaysLeft}</p>
          </div>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Retry license check
          </button>
        </div>
      </div>
    </main>
  );
}
