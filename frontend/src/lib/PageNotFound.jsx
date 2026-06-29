import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-indigo-600">404</h1>
        <p className="text-lg text-gray-700 mt-3">Page not found</p>
        <p className="text-sm text-gray-500 mt-1">The page you're looking for doesn't exist.</p>
        <Link to="/">
          <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
