import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AlertThresholds, DEFAULT_ALERT_THRESHOLDS } from '@/types/alerts';

const STORAGE_KEY = 'adsinsight:alertThresholds';

function getStoredThresholds(): AlertThresholds {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_ALERT_THRESHOLDS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[AlertSettings] Failed to parse thresholds:', e);
  }
  return DEFAULT_ALERT_THRESHOLDS;
}

export function AlertSettingsCard() {
  const [thresholds, setThresholds] = useState<AlertThresholds>(getStoredThresholds);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const stored = getStoredThresholds();
    setThresholds(stored);
  }, []);

  const updateThreshold = <K extends keyof AlertThresholds>(key: K, value: AlertThresholds[K]) => {
    const newThresholds = { ...thresholds, [key]: value };
    setThresholds(newThresholds);
    setIsDirty(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newThresholds));
    setIsDirty(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Thresholds</CardTitle>
        <CardDescription>
          Configure when you receive alerts for budget pacing and quality score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="budget-alerts">Budget Alerts</Label>
            <Switch
              id="budget-alerts"
              checked={thresholds.enableBudgetAlerts}
              onCheckedChange={(checked) => updateThreshold('enableBudgetAlerts', checked)}
            />
          </div>
        </div>

        {thresholds.enableBudgetAlerts && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Overspend Alert Threshold</Label>
                <span className="text-sm font-medium">{thresholds.overspendThreshold}%</span>
              </div>
              <Slider
                value={[thresholds.overspendThreshold]}
                onValueChange={([value]) => updateThreshold('overspendThreshold', value)}
                min={100}
                max={200}
                step={10}
                disabled={!thresholds.enableBudgetAlerts}
              />
              <p className="text-sm text-muted-foreground">
                Alert when spend exceeds {thresholds.overspendThreshold}% of expected pace
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Underspend Alert Threshold</Label>
                <span className="text-sm font-medium">{thresholds.underspendThreshold}%</span>
              </div>
              <Slider
                value={[thresholds.underspendThreshold]}
                onValueChange={([value]) => updateThreshold('underspendThreshold', value)}
                min={10}
                max={90}
                step={5}
                disabled={!thresholds.enableBudgetAlerts}
              />
              <p className="text-sm text-muted-foreground">
                Alert when spend is below {thresholds.underspendThreshold}% of expected pace
              </p>
            </div>
          </>
        )}

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="quality-alerts">Quality Score Alerts</Label>
            <Switch
              id="quality-alerts"
              checked={thresholds.enableQualityAlerts}
              onCheckedChange={(checked) => updateThreshold('enableQualityAlerts', checked)}
            />
          </div>
        </div>

        {thresholds.enableQualityAlerts && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Minimum Quality Score</Label>
              <span className="text-sm font-medium">{thresholds.minQualityScore}</span>
            </div>
            <Slider
              value={[thresholds.minQualityScore]}
              onValueChange={([value]) => updateThreshold('minQualityScore', value)}
              min={1}
              max={10}
              step={1}
              disabled={!thresholds.enableQualityAlerts}
            />
            <p className="text-sm text-muted-foreground">
              Alert when keyword quality score is below {thresholds.minQualityScore}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}