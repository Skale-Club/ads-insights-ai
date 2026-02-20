import { useState } from 'react';
import { Check, X, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EnvVar {
  name: string;
  description: string;
  required: boolean;
  isSet: boolean;
}

const mockEnvVars: EnvVar[] = [
  {
    name: 'GOOGLE_CLIENT_ID',
    description: 'OAuth 2.0 Client ID from Google Cloud Console',
    required: true,
    isSet: false,
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'OAuth 2.0 Client Secret',
    required: true,
    isSet: false,
  },
  {
    name: 'GOOGLE_ADS_DEVELOPER_TOKEN',
    description: 'Google Ads API Developer Token',
    required: true,
    isSet: false,
  },
  {
    name: 'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
    description: 'MCC Account ID (without dashes)',
    required: false,
    isSet: false,
  },
  {
    name: 'APP_BASE_URL',
    description: 'Base URL for OAuth redirects',
    required: true,
    isSet: true,
  },
];

export function EnvironmentSection() {
  const [envVars] = useState<EnvVar[]>(mockEnvVars);

  const requiredMissing = envVars.filter((v) => v.required && !v.isSet);
  const allRequiredSet = requiredMissing.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Environment Configuration</CardTitle>
            <CardDescription>Required environment variables for Google Ads API</CardDescription>
          </div>
          <Badge variant={allRequiredSet ? 'default' : 'destructive'}>
            {allRequiredSet ? 'All Set' : `${requiredMissing.length} Missing`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!allRequiredSet && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Configuration Incomplete</p>
              <p className="text-sm text-muted-foreground">
                Add the missing environment variables to enable Google Ads API integration.
              </p>
            </div>
          </div>
        )}

        {envVars.map((envVar) => (
          <div
            key={envVar.name}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  envVar.isSet ? 'bg-success/10' : 'bg-muted'
                )}
              >
                {envVar.isSet ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-medium">{envVar.name}</p>
                  {envVar.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{envVar.description}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            For setup instructions, refer to the Google Ads API documentation:
          </p>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://developers.google.com/google-ads/api/docs/first-call/overview"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Google Ads API Setup Guide
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
