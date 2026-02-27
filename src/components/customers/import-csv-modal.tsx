import { Check, CloudUpload, Download } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import Modal, {
  ButtonSpinner,
  ModalCancelButton,
  ModalFooter,
  ModalSubmitButton,
} from "@/components/ui/modal";
import { importCustomersFromCSV } from "@/server/campaigns";

type EmailList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  lists: EmailList[];
  defaultListId?: string;
};

export default function ImportCSVModal({
  isOpen,
  onClose,
  lists,
  defaultListId,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<
    { firstName: string; lastName: string; email: string }[]
  >([]);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [listId, setListId] = useState(defaultListId || "");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isImporting, startImport] = useTransition();
  const listInputId = useId();

  const [csvDuplicates, setCsvDuplicates] = useState(0);

  const parseCSV = (
    text: string,
  ): { firstName: string; lastName: string; email: string }[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("email") ||
      firstLine.includes("name") ||
      firstLine.includes("first");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    let emailIdx = -1;
    let firstNameIdx = -1;
    let lastNameIdx = -1;

    if (hasHeader) {
      const headerFields = firstLine
        .split(",")
        .map((f) => f.trim().toLowerCase().replace(/^"|"$/g, ""));
      emailIdx = headerFields.findIndex((f) => f.includes("email"));
      firstNameIdx = headerFields.findIndex(
        (f) => f.includes("first") || f === "name",
      );
      lastNameIdx = headerFields.findIndex((f) => f.includes("last"));
    }

    const results: { firstName: string; lastName: string; email: string }[] =
      [];
    const seenEmails = new Set<string>();

    for (const line of dataLines) {
      if (!line.trim()) continue;

      const fields: string[] = [];
      let field = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          fields.push(field.trim());
          field = "";
        } else {
          field += char;
        }
      }
      fields.push(field.trim());

      let email = "";
      let firstName = "";
      let lastName = "";

      if (emailIdx >= 0 && fields[emailIdx]) {
        email = fields[emailIdx].replace(/^"|"$/g, "").trim().toLowerCase();
      }
      if (firstNameIdx >= 0 && fields[firstNameIdx]) {
        firstName = fields[firstNameIdx].replace(/^"|"$/g, "").trim();
      }
      if (lastNameIdx >= 0 && fields[lastNameIdx]) {
        lastName = fields[lastNameIdx].replace(/^"|"$/g, "").trim();
      }

      if (!email) {
        for (const f of fields) {
          const cleaned = f.replace(/^"|"$/g, "").trim();
          if (cleaned.includes("@") && cleaned.includes(".")) {
            email = cleaned.toLowerCase();
            break;
          }
        }
      }

      if (!firstName && firstNameIdx === -1) {
        for (const f of fields) {
          const cleaned = f.replace(/^"|"$/g, "").trim();
          if (cleaned && !cleaned.includes("@")) {
            const parts = cleaned.split(/\s+/);
            firstName = parts[0] || "";
            lastName = parts.slice(1).join(" ") || lastName;
            break;
          }
        }
      }

      if (email && !seenEmails.has(email)) {
        seenEmails.add(email);
        results.push({ email, firstName, lastName });
      }
    }

    return results;
  };

  const countCsvDuplicates = (text: string): number => {
    const lines = text.trim().split(/\r?\n/);
    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("email") ||
      firstLine.includes("name") ||
      firstLine.includes("first");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const emails: string[] = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const match = line.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      );
      if (match) {
        emails.push(match[0].toLowerCase());
      }
    }

    const uniqueEmails = new Set(emails);
    return emails.length - uniqueEmails.size;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFeedback(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTimeout(() => {
        setCsvData(text);
        const duplicates = countCsvDuplicates(text);
        setCsvDuplicates(duplicates);
        const parsed = parseCSV(text);
        setPreview(parsed.slice(0, 5));
        setIsLoading(false);
      }, 300);
    };
    reader.onerror = () => {
      setFeedback({ type: "error", message: "Failed to read file" });
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvData) {
      setFeedback({
        type: "error",
        message: "Please select a CSV file first",
      });
      return;
    }

    const parsed = parseCSV(csvData);
    if (parsed.length === 0) {
      setFeedback({
        type: "error",
        message: "No valid email addresses found in CSV",
      });
      return;
    }

    startImport(async () => {
      const result = await importCustomersFromCSV({
        data: {
          customers: parsed,
          listId: listId || null,
        },
      });

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.message || "Failed to import contacts",
        });
        return;
      }

      toast.success("Import complete", {
        description: `Successfully imported ${result.imported} contacts${result.skipped ? ` (${result.skipped} duplicates skipped)` : ""}`,
      });
      router.invalidate();
      handleClose();
    });
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileChange({
          target: input,
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleClose = () => {
    setFileName(null);
    setPreview([]);
    setCsvData(null);
    setCsvDuplicates(0);
    setFeedback(null);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleDownloadTemplate = () => {
    const csvContent = `first_name,last_name,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
Ada,Lovelace,ada@example.com`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parsedCount = csvData ? parseCSV(csvData).length : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import contacts"
      description="Upload a CSV file with email addresses"
      size="lg"
    >
      <div className="space-y-5">
        {/* Step 1: Upload file */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                1
              </span>
              <span className="text-sm font-medium text-neutral-900">
                Upload CSV file
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              CSV Template
            </button>
          </div>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Drag-drop zone with click handled by child input */}
          <div
            role="presentation"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              fileName
                ? "border-emerald-300 bg-emerald-50"
                : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-modal-input"
            />
            <label htmlFor="csv-modal-input" className="cursor-pointer block">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center">
                    <ButtonSpinner />
                  </div>
                  <p className="text-sm font-medium text-neutral-600">
                    Processing file...
                  </p>
                </div>
              ) : fileName ? (
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">
                    {fileName}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {parsedCount} unique contacts found
                    {csvDuplicates > 0 && (
                      <span className="text-amber-600 ml-1">
                        ({csvDuplicates} duplicates removed)
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                    <CloudUpload className="h-6 w-6 text-neutral-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700">
                    Drop a CSV file here or click to browse
                  </p>
                  <p className="text-xs text-neutral-500">
                    CSV should contain email and optionally name columns
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-600">
                Preview (showing {preview.length} of {parsedCount} unique)
              </p>
              {csvDuplicates > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  {csvDuplicates} duplicate{csvDuplicates !== 1 ? "s" : ""} in
                  file removed
                </span>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-50 text-left text-neutral-500 uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-medium">First Name</th>
                    <th className="px-4 py-2 font-medium">Last Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-neutral-700">
                        {row.firstName || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-neutral-700">
                        {row.lastName || "\u2014"}
                      </td>
                      <td className="px-4 py-2 text-neutral-600">
                        {row.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 2: Select list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                csvData
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-100 text-neutral-400"
              }`}
            >
              2
            </span>
            <span
              className={`text-sm font-medium ${csvData ? "text-neutral-900" : "text-neutral-400"}`}
            >
              Choose destination list
            </span>
          </div>
          <select
            id={listInputId}
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            disabled={!csvData}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
          >
            <option value="">No specific list (general contacts)</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Actions */}
        <ModalFooter>
          <ModalCancelButton onClick={handleClose}>Cancel</ModalCancelButton>
          <ModalSubmitButton
            type="button"
            onClick={handleImport}
            disabled={!csvData || isImporting || isLoading}
          >
            {isImporting ? (
              <>
                <ButtonSpinner />
                Importing...
              </>
            ) : (
              `Import ${parsedCount} contacts`
            )}
          </ModalSubmitButton>
        </ModalFooter>
      </div>
    </Modal>
  );
}
