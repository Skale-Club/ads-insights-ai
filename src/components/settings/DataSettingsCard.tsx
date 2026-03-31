import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboard } from '@/contexts/DashboardContext';
import { AlertCircle } from 'lucide-react';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const ATTRIBUTION_OPTIONS = [
  { value: '7day', label: '7 days' },
  { value: '14day', label: '14 days' },
  { value: '30day', label: '30 days' },
  { value: '60day', label: '60 days' },
  { value: '90day', label: '90 days' },
];

export function DataSettingsCard() {
  const { timezone, setTimezone, attributionWindow, setAttributionWindow } = useDashboard();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Settings</CardTitle>
        <CardDescription>
          Configure settings to match your Google Ads data for accurate comparison
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Match this with your Google Ads account timezone
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="attribution">Attribution Window</Label>
          <Select value={attributionWindow} onValueChange={(v) => setAttributionWindow(v as any)}>
            <SelectTrigger id="attribution">
              <SelectValue placeholder="Select attribution window" />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Click-through conversions within this window
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-muted p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Numbers may differ from Google Ads UI due to timezone settings, data refresh delays (~15 min), and attribution window differences.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}