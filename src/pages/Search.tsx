import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Search as SearchIcon, Plus, X } from 'lucide-react';
import { sanitizeText, validateTextInput } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';

export default function Search() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const navigate = useNavigate();
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

  const toggleDietaryRestriction = (restriction: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(restriction) 
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const toggleAllergen = (allergen: string) => {
    setAllergens(prev => 
      prev.includes(allergen) 
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSearch = () => {
    if (ingredients.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter au moins un ingrédient",
        variant: "destructive",
      });
      return;
    }
    
    // Additional validation before search
    if (ingredients.length > 20) {
      toast({
        title: "Erreur",
        description: "Trop d'ingrédients sélectionnés (maximum 20)",
        variant: "destructive",
      });
      return;
    }
    
    const searchParams = new URLSearchParams({
      ingredients: ingredients.join(','),
      dietary: dietaryRestrictions.join(','),
      allergens: allergens.join(','),
    });
    
    navigate(`/results?${searchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Trouvez vos recettes parfaites
          </h1>
          <p className="text-lg text-muted-foreground">
            Renseignez vos ingrédients et préférences pour découvrir des recettes personnalisées
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Ingrédients */}
          <Card>
            <CardHeader>
              <CardTitle>Ingrédients disponibles</CardTitle>
              <CardDescription>
                Ajoutez les ingrédients que vous avez chez vous
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Ex: tomates, poulet, riz..."
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                />
                <Button onClick={addIngredient} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ingredient) => (
                  <Badge key={ingredient} variant="secondary" className="px-3 py-1">
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Régimes alimentaires */}
          <Card>
            <CardHeader>
              <CardTitle>Régimes alimentaires</CardTitle>
              <CardDescription>
                Sélectionnez vos préférences alimentaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {dietaryOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`diet-${option}`}
                      checked={dietaryRestrictions.includes(option)}
                      onCheckedChange={() => toggleDietaryRestriction(option)}
                    />
                    <label
                      htmlFor={`diet-${option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Allergènes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Allergènes à éviter</CardTitle>
              <CardDescription>
                Indiquez les allergènes que vous devez éviter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {allergenOptions.map((allergen) => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${allergen}`}
                      checked={allergens.includes(allergen)}
                      onCheckedChange={() => toggleAllergen(allergen)}
                    />
                    <label
                      htmlFor={`allergen-${allergen}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {allergen}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button 
            onClick={handleSearch}
            disabled={ingredients.length === 0}
            size="lg"
            className="px-8 py-4 text-lg"
          >
            <SearchIcon className="mr-2 h-5 w-5" />
            Générer mes recettes
          </Button>
        </div>
      </div>
    </div>
  );
}