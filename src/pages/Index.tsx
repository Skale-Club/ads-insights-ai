// Update this page (the content is just a fallback if you fail to update the page)

import { APP_CONFIG } from '@/config/app';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to {APP_CONFIG.name}</h1>
        <p className="text-xl text-muted-foreground">{APP_CONFIG.description}</p>
      </div>
    </div>
  );
};

export default Index;
