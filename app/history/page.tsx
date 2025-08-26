'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, ChefHat, Calendar, Trash2, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  created_at: string;
  is_favorite?: boolean;
}

function HistoryContent() {
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

  const deleteRecipe = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);
      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la recette",
          variant: "destructive",
        });
      } else {
        setRecipes((prev) => prev.filter((r) => r.id !== id));
        toast({
          title: "Succès",
          description: "Recette supprimée",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    }
  };
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
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
        toast({
          title: "Erreur",
          description: "Impossible de charger l'historique",
          variant: "destructive",
        });
      } else {
        const allRecipes = (data || []).map((r: any) => ({
          ...r,
          image_url: typeof r.image_url === 'string' ? r.image_url : '',
          difficulty: ['easy', 'medium', 'hard'].includes(r.difficulty) ? r.difficulty : 'medium',
        }));
        setFavoriteRecipes(allRecipes.filter((r) => r.is_favorite));
        setRecipes(allRecipes.filter((r) => !r.is_favorite));
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const toggleFavorite = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ is_favorite: !current })
        .eq('id', id)
        .eq('user_id', user?.id);
      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le favori",
          variant: "destructive",
        });
      } else {
        fetchRecipes();
        toast({
          title: !current ? "Ajouté aux favoris" : "Retiré des favoris",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto py-8 px-6">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            Historique des recettes
          </h1>
          <Button onClick={() => router.push('/search')}>
            Nouvelle recherche
          </Button>
        </div>

        {(favoriteRecipes.length > 0) && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Recettes favorites</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
              {favoriteRecipes.map((recipe) => (
                <Card key={recipe.id} className="group relative border-2 border-pink-400">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl leading-tight">
                        {recipe.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge className={getDifficultyColor(recipe.difficulty)}>
                          {getDifficultyText(recipe.difficulty)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecipe(recipe.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(recipe.id, true)}
                          className="transition-opacity text-pink-500 hover:text-pink-700"
                        >
                          <Heart className="h-4 w-4 fill-pink-500" />
                        </Button>
                      </div>
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
                        {recipe.calories} kcal.
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      {formatDate(recipe.created_at)}
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
          </>
        )}

        {(recipes.length === 0 && favoriteRecipes.length === 0) ? (
          <Card className="text-center py-12">
            <CardContent>
              <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune recette encore</h3>
              <p className="text-muted-foreground mb-4">
                Commencez à générer des recettes pour les voir apparaître ici.
              </p>
              <Button onClick={() => router.push('/search')}>
                Créer ma première recette
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-4">Toutes les recettes</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <Card key={recipe.id} className="group relative">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl leading-tight">
                        {recipe.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge className={getDifficultyColor(recipe.difficulty)}>
                          {getDifficultyText(recipe.difficulty)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecipe(recipe.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(recipe.id, false)}
                          className="transition-opacity text-muted-foreground hover:text-pink-500"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
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
                        {recipe.calories} kcal.
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      {formatDate(recipe.created_at)}
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
          </>
        )}
      </div>
    </div>
  );
}

export default function History() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
