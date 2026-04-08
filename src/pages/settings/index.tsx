import { ProfileSection } from './ProfileSection';
import { AccountSection } from './AccountSection';
import { EnvironmentSection } from './EnvironmentSection';
import { PrivacySection } from './PrivacySection';
import { AISettingsCard } from '@/components/settings/AISettingsCard';
import { AlertSettingsCard } from '@/components/settings/AlertSettings';
import { DataSettingsCard } from '@/components/settings/DataSettingsCard';
import { ClaudeCodeSection } from '@/components/settings/ClaudeCodeSection';
import { CompanySection } from '@/components/settings/CompanySection';
import { MetaAdsSection } from '@/components/settings/MetaAdsSection';
import { MetaClaudeCodeSection } from '@/components/settings/MetaClaudeCodeSection';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, connections, and environment configuration
        </p>
      </div>

      <ProfileSection />
      <AccountSection />

      <div>
        <h2 className="text-lg font-semibold mb-4">Ad Platforms</h2>
        <div className="space-y-4">
          <CompanySection />
          <MetaAdsSection />
        </div>
      </div>

      <AISettingsCard />
      <AlertSettingsCard />
      <DataSettingsCard />
      <ClaudeCodeSection />
      <MetaClaudeCodeSection />
      <EnvironmentSection />
      <PrivacySection />
    </div>
  );
}

export { ProfileSection, AccountSection, EnvironmentSection, PrivacySection };
