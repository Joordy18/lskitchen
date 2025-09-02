// /// <reference lib="deno.ns" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function generate-recipes called');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, last_credit_reset')
      .eq('user_id', user.id)
      .single();

    console.log('Profile fetch result:', { profile, profileError });
    if (profileError || !profile) {
      throw new Error('Could not retrieve user profile');
    }

    const now = new Date();
    const lastReset = new Date(profile.last_credit_reset);
    const diff = now.getTime() - lastReset.getTime();
    const hours = diff / (1000 * 60 * 60);

    let credits = profile.credits;
    if (hours >= 24) {
      console.log('Resetting credits to 10');
      credits = 10;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: 10, last_credit_reset: now.toISOString() })
        .eq('user_id', user.id);
      console.log('Credit reset result:', { updateError });
      if (updateError) {
        throw new Error('Failed to reset credits');
      }
    }

    if (credits <= 0) {
      console.log('No credits remaining, aborting');
      return new Response(
        JSON.stringify({ error: 'No credits remaining today' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const requestData = await req.json();

    // Cas recommandation IA à partir d'une recette favorite
    if (requestData.reference_recipe) {
      const ref = requestData.reference_recipe;
      const prompt = `Tu es un chef cuisinier expert. Propose une recette qui se marie parfaitement avec la recette suivante ou qui est très similaire : ${ref.title}.

Voici la recette de référence :\n${ref.description}\n\nIngrédients : ${ref.ingredients?.join(', ') || ''}\n\nDonne une recette complète au format JSON suivant (sans texte additionnel) :
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
        console.error('Gemini API request failed with status:', response.status);
        throw new Error('External API service temporarily unavailable');
      }

      const data = await response.json();

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from AI service');
      }

      const generatedText = data.candidates[0].content.parts[0].text;

      let recipe;
      try {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : generatedText;
        recipe = JSON.parse(jsonText);
      } catch (_parseError) {
        console.error('Failed to parse AI response');
        throw new Error('Failed to parse recipe data from AI response');
      }

      credits = credits - 1;
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ credits: credits })
        .eq('user_id', user.id);
      if (updateError) {
        console.error('Failed to update credits:', updateError.message);
      }

      return new Response(
        JSON.stringify({ recipe }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ...existing code for normal search prompt...
    const ingredients = Array.isArray(requestData.ingredients) 
      ? requestData.ingredients.filter(item => typeof item === 'string' && item.trim().length > 0).slice(0, 20)
      : [];
      
    const dietary_restrictions = Array.isArray(requestData.dietary_restrictions)
      ? requestData.dietary_restrictions.filter(item => typeof item === 'string' && item.trim().length > 0).slice(0, 10)
      : [];
      
    const allergens = Array.isArray(requestData.allergens)
      ? requestData.allergens.filter(item => typeof item === 'string' && item.trim().length > 0).slice(0, 10)
      : [];

    if (ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one valid ingredient is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const totalInputLength = ingredients.join('').length + dietary_restrictions.join('').length + allergens.join('').length;
    if (totalInputLength > 1000) {
      return new Response(
        JSON.stringify({ error: 'Input data too large' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );  
    }

    const prompt = `Tu es un chef cuisinier expert. Génère exactement 3 recettes différentes basées sur ces critères :

Ingrédients disponibles : ${ingredients.join(', ')}
${dietary_restrictions.length > 0 ? `Régimes alimentaires : ${dietary_restrictions.join(', ')}` : ''}
${allergens.length > 0 ? `Allergènes à éviter : ${allergens.join(', ')}` : ''}

Pour chaque recette, fournis EXACTEMENT le format JSON suivant (sans texte additionnel) :

{
  "recipes": [
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
  ]
}

IMPORTANT : 
- Utilise au maximum les ingrédients fournis
- Respecte strictement les régimes alimentaires mentionnés
- Évite complètement les allergènes listés
- Fournis des instructions détaillées et pratiques
- Assure-toi que les temps sont réalistes
- Pour chaque recette, recherche une image libre sur internet correspondant au nom de la recette et fournis son URL dans le champ image_url
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
      console.error('Gemini API request failed with status:', response.status);
      throw new Error('External API service temporarily unavailable');
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from AI service');
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    let parsedResponse;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : generatedText;
      parsedResponse = JSON.parse(jsonText);
    } catch (_parseError) {
      console.error('Failed to parse AI response');
      throw new Error('Failed to parse recipe data from AI response');
    }

    if (!parsedResponse.recipes || !Array.isArray(parsedResponse.recipes)) {
      throw new Error('Invalid recipe format from AI');
    }

    const recipes = parsedResponse.recipes.slice(0, 3).map((recipe: any) => ({
      id: crypto.randomUUID(),
      title: recipe.title || 'Recette sans nom',
      description: recipe.description || 'Délicieuse recette',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: recipe.instructions || 'Instructions non disponibles',
      dietary_restrictions: dietary_restrictions || [],
      allergens: allergens || [],
      prep_time: Number(recipe.prep_time) || 15,
      cook_time: Number(recipe.cook_time) || 30,
      servings: Number(recipe.servings) || 4,
      difficulty: ['easy', 'medium', 'hard'].includes(recipe.difficulty) ? recipe.difficulty : 'medium',
      calories: Number(recipe.calories) || 500,
      // image_url: typeof recipe.image_url === 'string' ? recipe.image_url : ''
    }));

    credits = credits - 1;
    console.log('About to update credits, new value:', credits);
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ credits: credits })
      .eq('user_id', user.id);

    console.log('Update credits result:', { updateData, updateError });
    if (updateError) {
      console.error('Failed to update credits:', updateError.message);
    }

    return new Response(
      JSON.stringify({ recipes }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Recipe generation failed:', error.message);
    return new Response(
      JSON.stringify({ error: 'Unable to generate recipes at this time. Please try again later.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});