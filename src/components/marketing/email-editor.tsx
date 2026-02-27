import { lazy, Suspense, type ComponentProps } from "react";

const BlockNoteEditor = lazy(() => import("./blocknote-editor"));

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200/80 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-neutral-200/80 bg-neutral-50 px-3 py-2">
        <div className="h-7 w-28 bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
      </div>
      <div className="min-h-[300px] p-4">
        <div className="space-y-3">
          <div className="h-4 w-3/4 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-neutral-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function EmailEditor(props: ComponentProps<typeof BlockNoteEditor>) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BlockNoteEditor {...props} />
    </Suspense>
  );
}

export type EmailEditorProps = ComponentProps<typeof BlockNoteEditor>;
