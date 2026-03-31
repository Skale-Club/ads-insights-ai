export const features = {
    messageActions: true,
    suggestedActions: true,
    scrollToBottom: true,
    toolCalling: true,
    messageParts: true,
    modelSelection: true,
    autoResizeTextarea: true,
    errorRetry: true,
    dataStreamHandler: true,
    aiSdk: false,
} as const;

export type FeatureFlags = typeof features;
