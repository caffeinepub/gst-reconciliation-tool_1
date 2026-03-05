import { cn } from "@/lib/utils";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface FileUploadZoneProps {
  label: string;
  accept?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  "data-ocid"?: string;
  id?: string;
}

export function FileUploadZone({
  label,
  accept = ".xlsx,.xls,.csv",
  file,
  onFileChange,
  "data-ocid": dataOcid,
  id,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputId = id ?? `upload-${label.toLowerCase().replace(/\s+/g, "-")}`;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    onFileChange(selected);
    // reset so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-foreground cursor-pointer"
      >
        {label}
      </label>
      <label
        htmlFor={inputId}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer",
          "min-h-[140px] flex flex-col items-center justify-center gap-3",
          isDragging
            ? "border-primary bg-primary/5"
            : file
              ? "border-success/40 bg-success/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-ocid={dataOcid}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleChange}
          aria-label={`Upload ${label}`}
        />

        {file ? (
          <>
            <FileSpreadsheet
              className="w-8 h-8 text-success"
              strokeWidth={1.5}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFileChange(null);
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Upload
              className="w-8 h-8 text-muted-foreground"
              strokeWidth={1.5}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop file here or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .xlsx, .xls, .csv
              </p>
            </div>
          </>
        )}
      </label>
    </div>
  );
}
