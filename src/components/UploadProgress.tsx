interface Props {
  /** 0 – 100 */
  progress: number;
  /** Optional label, e.g. "Uploading students.xlsx" */
  label?: string;
  className?: string;
}

/**
 * Reusable upload progress bar with percentage. Shown while a file upload
 * (or batch import) is running.
 */
export default function UploadProgress({ progress, label, className = '' }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className={`w-full ${className}`}>
      {(label || pct > 0) && (
        <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          <span>{label || 'Uploading…'}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
