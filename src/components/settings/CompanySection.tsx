import { useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const schema = z.object({
  name: z.string().min(1, 'Company name is required').max(100),
  cnpj: z.string().optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  vertical: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const verticals = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'saas', label: 'SaaS / Software' },
  { value: 'agency', label: 'Marketing Agency' },
  { value: 'local_business', label: 'Local Business' },
  { value: 'finance', label: 'Finance / Fintech' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

export function CompanySection() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const vertical = watch('vertical');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setValue('name', data.name ?? '');
        setValue('cnpj', data.cnpj ?? '');
        setValue('website', data.website ?? '');
        setValue('vertical', data.vertical ?? '');
      });
  }, [user?.id, setValue]);

  const onSubmit = async (values: FormData) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('companies')
      .upsert(
        { user_id: user.id, ...values, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Company profile saved' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Company Profile</CardTitle>
        </div>
        <CardDescription>
          Required before connecting ad platforms. Used for compliance and business verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input id="company-name" {...register('name')} placeholder="Acme Corp" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (optional)</Label>
              <Input id="cnpj" {...register('cnpj')} placeholder="XX.XXX.XXX/XXXX-XX" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input id="website" {...register('website')} placeholder="https://acme.com" />
              {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical">Industry</Label>
              <Select value={vertical} onValueChange={(v) => setValue('vertical', v)}>
                <SelectTrigger id="vertical">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {verticals.map((v) => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Company Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
