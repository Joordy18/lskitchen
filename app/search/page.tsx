'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Search as SearchIcon, Plus, X } from 'lucide-react';
import { sanitizeText, validateTextInput } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function SearchContent() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const dietaryOptions = [
    'Végétarien', 'Végan', 'Sans gluten', 'Cétogène', 'Paléo', 'Halal', 'Casher'
  ];

  const allergenOptions = [
    'Gluten', 'Lactose', 'Œufs', 'Noix', 'Arachides', 'Poisson', 'Crustacés', 'Soja'
  ];

  const addIngredient = () => {
    const trimmed = newIngredient.trim();
    
    // Validate and sanitize ingredient input
    const validation = validateTextInput(trimmed, 1, 50);
    if (!validation.isValid) {
      toast({
        title: "Erreur",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const sanitized = sanitizeText(trimmed, 50);
    
    if (sanitized && !ingredients.includes(sanitized)) {
      if (ingredients.length >= 20) {
        toast({
          title: "Limite atteinte",
          description: "Vous ne pouvez pas ajouter plus de 20 ingrédients",
          variant: "destructive",
        });
        return;
      }
      setIngredients([...ingredients, sanitized]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const handleDietaryChange = (restriction: string, checked: boolean) => {
    if (checked) {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    } else {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    }
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    if (checked) {
      setAllergens([...allergens, allergen]);
    } else {
      setAllergens(allergens.filter(a => a !== allergen));
    }
  };

  const handleSearch = () => {
    if (ingredients.length === 0) {
      toast({
        title: "Ingrédients requis",
        description: "Veuillez ajouter au moins un ingrédient",
        variant: "destructive",
      });
      return;
    }

    const params = new URLSearchParams({
      ingredients: ingredients.join(','),
      dietary: dietaryRestrictions.join(','),
      allergens: allergens.join(',')
    });
    
    router.push(`/results?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Recherche de recettes
          </h1>
          <p className="text-lg text-muted-foreground">
            Dites-nous ce que vous avez et nous vous proposons des recettes parfaites
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
          {/* Ingrédients */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SearchIcon className="h-5 w-5" />
                Vos ingrédients
              </CardTitle>
              <CardDescription>
                Ajoutez les ingrédients que vous avez à disposition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter un ingrédient..."
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={addIngredient} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ingredient) => (
                  <Badge key={ingredient} variant="secondary" className="text-sm">
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              {ingredients.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Aucun ingrédient ajouté
                </p>
              )}
            </CardContent>
          </Card>

          {/* Préférences */}
          <div className="space-y-6">
            {/* Régimes alimentaires */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Régimes alimentaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dietaryOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dietary-${option}`}
                      checked={dietaryRestrictions.includes(option)}
                      onCheckedChange={(checked) => 
                        handleDietaryChange(option, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`dietary-${option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Allergènes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Allergènes à éviter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allergenOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${option}`}
                      checked={allergens.includes(option)}
                      onCheckedChange={(checked) => 
                        handleAllergenChange(option, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`allergen-${option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bouton de recherche */}
        <div className="mt-8 text-center">
          <Button 
            onClick={handleSearch} 
            size="lg" 
            className="px-8 py-3"
            disabled={ingredients.length === 0}
          >
            <SearchIcon className="mr-2 h-5 w-5" />
            Générer mes recettes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  return (
    <ProtectedRoute>
      <SearchContent />
    </ProtectedRoute>
  );
}
