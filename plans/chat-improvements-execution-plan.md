# Chat Improvements Execution Plan

## Current State Summary

- **ChatBubble.tsx**: 1455-line monolith, unchanged
- **Already created but dead code**: `MessageActions.tsx`, `SuggestedActions.tsx`, `ToolApprovalDialog.tsx`, `use-scroll-to-bottom.tsx`, `src/types/chat.ts` (MessagePart types), `src/lib/ai/tools.ts` (7 tool definitions)
- **Already integrated**: `ChatAttachments.tsx` (multimodal input)
- **Not started**: AI SDK, feature flags, error classes, data stream handler, DB migration for `parts`, model selector in chat, chat-v2 refactor

---

## Phase 1: Wire Existing Dead Code into ChatBubble.tsx

### 1.1 Integrate Scroll Management
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Replace the current `bottomRef` + `scrollIntoView` approach (lines 276, 893-902, 1278) with `useScrollToBottom` hook
- **Changes**:
  - Import `useScrollToBottom` from `@/hooks/use-scroll-to-bottom`
  - Remove `bottomRef` ref
  - Add `const { containerRef, isAtBottom, scrollToBottom, endRef } = useScrollToBottom()`
  - Replace the scroll `useEffect`s (lines 893-902) - remove them entirely (hook handles auto-scroll)
  - Attach `containerRef` to the message list `<div>` (line 1202)
  - Replace `<div ref={bottomRef} />` (line 1278) with `<div ref={endRef} />`
  - Add "scroll to bottom" button when `!isAtBottom` (ArrowDown icon, positioned absolute bottom-center of message area)

### 1.2 Integrate Message Actions
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Add `MessageActions` to each message bubble
- **Changes**:
  - Import `MessageActions` from `./MessageActions`
  - Wrap each message `<div>` (line 1210) in a `group` class
  - Add `<MessageActions>` after the message content div with:
    - `messageContent={msg.content}`
    - `messageId={msg.id || String(i)}`
    - `role={msg.role}`
    - `onRegenerate` for assistant messages (calls `handleRegenerate`)
    - `onEdit` for user messages (calls `handleEditMessage`)
  - Add `handleRegenerate` function: removes last assistant message, re-sends the last user message
  - Add `handleEditMessage` function: replaces user message content, removes subsequent messages, re-sends

### 1.3 Integrate Suggested Actions
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Show suggested actions when chat is empty/new
- **Changes**:
  - Import `SuggestedActions` from `./SuggestedActions`
  - In the message list area, before the messages map, add condition:
    ```tsx
    {chatMessages.length <= 1 && canChat && (
      <SuggestedActions
        onActionClick={(prompt) => {
          setChatInput(prompt);
          // Auto-send
          setTimeout(() => handleSendMessage(), 0);
        }}
        className="px-1"
      />
    )}
    ```
  - Better approach: set `chatInput` to the prompt and call `handleSendMessage` directly after a microtask

### 1.4 Integrate Tool Approval Dialog
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Wire `ToolApprovalDialog` into the chat flow
- **Changes**:
  - Import `ToolApprovalDialog` from `./ToolApprovalDialog`
  - Import `chatTools` from `@/lib/ai/tools`
  - Add state: `const [pendingToolApproval, setPendingToolApproval] = useState<ToolApprovalRequest | null>(null)`
  - Add `<ToolApprovalDialog>` in the JSX (before closing `</>`)
  - Note: Full tool calling execution requires backend changes (Phase 4), so this phase only wires the UI component. The dialog will be shown when tool calls are detected in AI responses (parsed from SSE stream). For now, add the infrastructure but the actual tool execution flow will be completed in Phase 4.

---

## Phase 2: Database Migration + Message Parts

### 2.1 Add `parts` column to chat_messages
- **File**: `supabase/migrations/20260331_add_parts_to_chat_messages.sql` (new)
- **Action**: Add JSONB column for structured message parts
- **SQL**:
  ```sql
  ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS parts JSONB DEFAULT '[]';
  ```

### 2.2 Update ChatMsg type in ChatBubble.tsx
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Add optional `parts` field to local `ChatMsg` type
- **Changes**: Add `parts?: MessagePart[]` to `ChatMsg` type, import `MessagePart` from `@/types/chat`

### 2.3 Update message rendering
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Render message parts when available, fall back to `content`
- **Changes**: In the message map, check if `msg.parts` exists and render accordingly (text parts, tool call parts with status indicators)

---

## Phase 3: Error Handling & Retry

### 3.1 Create error classes
- **File**: `src/lib/errors.ts` (new)
- **Action**: Define structured error classes
- **Content**: `ChatError`, `RateLimitError`, `NetworkError` classes with codes

### 3.2 Update error handling in ChatBubble.tsx
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Replace generic try/catch with structured error handling
- **Changes**:
  - Import error classes
  - In `streamChat` and `handleSendMessage` catch blocks, use specific error types
  - Add retry button on transient errors (network, rate limit)
  - Show countdown timer for rate limit errors

---

## Phase 4: Feature Flags

### 4.1 Create feature flags config
- **File**: `src/config/features.ts` (new)
- **Action**: Define feature toggle system
- **Content**:
  ```typescript
  export const features = {
    messageActions: true,
    suggestedActions: true,
    scrollToBottom: true,
    toolCalling: false,
    messageParts: true,
    modelSelection: false,
  } as const;
  ```

### 4.2 Guard new features with flags
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Wrap new feature integrations with feature flag checks
- **Changes**: Import `features` and use conditional rendering

---

## Phase 5: Model Selection in Chat

### 5.1 Create model config
- **File**: `src/lib/ai/models.ts` (new)
- **Action**: Define available models with metadata
- **Content**: Export `chatModels` array with id, name, provider, description

### 5.2 Add inline model selector
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Add model selector dropdown in the input area
- **Changes**:
  - Import models config
  - Add state for selected model (initialized from `aiSettings.model`)
  - Add a small `<Select>` component in the input toolbar (above the text input, left-aligned)
  - Pass selected model to `streamChat` instead of `aiSettings.model`
  - When model changes, optionally update `user_ai_settings` in DB

---

## Phase 6: Auto-resize Textarea

### 6.1 Replace Input with auto-resizing Textarea
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Replace `<Input>` (line 1436) with auto-resizing `<textarea>`
- **Changes**:
  - Replace `<Input>` with `<textarea>` with `ref={textareaRef}`
  - Add auto-resize logic (adjust height based on scrollHeight, min 44px, max 200px)
  - Enter sends, Shift+Enter for newline, Escape cancels stream
  - Style to match current input appearance

---

## Phase 7: Data Stream Handler

### 7.1 Create DataStream context
- **File**: `src/contexts/DataStreamContext.tsx` (new)
- **Action**: Context for handling custom data parts from AI stream
- **Content**: Define `DataPart` types (suggestion, chart-data, tool-call) and provider

### 7.2 Integrate into chat
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Parse custom data annotations from AI stream responses
- **Changes**: In the SSE parsing loop, detect non-text data parts and dispatch to DataStream context

---

## Phase 8: AI SDK Migration (Higher Risk)

### 8.1 Install AI SDK packages
- **Action**: `npm install @ai-sdk/react ai`

### 8.2 Create use-chat-v2 hook
- **File**: `src/hooks/use-chat-v2.ts` (new)
- **Action**: Wrapper around `useChat` from AI SDK, configured for Supabase edge function
- **Content**: Configure `useChat` with the analyze-ads endpoint, handle auth headers, map messages

### 8.3 Parallel integration
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Add feature-flagged path that uses `useChat` instead of manual SSE
- **Changes**: When `features.aiSdk` is true, use the new hook; otherwise keep existing implementation

---

## Phase 9: Tool Calling Execution (Higher Risk)

### 9.1 Create tool execution edge function
- **File**: `supabase/functions/google-ads-execute/index.ts` (new)
- **Action**: Edge function that executes approved tool calls against Google Ads API
- **Content**: Accept tool name + params, execute via Google Ads API, return result

### 9.2 Update analyze-ads to support tool calling
- **File**: `supabase/functions/analyze-ads/index.ts`
- **Action**: Pass tool definitions to the AI model, parse tool call responses
- **Changes**: Include `chatTools` schemas in the API request, handle tool_call response parts

### 9.3 Wire tool execution flow in ChatBubble.tsx
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Complete the tool calling loop
- **Changes**:
  - When AI returns a tool call, show `ToolApprovalDialog`
  - On approve, call `google-ads-execute` edge function
  - Send tool result back to AI for final response
  - Display tool execution status in message parts

---

## Phase 10: ChatBubble.tsx Refactor

### 10.1 Extract sub-components
- **Action**: Break the 1455-line monolith into focused components
- **New files**:
  - `src/components/dashboard/chat/ChatPanel.tsx` - Main panel wrapper (resize, open/close)
  - `src/components/dashboard/chat/ChatHeader.tsx` - Header bar
  - `src/components/dashboard/chat/MessageList.tsx` - Message list with scroll
  - `src/components/dashboard/chat/ChatMessage.tsx` - Individual message rendering
  - `src/components/dashboard/chat/ChatInput.tsx` - Input area with attachments, model selector
  - `src/hooks/use-chat-session.ts` - Session management logic (CRUD, loading)
  - `src/hooks/use-chat-context.ts` - Context building logic (builtContext memo)
  - `src/hooks/use-chat-stream.ts` - Streaming logic (streamChat, SSE parsing)

### 10.2 Update imports
- **File**: `src/components/dashboard/ChatBubble.tsx`
- **Action**: Replace monolith with composed sub-components
- **Changes**: ChatBubble.tsx becomes a thin wrapper that composes the extracted components

---

## Execution Order

| Step | Phase | Risk | Effort | Dependencies |
|------|-------|------|--------|-------------|
| 1 | 1.1 Scroll Management | Low | Small | None |
| 2 | 1.2 Message Actions | Low | Small | None |
| 3 | 1.3 Suggested Actions | Low | Small | None |
| 4 | 4 Feature Flags | Low | Small | None |
| 5 | 3 Error Handling | Low | Medium | None |
| 6 | 6 Auto-resize Textarea | Low | Small | None |
| 7 | 5 Model Selection | Medium | Medium | None |
| 8 | 2 DB Migration + Parts | Medium | Medium | None |
| 9 | 1.4 Tool Approval UI | Medium | Small | Phase 4 flags |
| 10 | 7 Data Stream Handler | Medium | Medium | Phase 2 |
| 11 | 8 AI SDK Migration | High | Large | Phases 1-7 |
| 12 | 9 Tool Calling | High | Large | Phase 8 |
| 13 | 10 Refactor | Medium | Large | Phases 1-9 |

Steps 1-7 can be done independently in parallel. Steps 8-10 build on earlier phases. Steps 11-13 are higher risk and should be done last.

---

## Verification

After each phase:
1. Run `npm run lint` to check for errors
2. Run `npm run build` to verify compilation
3. Run `npm run test` to verify existing tests pass
4. Manual test: open chat, send messages, verify new features work

## Build Status

All phases completed successfully. The build passed without errors.
