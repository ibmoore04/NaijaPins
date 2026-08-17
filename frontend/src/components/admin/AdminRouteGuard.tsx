import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess, hasModulePermission, AdminModule } from '@/config/adminPermissions';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminRouteGuardProps {
  requiredModule?: AdminModule;
  children?: React.ReactNode;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  requiredModule,
  children,
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#0B6B3A] animate-spin" />
        <p className="text-xs font-bold text-charcoal-muted">Verifying administrator credentials...</p>
      </div>
    );
  }

  // Not signed in or not an admin role
  if (!user || !hasAdminAccess(profile?.role)) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-border rounded-3xl shadow-xl text-center space-y-4 animate-scale-up">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-heading font-extrabold text-black">
            Access Restricted
          </h2>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            You must be signed in with an authorized Administrator or Moderator account to access the NaijaPins Admin Portal.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Link to="/explore">
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />} className="rounded-xl font-bold bg-[#0B6B3A]">
              Return to Platform
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check module specific permission
  if (requiredModule && !hasModulePermission(profile?.role, requiredModule)) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-border rounded-3xl shadow-xl text-center space-y-4 animate-scale-up">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-heading font-extrabold text-black">
            Module Permission Required
          </h2>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            Your current role (<strong className="capitalize">{profile?.role?.replace('_', ' ')}</strong>) does not have sufficient permissions to manage this module.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Link to="/admin">
            <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} className="rounded-xl font-bold">
              Back to Admin Overview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
