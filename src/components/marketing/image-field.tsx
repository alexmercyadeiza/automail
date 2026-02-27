import { useId, useState } from "react";
import { uploadEditorImage } from "@/server/campaigns";

type Props = {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
};

export default function ImageField({ label, helper, value, onChange }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputId = useId();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadEditorImage({ data: formData });

      if (!result.ok || !result.url) {
        setUploadError(result.message || "Upload failed");
        return;
      }

      onChange(result.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          className="text-sm font-medium text-neutral-700"
          htmlFor={inputId}
        >
          {label}
        </label>
        <button
          type="button"
          onClick={() => {
            onChange("");
            setFileName(null);
            setUploadError(null);
          }}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
        >
          Clear
        </button>
      </div>
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://cdn.yoursite.com/header.png"
        id={inputId}
        className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
      />
      <p className="text-xs text-neutral-500">{helper}</p>
      <label
        className={`inline-flex w-fit items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors ${
          isUploading
            ? "cursor-wait border-neutral-200 bg-neutral-50 text-neutral-400"
            : "cursor-pointer border-neutral-300 text-neutral-600 hover:border-neutral-400"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={isUploading}
        />
        {isUploading ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
            Uploading...
          </>
        ) : (
          <>
            Upload image
            {fileName && <span className="text-neutral-400">({fileName})</span>}
          </>
        )}
      </label>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
      {value && (
        <div className="relative h-40 overflow-hidden rounded-lg border border-neutral-200/80">
          <img
            src={value}
            alt={`${label} preview`}
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
