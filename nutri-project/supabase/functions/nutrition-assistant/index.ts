import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AssistantRequest {
  message: string;
  startDate: string;
  endDate: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { message, startDate, endDate }: AssistantRequest = await req.json();

    const { data: goal } = await supabase
      .from('diet_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: mealLogs } = await supabase
      .from('meal_logs')
      .select(`
        *,
        meal_items(*)
      `)
      .eq('user_id', user.id)
      .gte('meal_date', startDate)
      .lte('meal_date', endDate)
      .order('meal_date', { ascending: true });

    const response = await processNutritionQuery(
      message,
      mealLogs || [],
      goal,
      startDate,
      endDate
    );

    await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        role: 'user',
        content: message,
      },
      {
        user_id: user.id,
        role: 'assistant',
        content: response.message,
        visualization_data: response.visualization,
      },
    ]);

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function processNutritionQuery(
  query: string,
  mealLogs: any[],
  goal: any,
  startDate: string,
  endDate: string
) {
  const queryLower = query.toLowerCase();
  const dailyNutrition = calculateDailyNutrition(mealLogs);
  const summary = calculateSummary(dailyNutrition, goal);

  if (queryLower.includes('protein') && (queryLower.includes('goal') || queryLower.includes('target'))) {
    return {
      message: `Over the selected period, your average protein intake was ${summary.avgProtein.toFixed(1)}g per day, compared to your goal of ${goal?.target_protein_g || 50}g. You met your protein goal on ${summary.proteinSuccessDays} out of ${summary.totalDays} days (${((summary.proteinSuccessDays / summary.totalDays) * 100).toFixed(0)}% success rate).`,
      visualization: {
        type: 'goal_card',
        title: 'Daily Protein',
        current: summary.avgProtein,
        target: goal?.target_protein_g || 50,
        unit: 'g',
        icon: 'activity',
      },
    };
  }

  if (queryLower.includes('calorie') && (queryLower.includes('trend') || queryLower.includes('chart'))) {
    return {
      message: `Here's your daily calorie intake over the selected period. Your average was ${summary.avgCalories.toFixed(0)} calories per day.`,
      visualization: {
        type: 'line_chart',
        title: 'Daily Calorie Intake',
        yAxisLabel: 'Calories',
        color: '#dc2626',
        data: dailyNutrition.map(d => ({
          date: d.date,
          value: d.calories,
          target: goal?.target_calories || 2000,
        })),
      },
    };
  }

  if (queryLower.includes('macros') || queryLower.includes('macronutrient')) {
    return {
      message: `Here's your average macronutrient distribution over the selected period. Protein: ${summary.avgProtein.toFixed(1)}g, Carbs: ${summary.avgCarbs.toFixed(1)}g, Fat: ${summary.avgFat.toFixed(1)}g.`,
      visualization: {
        type: 'pie_chart',
        title: 'Average Macronutrient Distribution',
        data: [
          { label: 'Protein', value: summary.avgProtein, color: '#dc2626' },
          { label: 'Carbohydrates', value: summary.avgCarbs, color: '#2563eb' },
          { label: 'Fat', value: summary.avgFat, color: '#16a34a' },
        ],
      },
    };
  }

  if (queryLower.includes('streak') || queryLower.includes('consistency')) {
    return {
      message: `Your current goal streak is ${summary.currentStreak} days, with your best streak being ${summary.longestStreak} days. You've met your goals on ${summary.successfulDays} out of ${summary.totalDays} days (${summary.goalAlignment.toFixed(0)}% success rate).`,
      visualization: {
        type: 'streak_card',
        currentStreak: summary.currentStreak,
        longestStreak: summary.longestStreak,
        successRate: summary.goalAlignment,
        totalDays: summary.totalDays,
      },
    };
  }

  return {
    message: `Over the period from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}, you logged ${summary.totalDays} days of meals. Your averages were: ${summary.avgCalories.toFixed(0)} calories, ${summary.avgProtein.toFixed(1)}g protein, ${summary.avgCarbs.toFixed(1)}g carbs, and ${summary.avgFat.toFixed(1)}g fat per day. You met your overall goals on ${summary.successfulDays} days (${summary.goalAlignment.toFixed(0)}% success rate).`,
    visualization: {
      type: 'goal_card',
      title: 'Daily Calories',
      current: summary.avgCalories,
      target: goal?.target_calories || 2000,
      unit: 'cal',
      icon: 'flame',
    },
  };
}

function calculateDailyNutrition(mealLogs: any[]) {
  const dailyMap = new Map();

  mealLogs.forEach(meal => {
    const date = meal.meal_date;
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        sodium: 0,
      });
    }

    const daily = dailyMap.get(date);
    meal.meal_items.forEach((item: any) => {
      daily.calories += item.calories;
      daily.protein += Number(item.protein_g);
      daily.carbs += Number(item.carbs_g);
      daily.fat += Number(item.fat_g);
      daily.sodium += Number(item.sodium_mg);
    });
  });

  return Array.from(dailyMap.values()).sort((a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

function calculateSummary(dailyNutrition: any[], goal: any) {
  if (dailyNutrition.length === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      totalDays: 0,
      successfulDays: 0,
      proteinSuccessDays: 0,
      goalAlignment: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  const totalCalories = dailyNutrition.reduce((sum, d) => sum + d.calories, 0);
  const totalProtein = dailyNutrition.reduce((sum, d) => sum + d.protein, 0);
  const totalCarbs = dailyNutrition.reduce((sum, d) => sum + d.carbs, 0);
  const totalFat = dailyNutrition.reduce((sum, d) => sum + d.fat, 0);

  const days = dailyNutrition.length;
  const targetCal = goal?.target_calories || 2000;
  const targetProtein = Number(goal?.target_protein_g || 50);
  const targetCarbs = Number(goal?.target_carbs_g || 250);
  const targetFat = Number(goal?.target_fat_g || 70);

  const proteinSuccessDays = dailyNutrition.filter(d =>
    Math.abs(d.protein - targetProtein) / targetProtein <= 0.15
  ).length;

  const successfulDays = dailyNutrition.filter(d =>
    Math.abs(d.calories - targetCal) / targetCal <= 0.15 &&
    Math.abs(d.protein - targetProtein) / targetProtein <= 0.15
  ).length;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const sorted = [...dailyNutrition].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sorted.forEach((day, index) => {
    const isSuccess = Math.abs(day.calories - targetCal) / targetCal <= 0.15;
    if (isSuccess) {
      tempStreak++;
      if (index === 0) currentStreak = tempStreak;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (index === 0) currentStreak = 0;
      tempStreak = 0;
    }
  });

  return {
    avgCalories: totalCalories / days,
    avgProtein: totalProtein / days,
    avgCarbs: totalCarbs / days,
    avgFat: totalFat / days,
    totalDays: days,
    successfulDays,
    proteinSuccessDays,
    goalAlignment: (successfulDays / days) * 100,
    currentStreak,
    longestStreak,
  };
}
