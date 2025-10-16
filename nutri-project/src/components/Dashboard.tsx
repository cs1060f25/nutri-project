import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ChatMessage, DietGoal, MealLog, MealItem } from '../lib/supabase';
import { ChatInterface } from './ChatInterface';
import { DateRangeSelector } from './DateRangeSelector';
import { LogOut, Menu, X } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    loadChatHistory();
    seedSampleData();
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      setMessages(data);
    }
  };

  const seedSampleData = async () => {
    if (!user) return;

    const { data: existingMeals } = await supabase
      .from('meal_logs')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingMeals && existingMeals.length > 0) {
      return;
    }

    const sampleMeals = [];
    const sampleItems = [];

    for (let i = 0; i < 14; i++) {
      const mealDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = mealDate.toISOString().split('T')[0];

      const breakfastId = crypto.randomUUID();
      sampleMeals.push({
        id: breakfastId,
        user_id: user.id,
        meal_date: dateStr,
        meal_time: `${dateStr}T08:00:00Z`,
        meal_type: 'breakfast',
        dining_hall: 'Annenberg Hall',
      });

      sampleItems.push(
        {
          meal_log_id: breakfastId,
          food_name: 'Scrambled Eggs',
          serving_size: '2 eggs',
          calories: 180,
          protein_g: 12.6,
          carbs_g: 2.4,
          fat_g: 12.2,
          sodium_mg: 340,
          calcium_mg: 56,
          iron_mg: 1.8,
        },
        {
          meal_log_id: breakfastId,
          food_name: 'Whole Wheat Toast',
          serving_size: '2 slices',
          calories: 160,
          protein_g: 8,
          carbs_g: 28,
          fat_g: 2,
          sodium_mg: 280,
          calcium_mg: 60,
          iron_mg: 2.4,
        },
        {
          meal_log_id: breakfastId,
          food_name: 'Orange Juice',
          serving_size: '8 oz',
          calories: 110,
          protein_g: 2,
          carbs_g: 26,
          fat_g: 0,
          sodium_mg: 2,
          calcium_mg: 300,
          iron_mg: 0.5,
        }
      );

      const lunchId = crypto.randomUUID();
      sampleMeals.push({
        id: lunchId,
        user_id: user.id,
        meal_date: dateStr,
        meal_time: `${dateStr}T12:30:00Z`,
        meal_type: 'lunch',
        dining_hall: 'Annenberg Hall',
      });

      sampleItems.push(
        {
          meal_log_id: lunchId,
          food_name: 'Grilled Chicken Breast',
          serving_size: '6 oz',
          calories: 280,
          protein_g: 53,
          carbs_g: 0,
          fat_g: 6,
          sodium_mg: 135,
          calcium_mg: 15,
          iron_mg: 1.1,
        },
        {
          meal_log_id: lunchId,
          food_name: 'Brown Rice',
          serving_size: '1 cup',
          calories: 215,
          protein_g: 5,
          carbs_g: 45,
          fat_g: 1.8,
          sodium_mg: 10,
          calcium_mg: 20,
          iron_mg: 0.8,
        },
        {
          meal_log_id: lunchId,
          food_name: 'Steamed Broccoli',
          serving_size: '1 cup',
          calories: 55,
          protein_g: 3.7,
          carbs_g: 11,
          fat_g: 0.6,
          sodium_mg: 64,
          calcium_mg: 62,
          iron_mg: 1,
        }
      );

      const dinnerId = crypto.randomUUID();
      sampleMeals.push({
        id: dinnerId,
        user_id: user.id,
        meal_date: dateStr,
        meal_time: `${dateStr}T18:30:00Z`,
        meal_type: 'dinner',
        dining_hall: 'Annenberg Hall',
      });

      sampleItems.push(
        {
          meal_log_id: dinnerId,
          food_name: 'Baked Salmon',
          serving_size: '5 oz',
          calories: 280,
          protein_g: 39,
          carbs_g: 0,
          fat_g: 13,
          sodium_mg: 86,
          calcium_mg: 20,
          iron_mg: 0.9,
        },
        {
          meal_log_id: dinnerId,
          food_name: 'Sweet Potato',
          serving_size: '1 medium',
          calories: 130,
          protein_g: 3,
          carbs_g: 30,
          fat_g: 0,
          sodium_mg: 72,
          calcium_mg: 43,
          iron_mg: 0.8,
        },
        {
          meal_log_id: dinnerId,
          food_name: 'Garden Salad',
          serving_size: '2 cups',
          calories: 80,
          protein_g: 3,
          carbs_g: 12,
          fat_g: 2.5,
          sodium_mg: 140,
          calcium_mg: 80,
          iron_mg: 1.5,
        }
      );
    }

    await supabase.from('meal_logs').insert(sampleMeals);
    await supabase.from('meal_items').insert(sampleItems);
  };

  const handleSendMessage = async (message: string) => {
    if (!user) return;

    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-assistant`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      await loadChatHistory();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (preset: 'week' | 'month' | 'semester') => {
    const end = new Date();
    let start = new Date();

    switch (preset) {
      case 'week':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'semester':
        start = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">HUDS Analyzer</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600">Welcome, {profile?.full_name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onPresetSelect={handlePresetSelect}
          />

          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Try asking:
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="bg-gray-50 p-3 rounded-lg">
                "How close was I to my protein goal last week?"
              </p>
              <p className="bg-gray-50 p-3 rounded-lg">
                "Show me my calorie trends"
              </p>
              <p className="bg-gray-50 p-3 rounded-lg">
                "What's my macronutrient distribution?"
              </p>
              <p className="bg-gray-50 p-3 rounded-lg">
                "How's my goal streak?"
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              Nutrition Insights
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};
