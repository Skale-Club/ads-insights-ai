import { ProfileSection } from './ProfileSection';
import { AccountSection } from './AccountSection';
import { EnvironmentSection } from './EnvironmentSection';
import { PrivacySection } from './PrivacySection';
import { AISettingsCard } from '@/components/settings/AISettingsCard';

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
      <AISettingsCard />
      <EnvironmentSection />
      <PrivacySection />
    </div>
  );
}

export { ProfileSection, AccountSection, EnvironmentSection, PrivacySection };
