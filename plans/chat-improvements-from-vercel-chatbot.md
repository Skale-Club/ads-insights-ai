# Chat System Improvements - Inspired by Vercel Chatbot

This document outlines improvements that can be adapted from the [Vercel Chatbot](https://github.com/vercel/chatbot) project to enhance the Ads Insights AI chat system.

---

## Executive Summary

After analyzing both projects, the Vercel Chatbot demonstrates several architectural patterns and features that could significantly improve the Ads Insights AI chat experience. The key areas for improvement are:

1. **AI SDK Integration** - Using Vercel AI SDK instead of manual SSE handling
2. **Message Architecture** - Structured message parts instead of plain text
3. **Tool Calling System** - Built-in tool execution with approval flows
4. **UI Components** - More polished input and message components
5. **Scroll Management** - Intelligent scroll-to-bottom behavior
6. **Model Selection** - Multi-provider model selector

---

## Detailed Improvements

### 1. AI SDK Integration (High Priority)

**Current State (Ads Insights AI):**
- Manual SSE parsing in [`ChatBubble.tsx`](../src/components/dashboard/ChatBubble.tsx:897)
- Custom stream handling with `ReadableStream` and `TextDecoder`
- Manual message state management with `useState`

**Vercel Approach:**
- Uses [`@ai-sdk/react`](https://ai-sdk.dev) with `useChat` hook
- Automatic streaming, retry, and error handling
- Built-in message management

**Recommended Changes:**

```typescript
// Instead of manual SSE handling:
import { useChat } from '@ai-sdk/react';

const { messages, sendMessage, status, stop, regenerate } = useChat({
  api: '/api/chat',
  onFinish: () => {
    // Refresh history
  },
});
```

**Benefits:**
- Reduced code complexity (~500 lines less)
- Automatic reconnection and error recovery
- Better TypeScript support
- Built-in loading states

---

### 2. Message Parts Architecture (High Priority)

**Current State:**
- Messages are simple `{ role, content }` objects
- No support for attachments, tool calls, or structured content

**Vercel Approach:**
```typescript
type ChatMessage = UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>;

// Messages have parts:
message.parts = [
  { type: 'text', text: 'Hello' },
  { type: 'file', url: '...', name: 'report.pdf' },
  { type: 'tool-getWeather', input: {...}, output: {...} },
  { type: 'reasoning', text: '...' },
];
```

**Recommended Changes:**

1. Update database schema:
```sql
ALTER TABLE chat_messages ADD COLUMN parts JSONB DEFAULT '[]';
-- Keep content for backward compatibility
```

2. Update TypeScript types:
```typescript
type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'file'; url: string; name: string; mediaType: string }
  | { type: 'tool-queryAds'; input: QueryAdsInput; output?: QueryAdsOutput }
  | { type: 'reasoning'; text: string };

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  createdAt: string;
}
```

**Benefits:**
- Support for multimodal input (images, files)
- Tool call visualization
- Reasoning/chain-of-thought display
- Richer interaction patterns

---

### 3. Tool Calling System (Medium Priority)

**Current State:**
- No tool calling - AI responds with text only
- User must manually apply suggestions

**Vercel Approach:**
- Tools defined with Zod schemas
- Automatic tool execution with approval flows
- Visual tool status indicators

**Recommended Tools for Ads Insights:**

```typescript
// lib/ai/tools/query-ads.ts
export const queryAdsTool = {
  description: 'Query Google Ads data with specific filters',
  parameters: z.object({
    reportType: z.enum(['campaigns', 'keywords', 'search_terms']),
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['>', '<', '=', 'contains']),
      value: z.any(),
    })).optional(),
    limit: z.number().optional(),
  }),
  execute: async ({ reportType, dateRange, filters, limit }) => {
    // Call google-ads-reports function
    return await fetchAdsReport(reportType, dateRange, filters, limit);
  },
};

// lib/ai/tools/add-negative-keyword.ts
export const addNegativeKeywordTool = {
  description: 'Add a negative keyword to campaign or ad group',
  parameters: z.object({
    keyword: z.string(),
    matchType: z.enum(['broad', 'phrase', 'exact']),
    level: z.enum(['campaign', 'adGroup']),
    campaignId: z.string(),
    adGroupId: z.string().optional(),
  }),
  execute: async (params) => {
    // Call google-ads-mutate function
  },
};
```

**UI for Tool Approval:**
```tsx
{toolState === 'approval-requested' && (
  <div className="flex gap-2 p-4 border-t">
    <Button variant="ghost" onClick={() => denyTool(toolCallId)}>
      Deny
    </Button>
    <Button onClick={() => approveTool(toolCallId)}>
      Allow
    </Button>
  </div>
)}
```

**Benefits:**
- AI can take actions (add negative keywords, adjust bids)
- User approval flow for safety
- Visual feedback on tool execution

---

### 4. Scroll Management (Medium Priority)

**Current State:**
- Simple `scrollIntoView` on message changes
- No detection of user scrolling up

**Vercel Approach:**
- [`useScrollToBottom`](../src/hooks/use-scroll-to-bottom.tsx) hook with:
  - MutationObserver for content changes
  - ResizeObserver for layout changes
  - User scroll detection
  - "Scroll to bottom" button when not at bottom

**Recommended Implementation:**

```typescript
// hooks/use-scroll-to-bottom.ts
export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Detect user scrolling
  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current!;
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 100);
    };
    containerRef.current?.addEventListener('scroll', handleScroll, { passive: true });
    return () => containerRef.current?.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Auto-scroll when content changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (isAtBottom) {
        containerRef.current?.scrollTo({ top: Infinity, behavior: 'instant' });
      }
    });
    observer.observe(containerRef.current!, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isAtBottom]);
  
  return { containerRef, isAtBottom, scrollToBottom };
}
```

**UI:**
```tsx
{!isAtBottom && (
  <button
    className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-background p-2 shadow-lg"
    onClick={() => scrollToBottom('smooth')}
  >
    <ArrowDownIcon className="size-4" />
  </button>
)}
```

---

### 5. Multimodal Input Component (Medium Priority)

**Current State:**
- Simple text input with send button
- No file attachment support

**Vercel Approach:**
- [`MultimodalInput`](../src/components/dashboard/ChatBubble.tsx) component with:
  - File attachments via button or drag-and-drop
  - Image paste from clipboard
  - Attachment previews with remove option
  - Auto-resize textarea

**Recommended Features:**

1. **File Attachments:**
```tsx
const [attachments, setAttachments] = useState<Attachment[]>([]);

const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { url } = await fetch('/api/files/upload', { method: 'POST', body: formData });
  setAttachments(prev => [...prev, { url, name: file.name, contentType: file.type }]);
};
```

2. **Auto-resize Textarea:**
```tsx
<textarea
  ref={textareaRef}
  rows={1}
  style={{ minHeight: 44, maxHeight: 200 }}
  className="resize-none overflow-y-auto"
/>
```

3. **Keyboard Shortcuts:**
- Enter to send
- Shift+Enter for new line
- Escape to cancel stream

---

### 6. Model Selection (Low Priority)

**Current State:**
- Single model (Gemini 2.5 Flash)
- Model setting in Settings page

**Vercel Approach:**
- Inline model selector in input area
- Multiple providers (OpenAI, Anthropic, Google, xAI)
- Model descriptions

**Recommended Implementation:**

```typescript
// lib/ai/models.ts
export const chatModels = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'anthropic' },
];
```

```tsx
// Model selector in input toolbar
<Select value={selectedModel} onValueChange={setSelectedModel}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {chatModels.map(model => (
      <SelectItem key={model.id} value={model.id}>
        {model.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

### 7. Message Actions (Low Priority)

**Current State:**
- No message actions

**Vercel Approach:**
- Copy message
- Edit and resend user messages
- Regenerate assistant responses
- Thumbs up/down voting

**Recommended Actions:**

```tsx
<div className="opacity-0 group-hover:opacity-100 flex gap-1">
  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(message.content)}>
    <CopyIcon className="size-4" />
  </Button>
  {message.role === 'user' && (
    <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
      <PencilIcon className="size-4" />
    </Button>
  )}
  {message.role === 'assistant' && (
    <Button variant="ghost" size="icon" onClick={() => regenerate(message.id)}>
      <RefreshIcon className="size-4" />
    </Button>
  )}
</div>
```

---

### 8. Suggested Actions / Quick Prompts (Low Priority)

**Current State:**
- Empty state shows welcome message only

**Vercel Approach:**
- Suggested actions appear when chat is empty
- Click to send pre-defined prompts

**Recommended Implementation:**

```tsx
const suggestedActions = [
  { label: 'Analyze top campaigns', prompt: 'Which campaigns have the best ROAS?' },
  { label: 'Find wasted spend', prompt: 'Show keywords with high spend and no conversions' },
  { label: 'Negative keyword suggestions', prompt: 'What search terms should I add as negatives?' },
];

{messages.length === 0 && (
  <div className="flex flex-wrap gap-2">
    {suggestedActions.map(({ label, prompt }) => (
      <Button
        variant="outline"
        onClick={() => sendMessage({ role: 'user', parts: [{ type: 'text', text: prompt }] })}
      >
        {label}
      </Button>
    ))}
  </div>
)}
```

---

### 9. Data Stream Handler (Medium Priority)

**Current State:**
- Direct SSE parsing in component

**Vercel Approach:**
- [`DataStreamProvider`](../src/components/dashboard/ChatBubble.tsx) context
- Handles custom data parts (artifacts, suggestions, etc.)

**Recommended Implementation:**

```tsx
// contexts/DataStreamContext.tsx
type DataPart = 
  | { type: 'suggestion'; suggestion: NegativeKeywordSuggestion }
  | { type: 'chart-data'; data: ChartData }
  | { type: 'append-message'; message: string };

const DataStreamContext = createContext<DataPart[]>([]);

export function DataStreamProvider({ children }) {
  const [dataStream, setDataStream] = useState<DataPart[]>([]);
  return (
    <DataStreamContext.Provider value={{ dataStream, setDataStream }}>
      {children}
    </DataStreamContext.Provider>
  );
}
```

---

### 10. Error Handling & Retry (Medium Priority)

**Current State:**
- Toast notification on error
- No retry mechanism

**Vercel Approach:**
- Custom error classes
- Automatic retry for transient errors
- Error boundary with fallback UI

**Recommended Implementation:**

```typescript
// lib/errors.ts
export class ChatbotError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export class RateLimitError extends ChatbotError {
  constructor(retryAfter: number) {
    super(`Rate limited. Try again in ${retryAfter} seconds.`, 'RATE_LIMIT');
  }
}

// In useChat:
onError: (error) => {
  if (error instanceof RateLimitError) {
    // Show countdown timer
  } else if (error instanceof ChatbotError) {
    toast({ description: error.message });
  }
}
```

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 High | AI SDK Integration | High | High |
| 🔴 High | Message Parts Architecture | Medium | High |
| 🟡 Medium | Tool Calling System | High | High |
| 🟡 Medium | Scroll Management | Low | Medium |
| 🟡 Medium | Multimodal Input | Medium | Medium |
| 🟡 Medium | Data Stream Handler | Medium | Medium |
| 🟡 Medium | Error Handling & Retry | Low | Medium |
| 🟢 Low | Model Selection | Low | Low |
| 🟢 Low | Message Actions | Low | Low |
| 🟢 Low | Suggested Actions | Low | Low |

---

## Architecture Comparison

### Current Architecture
```
ChatBubble.tsx (1371 lines)
├── Manual SSE parsing
├── useState for messages
├── Custom stream handling
└── Inline context building
```

### Recommended Architecture
```
components/
├── chat/
│   ├── ChatContainer.tsx      # Main chat wrapper
│   ├── Messages.tsx           # Message list with scroll
│   ├── Message.tsx            # Individual message
│   ├── MessageActions.tsx     # Copy, edit, regenerate
│   ├── MultimodalInput.tsx    # Input with attachments
│   ├── SuggestedActions.tsx   # Quick prompts
│   └── ToolCall.tsx           # Tool execution UI
├── ai-elements/
│   ├── model-selector.tsx     # Model picker
│   └── prompt-input.tsx       # Input primitives
hooks/
├── use-chat.ts               # Wrapper around @ai-sdk/react
├── use-scroll-to-bottom.ts   # Smart scroll behavior
└── use-messages.ts           # Message utilities
lib/
├── ai/
│   ├── models.ts             # Available models
│   └── tools/
│       ├── query-ads.ts      # Fetch ads data
│       └── add-negative.ts   # Add negative keywords
└── types/
    └── chat.ts               # Message types
```

---

## Migration Path (Non-Breaking Approach)

> **Principle**: All improvements will be implemented incrementally alongside existing code. The current chat system will continue working while new features are added. Feature flags will control rollout.

### Phase 1: Parallel Infrastructure
**Goal**: Add new capabilities without touching existing ChatBubble.tsx

1. **Install new dependencies** (additive only)
   ```bash
   npm install @ai-sdk/react ai
   ```

2. **Create new hooks alongside existing ones**
   - `src/hooks/use-chat-v2.ts` - New hook using AI SDK
   - `src/hooks/use-scroll-to-bottom.ts` - Smart scroll behavior
   - Feature flag: `VITE_ENABLE_CHAT_V2=false` (default off)

3. **Create new components in parallel**
   - `src/components/chat-v2/` directory
   - New ChatContainer, Messages, MultimodalInput components
   - Existing ChatBubble.tsx remains untouched

4. **Database migration (backward compatible)**
   ```sql
   -- Add parts column, keep content for backward compatibility
   ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS parts JSONB DEFAULT '[]';
   -- Don't remove content column
   ```

### Phase 2: Gradual Feature Rollout
**Goal**: Enable new features one at a time with fallbacks

1. **Scroll Management** (lowest risk)
   - Add `useScrollToBottom` hook
   - Update existing ChatBubble to use it
   - Can be rolled back instantly

2. **Message Parts Support**
   - Update message rendering to check for `parts` first
   - Fall back to `content` if parts is empty
   - Existing messages continue to display correctly

3. **Multimodal Input**
   - Add file attachment UI
   - Store attachments in new `attachments` table
   - Text-only messages work exactly as before

### Phase 3: Tool Calling (Optional Feature)
**Goal**: Add action capabilities as opt-in feature

1. **Define tool schemas** (no changes to existing code)
   ```typescript
   // lib/ai/tools/query-ads.ts
   export const queryAdsTool = { ... };
   ```

2. **Add tool execution endpoint**
   - New Supabase function: `google-ads-execute`
   - Does not modify existing `analyze-ads` function

3. **Tool approval UI**
   - New component: `ToolApprovalDialog.tsx`
   - Only appears when tools are triggered
   - User can disable tools in settings

### Phase 4: Model Selection (Settings-based)
**Goal**: Support multiple models without breaking existing config

1. **Extend user_ai_settings table**
   ```sql
   ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS available_models TEXT[] DEFAULT ARRAY['gemini-2.5-flash'];
   ```

2. **Model selector in chat input**
   - Falls back to preferred_model if not selected
   - Existing users see no change

3. **Provider support**
   - Start with Gemini (existing)
   - Add OpenAI, Anthropic as optional providers
   - User must provide their own API keys for additional providers

---

## Rollback Strategy

Each phase includes instant rollback capability:

| Feature | Rollback Method |
|---------|----------------|
| AI SDK | Set `VITE_ENABLE_CHAT_V2=false` |
| Scroll | Remove hook import |
| Parts | Hide with CSS, fall back to content |
| Tools | Set `enableTools: false` in settings |
| Models | Default to existing preferred_model |

---

## Testing Strategy

1. **Parallel Testing**: New features tested in `chat-v2` route first
2. **Feature Flags**: Each feature has individual flag
3. **A/B Testing**: Can enable for subset of users
4. **Monitoring**: Error tracking for new vs old implementations

---

## Implementation Order (Safe Sequence)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCROLL MANAGEMENT (Lowest Risk)                          │
│    - Add useScrollToBottom hook                             │
│    - Add scroll-to-bottom button                            │
│    - No changes to message handling                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. MESSAGE ACTIONS (Low Risk)                               │
│    - Add copy, regenerate buttons                           │
│    - Purely additive UI                                     │
│    - No backend changes                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SUGGESTED ACTIONS (Low Risk)                             │
│    - Add quick prompt buttons                               │
│    - Only appears on empty chat                             │
│    - No backend changes                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. MULTIMODAL INPUT (Medium Risk)                           │
│    - Add file upload UI                                     │
│    - Add parts column to database                           │
│    - Backward compatible with text-only                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. MODEL SELECTION (Medium Risk)                            │
│    - Add model selector UI                                  │
│    - Extend settings table                                  │
│    - Default to existing config                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. AI SDK MIGRATION (Higher Risk)                           │
│    - Create parallel chat-v2 implementation                 │
│    - Feature flag to switch                                 │
│    - Keep old implementation as fallback                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. TOOL CALLING (Higher Risk)                               │
│    - Add tool definitions                                   │
│    - Add execution endpoint                                 │
│    - Add approval UI                                        │
│    - Opt-in feature                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Flags

```typescript
// src/config/features.ts
export const features = {
  // Chat improvements
  chatV2: import.meta.env.VITE_ENABLE_CHAT_V2 === 'true',
  scrollToBottom: import.meta.env.VITE_ENABLE_SCROLL_TO_BOTTOM !== 'false',
  messageActions: import.meta.env.VITE_ENABLE_MESSAGE_ACTIONS !== 'false',
  suggestedActions: import.meta.env.VITE_ENABLE_SUGGESTED_ACTIONS !== 'false',
  multimodalInput: import.meta.env.VITE_ENABLE_MULTIMODAL_INPUT === 'true',
  modelSelection: import.meta.env.VITE_ENABLE_MODEL_SELECTION === 'true',
  toolCalling: import.meta.env.VITE_ENABLE_TOOL_CALLING === 'true',
};
```

---

## Decision: Keep Existing Implementation

Based on user feedback, the approach is:

1. ✅ **Do everything** - Implement all improvements
2. ✅ **Don't break what works** - Keep existing ChatBubble.tsx working
3. ✅ **Incremental rollout** - Add features one at a time
4. ✅ **Feature flags** - Allow instant rollback
5. ✅ **Parallel implementation** - New code alongside old code

The existing chat system will remain functional throughout the migration. New features will be added incrementally with the ability to toggle them on/off.
