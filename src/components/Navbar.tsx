'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ChefHat, Search, History, User, LogOut } from 'lucide-react';

export const Navbar = () => {
  const { signOut, user } = useAuth();
  const pathname = usePathname();
  
  const navItems = [
    { path: '/', label: 'Accueil', icon: ChefHat },
    { path: '/search', label: 'Recherche', icon: Search },
    { path: '/history', label: 'Historique', icon: History },
    { path: '/profile', label: 'Profil', icon: User },
  ];

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
        <ChefHat className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">LS Kitchen</span>
        </Link>

        <div className="flex items-center space-x-6">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive(path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}

          {user ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>
          ) : (
            
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Link href="/auth">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Connexion</span>
                </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};