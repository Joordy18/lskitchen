'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChefHat, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <Card>
          <CardContent className="pt-12 pb-12">
            <ChefHat className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
            
            <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Page introuvable
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Oops ! Il semble que cette page n'existe pas ou a été déplacée.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/">
                  <Home className="mr-2 h-5 w-5" />
                  Retour à l'accueil
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/search">
                  <Search className="mr-2 h-5 w-5" />
                  Rechercher des recettes
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
