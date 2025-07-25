import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, User } from 'lucide-react';
import { sanitizeText, validateTextInput } from '@/lib/security';

interface Profile {
  id: string;
  email: string;
  bio: string;
  avatar_url: string;
}

interface Stats {
  totalRecipes: number;
  thisWeekRecipes: number;
  uniqueIngredients: Set<string>;
  favoritesCuisines: string[];
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du profil:', error);
      } else {
        setProfile(data);
        setBio(data.bio || '');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch user recipes for statistics
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        return;
      }

      const recipeList = recipes || [];
      
      // Calculate this week's recipes
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekRecipes = recipeList.filter(recipe => 
        new Date(recipe.created_at) >= oneWeekAgo
      ).length;

      // Get unique ingredients
      const allIngredients = new Set<string>();
      recipeList.forEach(recipe => {
        if (Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach(ingredient => {
            // Extract just the ingredient name (remove quantities)
            const cleanIngredient = ingredient.split(' ')[0].toLowerCase();
            allIngredients.add(cleanIngredient);
          });
        }
      });

      // Analyze favorite cuisines based on recipe titles and descriptions
      const cuisineKeywords = {
        'Méditerranéenne': ['méditerranéen', 'olive', 'tomate', 'basilic', 'salade'],
        'Asiatique': ['curry', 'soja', 'gingembre', 'wok', 'riz'],
        'Française': ['risotto', 'champignon', 'crème', 'beurre'],
        'Italienne': ['pasta', 'pâtes', 'parmesan', 'tomate'],
        'Mexicaine': ['avocat', 'piment', 'maïs', 'haricot']
      };

      const cuisineCounts: { [key: string]: number } = {};
      
      recipeList.forEach(recipe => {
        const text = `${recipe.title} ${recipe.description}`.toLowerCase();
        Object.entries(cuisineKeywords).forEach(([cuisine, keywords]) => {
          const matches = keywords.filter(keyword => text.includes(keyword)).length;
          cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + matches;
        });
      });

      const favoritesCuisines = Object.entries(cuisineCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cuisine]) => cuisine)
        .filter(cuisine => cuisineCounts[cuisine] > 0);

      setStats({
        totalRecipes: recipeList.length,
        thisWeekRecipes,
        uniqueIngredients: allIngredients,
        favoritesCuisines: favoritesCuisines.length > 0 ? favoritesCuisines : ['Aucune préférence détectée']
      });
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const updateProfile = async () => {
    try {
      // Validate and sanitize bio input
      const validation = validateTextInput(bio, 0, 500);
      if (!validation.isValid) {
        toast({
          title: "Erreur",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      const sanitizedBio = sanitizeText(bio, 500);
      
      const { error } = await supabase
        .from('profiles')
        .update({ bio: sanitizedBio })
        .eq('user_id', user?.id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le profil",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Profil mis à jour avec succès",
        });
        setBio(sanitizedBio); // Update local state with sanitized value
        fetchProfile();
        fetchStats(); // Also refresh stats when profile is updated
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Succès",
        description: "Photo de profil mise à jour",
      });
      
      fetchProfile();
      fetchStats(); // Also refresh stats when avatar is updated
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Mon Profil</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Gérez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Photo de profil</p>
                  <div className="mt-2">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={uploadAvatar}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Téléchargement...' : 'Changer'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={user?.email || ''} disabled />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  placeholder="Parlez-nous de vous et de vos préférences culinaires..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={updateProfile} className="w-full">
                Sauvegarder les modifications
              </Button>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card>
            <CardHeader>
              <CardTitle>Vos statistiques</CardTitle>
              <CardDescription>
                Aperçu de votre activité culinaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats?.totalRecipes || 0}</p>
                  <p className="text-sm text-muted-foreground">Recettes générées</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{Math.floor((stats?.totalRecipes || 0) * 0.6)}</p>
                  <p className="text-sm text-muted-foreground">Recettes favorites</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats?.uniqueIngredients?.size || 0}</p>
                  <p className="text-sm text-muted-foreground">Ingrédients utilisés</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats?.thisWeekRecipes || 0}</p>
                  <p className="text-sm text-muted-foreground">Cette semaine</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <h4 className="font-medium">Vos cuisines préférées</h4>
                <div className="flex flex-wrap gap-2">
                  {stats?.favoritesCuisines?.map((cuisine, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {cuisine}
                    </span>
                  )) || (
                    <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                      Générez des recettes pour découvrir vos préférences
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}