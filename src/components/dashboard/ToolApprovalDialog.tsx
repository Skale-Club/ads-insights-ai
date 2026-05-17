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
    // Meta — existing
    queryMetaData: 'Retrieve performance data from your Meta Ads account',
    analyzeCreative: 'Generate creative analysis and ad copy suggestions',
    updateBudget: 'Change the budget for a Meta ad set or campaign',
    // Meta — new (Phase 02)
    createCampaign: 'Create a new Meta campaign (will start PAUSED so you can review before activating)',
    createAdSet: 'Create a new ad set under an existing Meta campaign',
    createAd: 'Create a new ad under an existing ad set (will start PAUSED)',
    duplicateCampaign: 'Duplicate a Meta campaign — optionally including all ad sets and ads (deep copy)',
    duplicateAdSet: 'Duplicate a Meta ad set — optionally into a different campaign',
    updateTargeting: 'Update targeting (geo, age, gender, interests, audiences) on a Meta ad set',
    updateBidStrategy: 'Change the bid strategy on a Meta campaign or ad set',
    updateCreative: 'Update an ad creative (copy, CTA, link, or asset swap)',
    updateSchedule: 'Update ad set start/end dates or dayparting schedule',
    createCustomAudience: 'Create a new Meta custom audience',
    createLookalikeAudience: 'Create a new Meta lookalike audience from a source audience',
    batchPauseEnable: 'Pause or enable multiple Meta entities in one batch (up to 50)',
    createSplitTest: 'Set up a Meta A/B split test (creative, audience, or placement)',
};

const META_APP_REVIEW_GATED = new Set(['createCustomAudience', 'createLookalikeAudience']);

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
    const toolDescription = toolDescriptions[request.toolName] || 'Execute an action on your ads account';

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
                        The AI assistant wants to perform an action on your ads account
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

                    {META_APP_REVIEW_GATED.has(request.toolName) && (
                        <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950 p-3 text-sm">
                            <p className="font-medium text-yellow-900 dark:text-yellow-200">Meta App Review required</p>
                            <p className="text-yellow-800 dark:text-yellow-300 mt-1">
                                This action needs <code className="text-xs">ads_management_standard_access</code> and the <code className="text-xs">custom_audiences</code> scope on your Meta access token. If your app has not completed App Review, the action will fail with a permission error.
                            </p>
                        </div>
                    )}

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
                        disabled={isLoading}
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
                        High-risk actions affect spend — review the details above before approving
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
