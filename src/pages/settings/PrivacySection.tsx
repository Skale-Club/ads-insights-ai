import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PrivacySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Data</CardTitle>
        <CardDescription>How we handle your data</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground">
        <ul className="space-y-2 list-disc pl-4">
          <li>
            We only access the Google Ads data necessary to provide analysis and recommendations.
          </li>
          <li>
            Your OAuth tokens are encrypted and stored securely. They are never exposed to the browser.
          </li>
          <li>
            Campaign data is cached temporarily to reduce API calls and improve performance.
          </li>
          <li>
            You can disconnect your Google Ads account and delete all cached data at any time.
          </li>
          <li>
            We do not share your data with third parties or use it for any purpose other than providing this service.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
