import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, ChefHat, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  created_at: string;
}

export default function History() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des recettes:', error);
      } else {
        setRecipes((data || []) as Recipe[]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la recette",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Recette supprimée avec succès",
        });
        fetchRecipes();
      }
    } catch (error) {
      console.error('Erreur:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Historique des recettes
            </h1>
            <p className="text-muted-foreground">
              Retrouvez toutes vos recettes générées ({recipes.length} recettes)
            </p>
          </div>
          <Button onClick={() => navigate('/search')}>
            Nouvelle recherche
          </Button>
        </div>

        {recipes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune recette trouvée</h3>
              <p className="text-muted-foreground mb-6">
                Vous n'avez pas encore généré de recettes. Commencez par faire une recherche !
              </p>
              <Button onClick={() => navigate('/search')}>
                Créer ma première recette
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2">
                        <ChefHat className="h-5 w-5 text-primary" />
                        <span>{recipe.title}</span>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {recipe.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecipe(recipe.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(recipe.created_at)}</span>
                  </div>
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

                  {recipe.dietary_restrictions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.dietary_restrictions.map(diet => (
                        <Badge key={diet} variant="outline" className="text-xs">
                          {diet}
                        </Badge>
                      ))}
                    </div>
                  )}

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
        )}
      </div>
    </div>
  );
}