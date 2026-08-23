import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Compass, ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NaijaPinsLogo } from '@/components/ui/NaijaPinsLogo';
import { usePageTitle } from '@/hooks/usePageTitle';

export const NotFoundPage: React.FC = () => {
  usePageTitle('Page Not Found');
  const navigate = useNavigate();

  return (
    <main
      id="main-content"
      role="main"
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 text-center animate-fade-in"
    >
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center mb-2">
          <NaijaPinsLogo variant="compact" size="lg" />
        </div>

        <div className="relative inline-flex items-center justify-center">
          <span className="text-8xl sm:text-9xl font-extrabold text-[#0B6B3A]/10 select-none tracking-tighter">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F5EE] border border-[#A3D9BC] flex items-center justify-center text-[#0B6B3A] shadow-xs">
              <MapPin className="w-8 h-8 animate-bounce" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
            Pin Not Found
          </h1>
          <p className="text-sm text-charcoal-muted max-w-sm mx-auto leading-relaxed">
            The story, location, or page you're searching for isn't on our map yet or may have been moved.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto bg-[#0B6B3A] hover:bg-[#064D2A] text-white flex items-center justify-center gap-2"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Button>

          <Link to="/explore" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              className="w-full border-gray-300 text-charcoal-dark hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 text-[#0B6B3A]" />
              <span>Explore Memories</span>
            </Button>
          </Link>
        </div>

        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-muted hover:text-[#0B6B3A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to previous page</span>
          </button>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;
