'use client';

import { adminClientLogin } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, Lock, AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation';

function AdminClientLoginComponent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm">
            <div className="text-center mb-8">
               <div className="w-16 h-16 rounded-2xl bg-blue-600 mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
               </div>
              <h1 className="text-2xl font-black text-white">Admin Client</h1>
              <p className="text-slate-400 mt-1 text-sm font-medium">Deposit Verification Access</p>
            </div>
            <form className="flex flex-col w-full gap-4" action={adminClientLogin}>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Client Username</label>
                <Input className="bg-slate-800 border-slate-700 text-white" name="email" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Client Password</label>
                <Input className="bg-slate-800 border-slate-700 text-white" type="password" name="password" required />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black h-11 mt-2">AUTHORIZE CLIENT</Button>
              {message && <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs">{message}</div>}
            </form>
      </div>
    </div>
  )
}

export default function AdminClientLoginPage() {
  return <Suspense><AdminClientLoginComponent /></Suspense>;
}