import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { ChefHat, Search, Clock, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

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
            Bienvenue sur <span className="text-primary">CuisineIA</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Découvrez des recettes personnalisées générées par intelligence artificielle 
            en fonction de vos ingrédients, régimes alimentaires et préférences.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/search')}
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
            Pourquoi choisir CuisineIA ?
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
              onClick={() => navigate('/search')}
              className="px-8"
            >
              Générer mes recettes
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/history')}
              className="px-8"
            >
              Voir l'historique
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
