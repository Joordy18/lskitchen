'use client'

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { ChefHat, Search, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';


export default function Home() {
  const router = useRouter();

  const features = [
    {
      icon: Search,
      title: "Recherche intelligente",
      description: "Trouvez des recettes basées sur vos ingrédients disponibles"
    },
    {
      icon: ChefHat,
      title: "IA culinaire",
      description: "Obtenez des suggestions personnalisées selon vos goûts"
    },
    {
      icon: Clock,
      title: "Gain de temps",
      description: "Des recettes adaptées à votre temps de préparation"
    },
    {
      icon: Users,
      title: "Pour tous",
      description: "Régimes spéciaux et allergènes pris en compte"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ChefHat className="h-20 w-20 text-primary mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Bienvenue sur <span className="text-primary">LS Kitchen</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Découvrez des recettes personnalisées générées par intelligence artificielle 
            en fonction de vos ingrédients, régimes alimentaires et préférences.
          </p>
          <Button 
            size="lg" 
            onClick={() => router.push('/search')}
            className="px-8 py-4 text-lg"
          >
            <Search className="mr-2 h-5 w-5" />
            Commencer ma recherche
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Pourquoi choisir LS Kitchen ?
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Prêt à cuisiner ?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Rejoignez des milliers d'utilisateurs qui découvrent de nouvelles saveurs chaque jour
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => router.push('/search')}
              className="px-8"
            >
              Générer mes recettes
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => router.push('/history')}
              className="px-8"
            >
              Voir l'historique
            </Button>
          </div>
        </div>
      </section>

      {/* Recommandation du jour */}
      <RecommendationSection />
    </div>
  );

function RecommendationSection() {
  const { user, isLoading } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [iaRecipe, setIaRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) {
        setLoading(false);
        return;
      }
      // Récupérer les recettes favorites de l'utilisateur depuis Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await (supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_favorite', true)) as any;
      if (error) {
        setFavorites([]);
      } else {
        setFavorites(data || []);
      }
      setLoading(false);
    }
    fetchFavorites();
  }, [user]);

  const fetchIaRecipe = async (selected) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const prompt = `Tu es un chef cuisinier expert. Propose une recette qui se marie parfaitement avec la recette suivante ou qui est très similaire : ${selected.title}.

Voici la recette de référence :\n${selected.description}\n\nIngrédients : ${selected.ingredients?.join(', ') || ''}\n\nDonne une recette complète au format JSON suivant (sans texte additionnel) :
{
  "title": "nom de la recette",
  "description": "description courte et appétissante",
  "ingredients": ["ingrédient 1 avec quantité", "ingrédient 2 avec quantité", "etc"],
  "instructions": "instructions détaillées étape par étape pour préparer la recette",
  "prep_time": nombre_minutes_preparation,
  "cook_time": nombre_minutes_cuisson,
  "servings": nombre_portions,
  "difficulty": "easy" ou "medium" ou "hard",
  "calories": nombre_calories,
  "image_url": "URL d'une image libre sur internet illustrant la recette (recherche par nom de recette)"
}
IMPORTANT :
 - La recette doit être originale et complémentaire ou très proche de la recette de référence
 - Utilise des ingrédients cohérents
 - Fournis des instructions détaillées et pratiques
 - Assure-toi que les temps sont réalistes
 - Réponds UNIQUEMENT avec le JSON valide, rien d'autre
 - Assure toi que chaque recette contient obligatoirement tous les champs demandés`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });
    if (!response.ok) {
      setIaRecipe({ title: 'Erreur', description: "Impossible de générer la recette." });
      return;
    }
    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      setIaRecipe({ title: 'Erreur', description: "Réponse invalide de l'IA." });
      return;
    }
    const generatedText = data.candidates[0].content.parts[0].text;
    let recipe;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : generatedText;
      recipe = JSON.parse(jsonText);
    } catch (e) {
      setIaRecipe({ title: 'Erreur', description: "Impossible de parser la recette générée." });
      return;
    }
    setIaRecipe(recipe);
  };

  useEffect(() => {
    if (favorites.length > 0) {
      // Sélectionne une recette favorite aléatoire chaque jour
      const today = new Date().toISOString().slice(0, 10);
      const index = Math.abs(hashCode(today + user.id)) % favorites.length;
      const selected = favorites[index];
      setRecommended(selected);
      fetchIaRecipe(selected);
    }
  }, [favorites, user]);

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  if (isLoading || loading) {
    return (
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg text-muted-foreground">Chargement des recommandations...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Recommandation du jour</h2>
          <p className="text-lg text-muted-foreground">Connectez vous pour obtenir vos recommandations !</p>
        </div>
      </section>
    );
  }

  if (favorites.length === 0) {
    return (
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Recommandation du jour</h2>
          <p className="text-lg text-muted-foreground">Commencez à liker des recettes pour obtenir des recommandations !</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Recommandation du jour</h2>
        {iaRecipe ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Suggestion IA : {iaRecipe.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{iaRecipe.description}</CardDescription>
              {iaRecipe.image && (
                <img src={iaRecipe.image} alt={iaRecipe.title} className="w-full h-64 object-cover rounded mt-4" />
              )}
              {iaRecipe.ingredients && (
                <div className="text-left mt-4">
                  <h3 className="font-semibold mb-2">Ingrédients :</h3>
                  <ul className="list-disc list-inside">
                    {iaRecipe.ingredients.map((ing, idx) => (
                      <li key={idx}>{ing}</li>
                    ))}
                  </ul>
                </div>
              )}
              {iaRecipe.steps && (
                <div className="text-left mt-4">
                  <h3 className="font-semibold mb-2">Étapes :</h3>
                  <ol className="list-decimal list-inside">
                    {iaRecipe.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground">Génération de la suggestion IA en cours...</p>
        )}
      </div>
    </section>
  );
}
}
