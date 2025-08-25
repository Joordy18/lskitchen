'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Navbar } from '@/components/Navbar';
import { Clock, Users, ArrowLeft, ChefHat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';



interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string;
  dietary_restrictions: string[];
  allergens: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  calories: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

function RecipeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id && user) {
      fetchRecipe();
    }
  }, [params.id, user]);

  const fetchRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Erreur lors du chargement de la recette:', error);
        setRecipe(null);
      } else {
        setRecipe(data);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <div>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Recette introuvable</h1>
          <Button onClick={() => router.push('/results')}>
            Retourner à la recherche
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/history')}
          className="mb-6 flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour</span>
        </Button>

        <div className="space-y-6">
          {/* En-tête de la recette */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl font-bold flex items-center space-x-3">
                    <ChefHat className="h-8 w-8 text-primary" />
                    <span>{recipe.title}</span>
                  </CardTitle>
                  <CardDescription className="text-lg mt-2">
                    {recipe.description}
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">
                    Préparation: {recipe.prep_time} min
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">
                    Cuisson: {recipe.cook_time} min
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{recipe.servings} personnes</span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* <Users className="h-5 w-5 text-muted-foreground" /> */}
                  <span className="text-sm">{recipe.calories} kcal</span>
                </div>
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {getDifficultyText(recipe.difficulty)}
                </Badge>
              </div>

              {(recipe.dietary_restrictions.length > 0 || recipe.allergens.length > 0) && (
                <div className="space-y-2 mt-4">
                  {recipe.dietary_restrictions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Régimes:</span>
                      {recipe.dietary_restrictions.map((restriction) => (
                        <Badge key={restriction} variant="secondary">
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {recipe.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Allergènes:</span>
                      {recipe.allergens.map((allergen) => (
                        <Badge key={allergen} variant="destructive">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ingrédients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Ingrédients</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {recipe.instructions
                      .split(/\s*(?=\d+\.\s)/)
                      .filter(step => step.trim() !== '')
                      .map((step, index) => {
                        const cleanedStep = step.replace(/^\d+\.\s*/, '');
                        return (
                          <div key={index} className="mb-4">
                            <div className="flex items-start space-x-3">
                              <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <p className="text-sm leading-relaxed">{cleanedStep}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center space-x-4">
                <Button onClick={() => router.push('/history')}>
                  Voir mes autres recettes
                </Button>
                <Button variant="outline" onClick={() => router.push('/search')}>
                  Nouvelle recherche
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function RecipeDetail() {
  return (
    <ProtectedRoute>
      <RecipeDetailContent />
    </ProtectedRoute>
  );
}
