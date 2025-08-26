'use client'

import { useState, useEffect, useCallback } from 'react';
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
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Profile {
  id: string;
  email: string;
  bio: string;
  avatar_url: string;
  credits: number;
}

interface Stats {
  totalRecipes: number;
  thisWeekRecipes: number;
  uniqueIngredients: Set<string>;
  favoritesCuisines: string[];
}

function ProfileContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
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
        setBio(data?.bio || '');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchStats = useCallback(async () => {
    try {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('ingredients, created_at, title, description')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        return;
      }

      const totalRecipes = recipes?.length || 0;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const thisWeekRecipes = recipes?.filter(recipe => 
        new Date(recipe.created_at) > oneWeekAgo
      ).length || 0;

      const allIngredients = recipes?.flatMap(recipe => recipe.ingredients || []) || [];
      const uniqueIngredients = new Set(allIngredients);
      const favoritesCuisines = analyzeUserCuisinePreferences(recipes || []);

      setStats({
        totalRecipes,
        thisWeekRecipes,
        uniqueIngredients,
        favoritesCuisines
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }, [user?.id]);
  
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user, fetchProfile, fetchStats ]);

  useEffect(() => {
    return () => {
      if (previewUrl && typeof window !== 'undefined') {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const analyzeUserCuisinePreferences = (recipes: any[]) => {
    const cuisineKeywords = {
      'Asiatique': ['soja', 'gingembre', 'sesame', 'miso', 'nori', 'wasabi', 'sake', 'mirin', 'shiitake', 'riz', 'nouilles', 'wok', 'curry', 'coco', 'citronnelle', 'sauce soja', 'pad thai', 'ramen', 'sushi'],
      'Italienne': ['basilic', 'mozzarella', 'parmesan', 'tomate', 'pâtes', 'pizza', 'risotto', 'olive', 'prosciutto', 'pesto', 'gorgonzola', 'mascarpone', 'pancetta', 'penne', 'spaghetti', 'lasagne', 'gnocchi'],
      'Française': ['beurre', 'crème', 'vin', 'champagne', 'brie', 'camembert', 'foie gras', 'escargot', 'coq au vin', 'ratatouille', 'bouillabaisse', 'croissant', 'baguette', 'échalote', 'cognac'],
      'Mexicaine': ['avocat', 'lime', 'coriandre', 'piment', 'haricots', 'tortilla', 'salsa', 'guacamole', 'chili', 'cumin', 'paprika', 'jalapeño', 'tequila', 'quinoa', 'maïs'],
      'Méditerranéenne': ['huile d\'olive', 'thym', 'romarin', 'origan', 'feta', 'olives', 'citron', 'ail', 'aubergine', 'courgette', 'poivron', 'tahini', 'houmous', 'tzatziki'],
      'Indienne': ['curry', 'curcuma', 'cardamome', 'coriandre', 'cumin', 'garam masala', 'ghee', 'naan', 'basmati', 'lentilles', 'pois chiches', 'masala', 'tandoori', 'paneer'],
      'Moyen-Oriental': ['sumac', 'za\'atar', 'tahini', 'pistache', 'grenade', 'bulgur', 'freekeh', 'halloumi', 'labneh', 'harissa', 'ras el hanout', 'couscous', 'agneau']
    };

    const cuisineScores: { [key: string]: number } = {};

    recipes.forEach(recipe => {
      const recipeText = `${recipe.title} ${recipe.description} ${recipe.ingredients?.join(' ')}`.toLowerCase();
      
      Object.entries(cuisineKeywords).forEach(([cuisine, keywords]) => {
        const score = keywords.reduce((acc, keyword) => {
          return acc + (recipeText.includes(keyword.toLowerCase()) ? 1 : 0);
        }, 0);
        
        cuisineScores[cuisine] = (cuisineScores[cuisine] || 0) + score;
      });
    });

    // Retourner les 3 cuisines les plus populaires
    return Object.entries(cuisineScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .filter(([,score]) => score > 0)
      .map(([cuisine]) => cuisine);
  };

  const updateBio = async () => {
    if (!user) return;

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
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: sanitizedBio,
          avatar_url: profile?.avatar_url,
          updated_at: new Date().toISOString()
        }).eq('user_id', user?.id);

      if (error) {
        console.error("Erreur Supabase lors de l'upsert de la bio:", error);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour la bio",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Bio mise à jour avec succès",
        });
        await fetchProfile();
      }
    } catch (error) {
      console.error("Erreur inattendue lors de la mise à jour de la bio:", error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && typeof window !== 'undefined') {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erreur",
          description: "Le fichier doit être une image",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "Erreur",
          description: "L'image ne doit pas dépasser 2MB",
          variant: "destructive",
        });
        return;
      }

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      uploadAvatar(file);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      // Clean up previous preview URL
      if (previewUrl && typeof window !== 'undefined') {
        URL.revokeObjectURL(previewUrl);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // First try to create the bucket if it doesn't exist
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (uploadError) {
        console.error("Erreur Supabase lors du téléversement de l'avatar:", uploadError);
        console.warn('Storage upload failed, using fallback method:', uploadError);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string;
          
          const { error: updateError } = await supabase
            .from('profiles')
            .upsert({
              user_id: user?.id,
              avatar_url: base64Data,
              updated_at: new Date().toISOString()
            });

          if (updateError) {
            console.error("Erreur Supabase lors de la mise à jour du profil avec l'avatar en base64:", updateError);
            throw updateError;
          }

          setPreviewUrl(null);
          toast({
            title: "Succès",
            description: "Avatar mis à jour avec succès",
          });
          
          await fetchProfile();
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Avatar public URL:', data.publicUrl);

      if (!data.publicUrl) {
        throw new Error("Impossible d'obtenir l'URL publique de l'avatar");
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          avatar_url: data.publicUrl,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
    );

      if (updateError) {
        console.error("Erreur Supabase lors de la mise à jour de l'URL de l'avatar:", updateError);
        throw updateError;
      }

      setPreviewUrl(null);
      toast({
        title: "Succès",
        description: "Avatar mis à jour avec succès",
      });
      
      await fetchProfile();
    } catch (error: any) {
      console.error("Erreur lors du téléversement de l'avatar:", error);
      setPreviewUrl(null);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'upload",
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
        <div className="max-w-4xl mx-auto py-8 px-6">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto py-8 px-6">
        <h1 className="text-4xl font-bold text-foreground mb-8">Mon Profil</h1>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Gérez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={previewUrl || profile?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label htmlFor="avatar-upload">
                    <Button variant="outline" disabled={uploading} asChild>
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? 'Téléchargement...' : 'Changer d\'avatar'}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG jusqu\'à 2MB
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={user?.email || ''} disabled />
              </div>
              
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  placeholder="Parlez-nous de vous..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bio.length}/500 caractères
                </p>
              </div>
              
              <Button onClick={updateBio}>
                Mettre à jour la bio
              </Button>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Crédits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {profile?.credits ?? 10}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Crédits restants
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mes statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {stats?.totalRecipes || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Recettes créées
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {stats?.thisWeekRecipes || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cette semaine
                    </div>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {stats?.uniqueIngredients?.size || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ingrédients uniques utilisés
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Préférences culinaires</CardTitle>
                <CardDescription>
                  Basées sur vos recettes générées
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.favoritesCuisines && stats.favoritesCuisines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.favoritesCuisines.map((cuisine, index) => (
                      <div
                        key={cuisine}
                        className={`px-3 py-2 rounded-full text-sm font-medium ${ 
                          index === 0 
                            ? 'bg-primary text-primary-foreground' 
                            : index === 1 
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        #{index + 1} {cuisine}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Générez plus de recettes pour découvrir vos préférences culinaires !
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}