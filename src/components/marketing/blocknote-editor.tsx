import {
  type Block,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
import {
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  ChevronDown,
  Minus,
  MousePointerClick,
  Play,
  Variable as VariableIcon,
  Youtube,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { uploadEditorImage } from "@/server/campaigns";

// ============================================================
// EMAIL BUTTON CUSTOM BLOCK
// ============================================================

// Helper to determine text color based on background
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

const EmailButtonBlock = createReactBlockSpec(
  {
    type: "emailButton",
    propSchema: {
      text: { default: "Click Here" },
      href: { default: "https://" },
      buttonColor: { default: "#0ff7c5" },
      buttonWidth: { default: "85%" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { text, href, buttonColor, buttonWidth } = props.block.props;
      const [isEditing, setIsEditing] = useState(false);
      const [editText, setEditText] = useState(text);
      const [editHref, setEditHref] = useState(href);
      const [editColor, setEditColor] = useState(buttonColor);
      const [editWidth, setEditWidth] = useState(buttonWidth);

      const handleSave = () => {
        props.editor.updateBlock(props.block, {
          props: {
            text: editText,
            href: editHref,
            buttonColor: editColor,
            buttonWidth: editWidth,
          },
        });
        setIsEditing(false);
      };

      const handleDelete = () => {
        props.editor.removeBlocks([props.block]);
      };

      return (
        <div className="email-button-block my-4">
          {/* Button Preview */}
          <div style={{ textAlign: "center" }}>
            <a
              href={href}
              onClick={(e) => e.preventDefault()}
              className="rounded-full font-bold transition-opacity hover:opacity-90"
              style={{
                display: "block",
                backgroundColor: buttonColor,
                color: getContrastColor(buttonColor),
                padding: "16px 24px",
                width: buttonWidth,
                maxWidth: "100%",
                boxSizing: "border-box",
                textDecoration: "none",
                fontSize: "16px",
                textAlign: "center",
                margin: "0 auto",
              }}
            >
              {text}
            </a>
          </div>

          {/* Edit/Delete Buttons */}
          {!isEditing && (
            <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-white border border-neutral-200 rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              >
                Edit Button
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}

          {/* Edit Form */}
          {isEditing && (
            <div className="mt-3 p-4 bg-white border border-neutral-200 rounded-lg shadow-sm space-y-3">
              <div>
                <span className="block text-xs font-medium text-neutral-600 mb-1">
                  Button Text
                </span>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-neutral-600 mb-1">
                  Button URL
                </span>
                <input
                  type="url"
                  value={editHref}
                  onChange={(e) => setEditHref(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className="block text-xs font-medium text-neutral-600 mb-1">
                    Color
                  </span>
                  <div className="flex gap-1">
                    {[
                      "#0ff7c5",
                      "#10b981",
                      "#3b82f6",
                      "#8b5cf6",
                      "#f59e0b",
                      "#ef4444",
                      "#000000",
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-7 h-7 rounded-full border-2 ${editColor === color ? "border-neutral-900" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-neutral-600 mb-1">
                    Width
                  </span>
                  <select
                    value={editWidth}
                    onChange={(e) => setEditWidth(e.target.value)}
                    className="rounded border border-neutral-200 px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="auto">Auto</option>
                    <option value="50%">50%</option>
                    <option value="75%">75%</option>
                    <option value="85%">85%</option>
                    <option value="100%">100%</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      );
    },
    // Export HTML for email
    toExternalHTML: (props) => {
      const { text, href, buttonColor, buttonWidth } = props.block.props;
      const textColor = getContrastColor(buttonColor);
      return (
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <a
            href={href}
            style={{
              display: "block",
              backgroundColor: buttonColor,
              color: textColor,
              padding: "16px 24px",
              borderRadius: "47px",
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "16px",
              textAlign: "center",
              width: buttonWidth,
              maxWidth: "100%",
              boxSizing: "border-box" as const,
              margin: "0 auto",
            }}
          >
            {text}
          </a>
        </div>
      );
    },
  },
);

// ============================================================
// HORIZONTAL DIVIDER CUSTOM BLOCK
// ============================================================

const DividerBlock = createReactBlockSpec(
  {
    type: "divider",
    propSchema: {},
    content: "none",
  },
  {
    render: () => (
      <hr
        className="my-6 border-t border-neutral-200"
        style={{ borderTop: "1px solid #e5e5e5" }}
      />
    ),
    toExternalHTML: () => (
      <hr
        style={{
          border: "none",
          borderTop: "1px solid #e5e5e5",
          margin: "24px 0",
        }}
      />
    ),
  },
);

// ============================================================
// YOUTUBE PREVIEW CUSTOM BLOCK
// ============================================================

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

const YouTubePreviewBlock = createReactBlockSpec(
  {
    type: "youtubePreview",
    propSchema: {
      url: { default: "" },
      videoId: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { url, videoId } = props.block.props;
      const [inputUrl, setInputUrl] = useState(url);
      const [isEditing, setIsEditing] = useState(!videoId);

      const handleSave = () => {
        const id = getYouTubeVideoId(inputUrl);
        if (id) {
          props.editor.updateBlock(props.block, {
            props: {
              url: inputUrl,
              videoId: id,
            },
          });
          setIsEditing(false);
        }
      };

      const handleDelete = () => {
        props.editor.removeBlocks([props.block]);
      };

      const thumbnailUrl = videoId
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        : null;

      if (isEditing || !videoId) {
        return (
          <div className="my-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50">
            <div className="flex items-center gap-2 mb-3">
              <Youtube size={20} className="text-red-500" />
              <span className="text-sm font-medium text-neutral-700">
                YouTube Video
              </span>
            </div>
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              className="w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none mb-3"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                Add Video
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="youtube-preview-block my-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative rounded-lg overflow-hidden group"
            onClick={(e) => e.preventDefault()}
          >
            {/* Thumbnail */}
            <img
              src={thumbnailUrl || ""}
              alt="YouTube video thumbnail"
              className="w-full h-auto rounded-lg"
              style={{ maxWidth: "100%" }}
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                <Play size={28} className="text-white ml-1" fill="white" />
              </div>
            </div>
          </a>
          {/* Edit controls */}
          <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-white border border-neutral-200 rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      );
    },
    // Export HTML for email - shows thumbnail with link
    toExternalHTML: (props) => {
      const { url, videoId } = props.block.props;
      const thumbnailUrl = videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : null;

      if (!thumbnailUrl || !url) return <div />;

      return (
        <div style={{ margin: "24px 0", textAlign: "center" }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", position: "relative" }}
          >
            <img
              src={thumbnailUrl}
              alt="Watch on YouTube"
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: "8px",
              }}
            />
          </a>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#dc2626" }}
            >
              ▶ Watch on YouTube
            </a>
          </p>
        </div>
      );
    },
  },
);

// ============================================================
// SCHEMA WITH CUSTOM BLOCKS
// ============================================================

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    emailButton: EmailButtonBlock(),
    divider: DividerBlock(),
    youtubePreview: YouTubePreviewBlock(),
  },
});

type EditorBlock = Block<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

// ============================================================
// CUSTOM SLASH MENU ITEMS
// ============================================================

function getCustomSlashMenuItems(
  editor: typeof schema.BlockNoteEditor,
  insertVariable: (variable: string) => void,
) {
  const defaultItems = getDefaultReactSlashMenuItems(editor);

  // Filter out default items that we're replacing with custom versions
  const filteredDefaults = defaultItems.filter(
    (item) => item.title !== "Emoji",
  );

  // Custom items for email marketing
  const customItems = [
    {
      title: "Email Button",
      subtext: "Insert a styled CTA button",
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: "emailButton" as const }],
          editor.getTextCursorPosition().block,
          "after",
        );
      },
      aliases: ["button", "cta", "action"],
      group: "Email Marketing",
      icon: <MousePointerClick size={18} />,
    },
    {
      title: "Horizontal Divider",
      subtext: "Insert a horizontal line",
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: "divider" as const }],
          editor.getTextCursorPosition().block,
          "after",
        );
      },
      aliases: ["hr", "line", "separator", "divider"],
      group: "Email Marketing",
      icon: <Minus size={18} />,
    },
    {
      title: "YouTube Video",
      subtext: "Insert a YouTube video thumbnail",
      onItemClick: () => {
        editor.insertBlocks(
          [{ type: "youtubePreview" as const }],
          editor.getTextCursorPosition().block,
          "after",
        );
      },
      aliases: ["youtube", "video", "embed"],
      group: "Email Marketing",
      icon: <Youtube size={18} className="text-red-500" />,
    },
    {
      title: "First Name Variable",
      subtext: "Insert {firstname} personalization",
      onItemClick: () => insertVariable("firstname"),
      aliases: ["variable", "firstname", "name"],
      group: "Variables",
      icon: <VariableIcon size={18} />,
    },
    {
      title: "Last Name Variable",
      subtext: "Insert {lastname} personalization",
      onItemClick: () => insertVariable("lastname"),
      aliases: ["variable", "lastname"],
      group: "Variables",
      icon: <VariableIcon size={18} />,
    },
    {
      title: "Email Variable",
      subtext: "Insert {email} personalization",
      onItemClick: () => insertVariable("email"),
      aliases: ["variable", "email", "address"],
      group: "Variables",
      icon: <VariableIcon size={18} />,
    },
  ];

  return [...customItems, ...filteredDefaults];
}

// ============================================================
// EDITOR STYLES FOR VARIABLE HIGHLIGHTING
// ============================================================

const editorStyles = `
  .bn-editor .variable-highlight {
    background-color: #f3e8ff;
    color: #7c3aed;
    padding: 1px 4px;
    border-radius: 4px;
    font-family: ui-monospace, monospace;
  }

  /* Fix light formatting toolbar - make it more visible */
  .bn-formatting-toolbar {
    background-color: #1f2937 !important;
    border: 1px solid #374151 !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }

  .bn-formatting-toolbar button {
    color: #f3f4f6 !important;
  }

  .bn-formatting-toolbar button:hover {
    background-color: #374151 !important;
  }

  .bn-formatting-toolbar button[data-state="on"],
  .bn-formatting-toolbar button[aria-pressed="true"] {
    background-color: #4b5563 !important;
    color: #fff !important;
  }

  .bn-formatting-toolbar [data-separator] {
    background-color: #4b5563 !important;
  }

  /* Dropdown menus in toolbar */
  .bn-formatting-toolbar select,
  .bn-formatting-toolbar [role="combobox"] {
    color: #f3f4f6 !important;
    background-color: #1f2937 !important;
  }
`;

// ============================================================
// MAIN EDITOR COMPONENT
// ============================================================

type Props = {
  value: string;
  onChange: (html: string, blocks: EditorBlock[]) => void;
  initialBlocks?: EditorBlock[];
  placeholder?: string;
};

export default function BlockNoteEditor({
  value: _value,
  onChange,
  initialBlocks,
  placeholder: _placeholder,
}: Props) {
  const [showVariableMenu, setShowVariableMenu] = useState(false);

  // Upload handler for images
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    console.log("Starting upload for file:", file.name, file.type, file.size);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadEditorImage({ data: formData });
      console.log("Upload result:", result);

      if (!result.ok || !result.url) {
        console.error("Upload failed:", result.message);
        throw new Error(result.message || "Upload failed");
      }

      return result.url;
    } catch (error) {
      console.error("Upload exception:", error);
      throw error;
    }
  }, []);

  // Create editor instance
  const editor = useCreateBlockNote({
    schema,
    uploadFile,
    initialContent:
      initialBlocks && initialBlocks.length > 0
        ? // biome-ignore lint/suspicious/noExplicitAny: BlockNote initialContent expects PartialBlock which is not compatible with serialized JSON blocks
          (initialBlocks as any)
        : undefined,
    domAttributes: {
      editor: {
        class: "blocknote-email-editor",
      },
    },
  });

  // Insert variable helper
  const insertVariable = useCallback(
    (variable: string) => {
      editor.insertInlineContent(`{${variable}}`);
      setShowVariableMenu(false);
    },
    [editor],
  );

  // Get slash menu items
  const slashMenuItems = useMemo(
    () => getCustomSlashMenuItems(editor, insertVariable),
    [editor, insertVariable],
  );

  // Handle content changes
  const handleChange = useCallback(async () => {
    // Get HTML for email sending
    const html = await editor.blocksToHTMLLossy(editor.document);
    // Also pass the blocks for potential JSON storage
    onChange(html, editor.document as EditorBlock[]);
  }, [editor, onChange]);

  return (
    <div className="blocknote-editor-wrapper rounded-xl border border-neutral-200/80 overflow-hidden">
      {/* Inject custom styles */}
      <style>{editorStyles}</style>

      {/* Variable Insert Toolbar */}
      <div className="flex items-center gap-2 border-b border-neutral-200/80 bg-neutral-50 px-3 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVariableMenu(!showVariableMenu)}
            className="flex items-center gap-1 rounded-md border border-neutral-200/80 bg-white px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <VariableIcon size={14} />
            Insert Variable
            <ChevronDown size={12} />
          </button>
          {showVariableMenu && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[140px]">
              {["firstname", "lastname", "email"].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                >
                  <code className="text-purple-600 bg-purple-50 px-1 rounded">
                    {`{${variable}}`}
                  </code>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-neutral-400">
          Type <code className="bg-neutral-100 px-1 rounded">/</code> for more
          options
        </span>
      </div>

      {/* BlockNote Editor */}
      <div className="min-h-[300px]">
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          slashMenu={false}
          theme="light"
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(slashMenuItems, query)
            }
          />
        </BlockNoteView>
      </div>
    </div>
  );
}
