import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UserNotRegisteredError() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Not Authorized</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your account isn't registered for this workspace yet. Please contact your administrator
          or sign up to create a new account.
        </p>
        <Button onClick={() => (window.location.href = '/register')} className="bg-indigo-600 hover:bg-indigo-700 w-full">
          Go to Sign Up
        </Button>
      </div>
    </div>
  );
}
