import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Navbar } from '@/components/Navbar';
import { Clock, Users, ArrowLeft, ChefHat } from 'lucide-react';

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

export default function RecipeDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const recipe = location.state?.recipe as Recipe;

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Recette introuvable</h1>
          <Button onClick={() => navigate('/search')}>
            Retourner à la recherche
          </Button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
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
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {getDifficultyText(recipe.difficulty)}
                </Badge>
              </div>

              {/* Régimes et allergènes */}
              <div className="space-y-2 mt-4">
                {recipe.dietary_restrictions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Régimes :</span>
                    {recipe.dietary_restrictions.map(diet => (
                      <Badge key={diet} variant="outline">{diet}</Badge>
                    ))}
                  </div>
                )}
                {recipe.allergens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Allergènes :</span>
                    {recipe.allergens.map(allergen => (
                      <Badge key={allergen} variant="destructive">{allergen}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Ingrédients */}
            <Card>
              <CardHeader>
                <CardTitle>Ingrédients</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Temps de préparation détaillé */}
            <Card>
              <CardHeader>
                <CardTitle>Informations de cuisson</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Temps de préparation</span>
                  <span className="font-medium">{recipe.prep_time} minutes</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Temps de cuisson</span>
                  <span className="font-medium">{recipe.cook_time} minutes</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Temps total</span>
                  <span className="font-medium">{recipe.prep_time + recipe.cook_time} minutes</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Portions</span>
                  <span className="font-medium">{recipe.servings} personnes</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-gray max-w-none">
                <p className="text-foreground leading-relaxed whitespace-pre-line">
                  {recipe.instructions}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}