"use client";

export default function MainError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-main-bg px-6">
      <div className="text-center">
        <p className="text-4xl font-bold text-main-text mb-2">Oops</p>
        <p className="text-sm text-muted mb-6">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-200 active:scale-95"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
