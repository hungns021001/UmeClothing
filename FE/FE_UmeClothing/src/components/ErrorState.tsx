export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center border-red-200 bg-red-50 px-6 py-12 text-center" role="alert">
      <div className="mb-3 text-4xl" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="text-base font-semibold text-red-900">Đã xảy ra lỗi</h3>
      <p className="mt-1 max-w-lg text-sm text-red-800">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          Thử lại
        </button>
      )}
    </div>
  );
}
