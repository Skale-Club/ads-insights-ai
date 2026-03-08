import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ToolApprovalRequest } from '@/types/chat';

interface ToolApprovalDialogProps {
    request: ToolApprovalRequest | null;
    onApprove: (toolCallId: string) => void;
    onDeny: (toolCallId: string, reason?: string) => void;
    isLoading?: boolean;
}

const riskConfig = {
    low: {
        icon: Info,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label: 'Low Risk',
    },
    medium: {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        label: 'Medium Risk',
    },
    high: {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950',
        borderColor: 'border-red-200 dark:border-red-800',
        label: 'High Risk',
    },
};

const toolDescriptions: Record<string, string> = {
    addNegativeKeyword: 'Add a negative keyword to prevent ads from showing on specific searches',
    adjustBid: 'Modify the bid amount for a campaign, ad group, or keyword',
    pauseCampaign: 'Stop a running campaign from serving ads',
    enableCampaign: 'Resume a paused campaign to start serving ads',
    createBudget: 'Create a new budget that can be assigned to campaigns',
    updateCampaignBudget: 'Change the daily budget allocation for a campaign',
    queryAdsData: 'Retrieve performance data from your Google Ads account',
};

export function ToolApprovalDialog({
    request,
    onApprove,
    onDeny,
    isLoading = false,
}: ToolApprovalDialogProps) {
    const [denyReason, setDenyReason] = useState('');
    const [showDenyInput, setShowDenyInput] = useState(false);

    if (!request) return null;

    const config = riskConfig[request.riskLevel];
    const Icon = config.icon;
    const toolDescription = toolDescriptions[request.toolName] || 'Execute an action on your Google Ads account';

    const handleDeny = () => {
        if (showDenyInput) {
            onDeny(request.toolCallId, denyReason || 'User denied the action');
            setShowDenyInput(false);
            setDenyReason('');
        } else {
            setShowDenyInput(true);
        }
    };

    const handleApprove = () => {
        onApprove(request.toolCallId);
    };

    return (
        <Dialog open={!!request} onOpenChange={() => !isLoading && onDeny(request.toolCallId, 'Dialog closed')}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className={cn('size-5', config.color)} />
                        Action Approval Required
                    </DialogTitle>
                    <DialogDescription>
                        The AI assistant wants to perform an action on your Google Ads account
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className={cn('rounded-lg border p-4', config.bgColor, config.borderColor)}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{request.toolName}</span>
                            <Badge variant={request.riskLevel === 'high' ? 'destructive' : 'secondary'}>
                                {config.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{toolDescription}</p>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-4">
                        <h4 className="font-medium mb-2 text-sm">Action Details:</h4>
                        <pre className="text-xs bg-background rounded p-3 overflow-x-auto">
                            {JSON.stringify(request.input, null, 2)}
                        </pre>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {request.description}
                    </p>

                    {showDenyInput && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason for denying (optional):</label>
                            <textarea
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                placeholder="Enter reason for denial..."
                                value={denyReason}
                                onChange={(e) => setDenyReason(e.target.value)}
                                rows={2}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={handleDeny}
                        disabled={isLoading}
                    >
                        {showDenyInput ? 'Confirm Deny' : 'Deny'}
                    </Button>
                    <Button
                        onClick={handleApprove}
                        disabled={isLoading || request.riskLevel === 'high'}
                        className="gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="size-4" />
                                Approve
                            </>
                        )}
                    </Button>
                </DialogFooter>

                {request.riskLevel === 'high' && (
                    <p className="text-xs text-destructive text-center">
                        High-risk actions require manual confirmation in Google Ads
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
