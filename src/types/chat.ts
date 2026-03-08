export type MessagePart =
    | { type: 'text'; text: string }
    | { type: 'file'; url: string; name: string; mediaType: string }
    | ToolCallPart
    | { type: 'reasoning'; text: string };

export interface ToolCallPart {
    type: `tool-${string}`;
    toolCallId: string;
    toolName: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    state: 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-denied';
    approval?: {
        id: string;
        approved?: boolean;
        reason?: string;
    };
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    parts?: MessagePart[];
    createdAt: string;
}

export interface ToolApprovalRequest {
    toolCallId: string;
    toolName: string;
    input: Record<string, unknown>;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
}

export interface ToolExecutionResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

export const suggestedActions = [
    {
        label: 'Analyze top campaigns',
        prompt: 'Which campaigns have the best ROAS and why?',
        icon: 'BarChart3' as const,
    },
    {
        label: 'Find wasted spend',
        prompt: 'Show me keywords with high spend and zero conversions in the last 30 days',
        icon: 'Search' as const,
    },
    {
        label: 'Negative keyword suggestions',
        prompt: 'Based on search terms data, what negative keywords should I add to improve campaign efficiency?',
        icon: 'FilterX' as const,
    },
    {
        label: 'Budget recommendations',
        prompt: 'Analyze my budget utilization and suggest optimizations',
        icon: 'DollarSign' as const,
    },
];

export type SuggestedAction = typeof suggestedActions[number];
