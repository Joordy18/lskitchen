'use client'

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Clock, Users, ChefHat, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { RateLimiter } from '@/lib/security';
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
  difficulty: string;
  image_url?: string;
}

// Rate limiter for recipe generation (max 3 requests per minute per user)
const rateLimiter = new RateLimiter(3, 60000);

function ResultsContent() {
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const ingredients = searchParams?.get('ingredients')?.split(',') || [];
  const dietary = searchParams?.get('dietary')?.split(',').filter(Boolean) || [];
  const allergens = searchParams?.get('allergens')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    // Only generate recipes if we don't have any yet
    if (recipes.length === 0) {
      generateRecipes();
    }
  }, []);

  const generateRecipes = async () => {
    setLoading(true);

    try {
      if (!user) {
        router.push('/auth');
        return;
      }

      // Check rate limit
      if (!rateLimiter.canAttempt(user.id)) {
        toast({
          title: "Limite atteinte",
          description: "Vous générez trop de recettes. Veuillez attendre avant de réessayer.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: {
          ingredients: ingredients.filter(Boolean),
          dietary_restrictions: dietary,
          allergens: allergens,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Error generating recipes:', error);
        toast({
          title: "Erreur",
          description: "Impossible de générer les recettes. Veuillez réessayer.",
          variant: "destructive",
        });
      } else if (data?.recipes) {
        // On s'assure que chaque recette a bien le champ image_url
        setRecipes(data.recipes.map((r: any) => ({
          ...r,
          image_url: r.image_url || '',
          difficulty: ['easy', 'medium', 'hard'].includes(r.difficulty) ? r.difficulty : 'medium',
        })));
        // Save recipes to database
        await saveRecipesToDatabase(data.recipes);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRecipesToDatabase = async (recipes: Recipe[]) => {
    try {
      if (!user || !recipes.length) return;

      // Save each recipe to the database
      let savedCount = 0;
      for (const recipe of recipes) {
        const { error } = await supabase
          .from('recipes')
          .insert({
            id: recipe.id,
            user_id: user.id,
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            dietary_restrictions: recipe.dietary_restrictions,
            allergens: recipe.allergens,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            created_at: new Date().toISOString(),
            calories: recipe.calories,
            image_url: recipe.image_url
          });

        if (error) {
          console.error('Error saving recipe:', recipe.title, error);
        } else {
          savedCount++;
        }
      }
      
      if (savedCount > 0) {
        console.log(`Successfully saved ${savedCount} recipe(s) to database`);
      }
    } catch (error) {
      console.error('Error saving recipes to database:', error);
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
        <div className="max-w-6xl mx-auto py-8 px-6">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Génération de vos recettes...
            </h2>
            <p className="text-muted-foreground">
              Notre IA analyse vos ingrédients et préférences
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Vos recettes personnalisées
          </h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-muted-foreground">Ingrédients:</span>
            {ingredients.map((ingredient) => (
              <Badge key={ingredient} variant="outline">
                {ingredient}
              </Badge>
            ))}
          </div>
          {(dietary.length > 0 || allergens.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {dietary.length > 0 && (
                <>
                  <span className="text-muted-foreground">Régimes:</span>
                  {dietary.map((diet) => (
                    <Badge key={diet} variant="secondary">
                      {diet}
                    </Badge>
                  ))}
                </>
              )}
              {allergens.length > 0 && (
                <>
                  <span className="text-muted-foreground">Éviter:</span>
                  {allergens.map((allergen) => (
                    <Badge key={allergen} variant="destructive">
                      {allergen}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {recipes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune recette trouvée</h3>
              <p className="text-muted-foreground mb-4">
                Nous n'avons pas pu générer de recettes avec ces critères.
              </p>
              <Button onClick={() => router.push('/search')}>
                Nouvelle recherche
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl leading-tight">
                      {recipe.title}
                    </CardTitle>
                    <Badge className={getDifficultyColor(recipe.difficulty)}>
                      {getDifficultyText(recipe.difficulty)}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {recipe.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {recipe.prep_time + recipe.cook_time} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {recipe.servings} pers.
                    </div>
                    <div className="flex items-center gap-1">
                      {/* <Users className="h-4 w-4" /> */}
                      {recipe.calories} kcal.
                    </div>
                  </div>
                  
                  {recipe.dietary_restrictions && recipe.dietary_restrictions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recipe.dietary_restrictions.map((restriction) => (
                        <Badge key={restriction} variant="outline" className="text-xs">
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    className="w-full" 
                    onClick={() => router.push(`/recipe/${recipe.id}`)}
                  >
                    Voir la recette
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => router.push('/search')}>
            Nouvelle recherche
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Results() {
  return (
    <ProtectedRoute>
      <ResultsContent />
    </ProtectedRoute>
  );
}
