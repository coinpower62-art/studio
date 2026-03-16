'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUserStore } from "@/hooks/use-user-store";

export function ReferralProgress() {
  const { referralCount } = useUserStore();
  const maxReferrals = 5;
  const progress = (referralCount / maxReferrals) * 100;

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Referral Progress</CardTitle>
        <CardDescription>Invite 5 friends to unlock Premium Status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 flex flex-col justify-center items-center">
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-muted-foreground text-center">
          {referralCount} of {maxReferrals} friends invited.
        </p>
      </CardContent>
    </Card>
  );
}
