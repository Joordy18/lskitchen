import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Clock, Users, ChefHat, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { RateLimiter } from '@/lib/security';

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
  difficulty: 'easy' | 'medium' | 'hard';
}

// Rate limiter for recipe generation (max 3 requests per minute per user)
const rateLimiter = new RateLimiter(3, 60000);

export default function Results() {
  const [searchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const ingredients = searchParams.get('ingredients')?.split(',') || [];
  const dietary = searchParams.get('dietary')?.split(',').filter(Boolean) || [];
  const allergens = searchParams.get('allergens')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    // Only generate recipes if we don't have any yet
    if (recipes.length === 0) {
      generateRecipes();
    }
  }, []);

  const generateRecipes = async () => {
    setLoading(true);
    
    try {
      // Rate limiting check
      const userId = user?.id || 'anonymous';
      if (!rateLimiter.canAttempt(userId)) {
        toast({
          title: "Limite atteinte",
          description: "Trop de demandes. Veuillez attendre une minute avant de réessayer.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call the edge function to generate recipes with AI
      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: {
          ingredients: ingredients,
          dietary_restrictions: dietary,
          allergens: allergens,
        }
      });

      if (error) {
        console.error('Error calling generate-recipes function:', error);
        toast({
          title: "Erreur",
          description: "Impossible de générer les recettes. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      if (!data || !data.recipes) {
        throw new Error('No recipes received from AI');
      }

      const generatedRecipes = data.recipes;

      // Save recipes to database if user is logged in
      if (user) {
        for (const recipe of generatedRecipes) {
          try {
            await supabase.from('recipes').insert({
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
            });
          } catch (dbError) {
            console.error('Error saving recipe to database:', dbError);
            // Continue with other recipes even if one fails
          }
        }
      }

      setRecipes(generatedRecipes);
      
      toast({
        title: "Succès",
        description: `${generatedRecipes.length} recettes générées avec succès !`,
      });

    } catch (error) {
      console.error('Error generating recipes:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la génération des recettes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Génération de vos recettes personnalisées...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Vos recettes personnalisées
          </h1>
          <p className="text-muted-foreground mb-4">
            Basées sur vos ingrédients : {ingredients.join(', ')}
          </p>
          {dietary.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Régimes :</span>
              {dietary.map(diet => (
                <Badge key={diet} variant="outline">{diet}</Badge>
              ))}
            </div>
          )}
          {allergens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Allergènes évités :</span>
              {allergens.map(allergen => (
                <Badge key={allergen} variant="destructive">{allergen}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{recipe.title}</span>
                  <ChefHat className="h-5 w-5 text-primary" />
                </CardTitle>
                <CardDescription>{recipe.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {recipe.ingredients.slice(0, 3).map((ingredient) => (
                    <Badge key={ingredient} variant="secondary" className="text-xs">
                      {ingredient}
                    </Badge>
                  ))}
                  {recipe.ingredients.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{recipe.ingredients.length - 3} autres
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{recipe.prep_time + recipe.cook_time} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{recipe.servings} pers.</span>
                  </div>
                  <Badge className={getDifficultyColor(recipe.difficulty)}>
                    {getDifficultyText(recipe.difficulty)}
                  </Badge>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/recipe/${recipe.id}`, { state: { recipe } })}
                >
                  Voir la recette
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => navigate('/search')}>
            Nouvelle recherche
          </Button>
        </div>
      </div>
    </div>
  );
}