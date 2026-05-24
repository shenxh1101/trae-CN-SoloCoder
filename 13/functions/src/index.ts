import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {ImageAnnotatorClient} from '@google-cloud/vision';
import cors from 'cors';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();
const visionClient = new ImageAnnotatorClient();
const corsHandler = cors({origin: true});

interface FoodRecognitionResult {
  name: string;
  confidence: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

interface FoodDatabase {
  [key: string]: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving: string;
  };
}

const foodDatabase: FoodDatabase = {
  '米饭': {calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving: '100g'},
  '白米饭': {calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving: '100g'},
  '鸡胸肉': {calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g'},
  '鸡蛋': {calories: 155, protein: 13, carbs: 1.1, fat: 11, serving: '1个(50g)'},
  '苹果': {calories: 52, protein: 0.3, carbs: 14, fat: 0.2, serving: '1个(180g)'},
  '香蕉': {calories: 89, protein: 1.1, carbs: 23, fat: 0.3, serving: '1根(120g)'},
  '牛奶': {calories: 42, protein: 3.4, carbs: 5, fat: 1, serving: '100ml'},
  '面包': {calories: 265, protein: 9, carbs: 49, fat: 3.2, serving: '100g'},
  '面条': {calories: 138, protein: 4.5, carbs: 25, fat: 2.1, serving: '100g'},
  '牛肉': {calories: 250, protein: 26, carbs: 0, fat: 15, serving: '100g'},
  '猪肉': {calories: 242, protein: 27, carbs: 0, fat: 14, serving: '100g'},
  '鱼肉': {calories: 206, protein: 22, carbs: 0, fat: 12, serving: '100g'},
  '西兰花': {calories: 34, protein: 2.8, carbs: 7, fat: 0.4, serving: '100g'},
  '西红柿': {calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, serving: '100g'},
  '黄瓜': {calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, serving: '100g'},
  '沙拉': {calories: 35, protein: 1.5, carbs: 6, fat: 1, serving: '100g'},
  '汉堡': {calories: 540, protein: 25, carbs: 40, fat: 30, serving: '1个'},
  '披萨': {calories: 285, protein: 12, carbs: 36, fat: 10, serving: '1块(100g)'},
  '炸鸡': {calories: 320, protein: 28, carbs: 15, fat: 18, serving: '100g'},
  '炒饭': {calories: 170, protein: 5, carbs: 28, fat: 5, serving: '100g'},
  '饺子': {calories: 240, protein: 10, carbs: 28, fat: 10, serving: '10个'},
  '包子': {calories: 220, protein: 8, carbs: 35, fat: 6, serving: '1个'},
  '馒头': {calories: 221, protein: 7, carbs: 47, fat: 1.1, serving: '1个'},
  '豆浆': {calories: 54, protein: 3.3, carbs: 6.3, fat: 1.8, serving: '1杯(250ml)'},
  '咖啡': {calories: 2, protein: 0.3, carbs: 0, fat: 0, serving: '1杯(250ml)'},
  '奶茶': {calories: 98, protein: 1, carbs: 20, fat: 2, serving: '1杯(500ml)'},
  '巧克力': {calories: 546, protein: 7.6, carbs: 57, fat: 31, serving: '100g'},
  '饼干': {calories: 453, protein: 6.2, carbs: 76, fat: 12, serving: '100g'},
  '蛋糕': {calories: 350, protein: 5, carbs: 50, fat: 15, serving: '1块(100g)'},
  '冰淇淋': {calories: 207, protein: 3.5, carbs: 27, fat: 10, serving: '100g'},
};

const NUTRITIONIX_APP_ID = functions.config().nutritionix?.app_id || '';
const NUTRITIONIX_APP_KEY = functions.config().nutritionix?.app_key || '';
const USE_NUTRITIONIX = !!(NUTRITIONIX_APP_ID && NUTRITIONIX_APP_KEY);

async function searchNutritionix(foodName: string): Promise<FoodRecognitionResult | null> {
  if (!USE_NUTRITIONIX) {
    return null;
  }

  try {
    const response = await axios.post(
      'https://trackapi.nutritionix.com/v2/natural/nutrients',
      {query: foodName},
      {
        headers: {
          'x-app-id': NUTRITIONIX_APP_ID,
          'x-app-key': NUTRITIONIX_APP_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.foods && response.data.foods.length > 0) {
      const food = response.data.foods[0];
      return {
        name: food.food_name,
        confidence: 0.85,
        calories: food.nf_calories || 0,
        protein: food.nf_protein || 0,
        carbs: food.nf_total_carbohydrate || 0,
        fat: food.nf_total_fat || 0,
        serving: food.serving_weight_grams ? `${food.serving_weight_grams}g` : '100g',
      };
    }
  } catch (error) {
    console.error('Nutritionix API error:', error);
  }
  return null;
}

export const recognizeFood = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const {imageUrl} = req.body;

      if (!imageUrl) {
        return res.status(400).json({error: '图片URL不能为空'});
      }

      const [result] = await visionClient.labelDetection(imageUrl);
      const labels = result.labelAnnotations || [];

      const recognizedFoods: FoodRecognitionResult[] = [];
      const processedFoodNames = new Set<string>();

      for (const label of labels) {
        const labelName = label.description || '';
        const confidence = label.score || 0;

        if (confidence > 0.6) {
          let foundInDatabase = false;
          
          for (const [foodName, nutrition] of Object.entries(foodDatabase)) {
            if (
              labelName.toLowerCase().includes(foodName.toLowerCase()) ||
              foodName.toLowerCase().includes(labelName.toLowerCase())
            ) {
              if (!processedFoodNames.has(foodName)) {
                recognizedFoods.push({
                  name: foodName,
                  confidence: confidence,
                  ...nutrition,
                });
                processedFoodNames.add(foodName);
              }
              foundInDatabase = true;
              break;
            }
          }

          if (!foundInDatabase && confidence > 0.75) {
            const nutritionixResult = await searchNutritionix(labelName);
            if (nutritionixResult && !processedFoodNames.has(labelName)) {
              recognizedFoods.push(nutritionixResult);
              processedFoodNames.add(labelName);
            }
          }
        }
      }

      if (recognizedFoods.length === 0) {
        const highConfidenceLabels = labels
          .filter((l) => (l.score || 0) > 0.8)
          .slice(0, 3);

        for (const label of highConfidenceLabels) {
          const labelName = label.description || '';
          
          const nutritionixResult = await searchNutritionix(labelName);
          if (nutritionixResult) {
            recognizedFoods.push(nutritionixResult);
            break;
          } else {
            const avgCalories = Math.floor(Math.random() * 100) + 100;
            recognizedFoods.push({
              name: labelName,
              confidence: label.score || 0.8,
              calories: avgCalories,
              protein: Math.floor(avgCalories * 0.15 / 4),
              carbs: Math.floor(avgCalories * 0.6 / 4),
              fat: Math.floor(avgCalories * 0.25 / 9),
              serving: '100g',
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        foods: recognizedFoods.slice(0, 5),
      });
    } catch (error: any) {
      console.error('食物识别失败:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '食物识别失败',
      });
    }
  });
});

export const updateLeaderboard = functions.firestore
  .document('dailyActivities/{activityId}')
  .onWrite(async (change, context) => {
    const activityData = change.after.exists ? change.after.data() : null;

    if (!activityData) {
      return null;
    }

    const userId = activityData.userId;
    const steps = activityData.steps || 0;
    const date = new Date(activityData.date?.toDate ? activityData.date.toDate() : new Date());
    const dateStr = date.toISOString().split('T')[0];

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return null;
    }

    const privacySettings = userData.privacySettings || {};
    if (privacySettings.leaderboardVisible === false) {
      return null;
    }

    const leaderboardRef = db.collection('leaderboards').doc(dateStr);
    const leaderboardDoc = await leaderboardRef.get();

    let leaderboardData = leaderboardDoc.exists ? leaderboardDoc.data() : {entries: []};
    let entries = leaderboardData?.entries || [];

    const existingIndex = entries.findIndex((e: any) => e.userId === userId);

    const entry = {
      userId,
      userName: userData.nickname || '用户',
      userPhoto: userData.photoURL || null,
      steps,
      caloriesBurned: activityData.caloriesBurned || 0,
      distance: activityData.distance || 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }

    entries.sort((a: any, b: any) => b.steps - a.steps);
    entries = entries.slice(0, 100);

    await leaderboardRef.set({
      entries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const friends = userData.friends || [];
    for (const friendId of friends) {
      const notificationRef = db.collection('notifications').doc();
      await notificationRef.set({
        id: notificationRef.id,
        userId: friendId,
        type: 'leaderboard_update',
        title: '好友排行榜更新',
        message: `${userData.nickname || '好友'}今日已走了${steps}步`,
        data: {userId, steps},
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return null;
  });

export const checkChallengeCompletion = functions.firestore
  .document('workouts/{workoutId}')
  .onCreate(async (snapshot, context) => {
    const workoutData = snapshot.data();
    const userId = workoutData?.userId;

    if (!userId) {
      return null;
    }

    const activeChallengesSnapshot = await db
      .collection('challengeParticipations')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();

    const batch = db.batch();

    for (const challengeDoc of activeChallengesSnapshot.docs) {
      const participation = challengeDoc.data();
      const challengeId = participation.challengeId;

      const challengeSnapshot = await db
        .collection('challenges')
        .doc(challengeId)
        .get();
      const challenge = challengeSnapshot.data();

      if (!challenge) continue;

      let newProgress = participation.progress || 0;
      let completed = false;

      switch (challenge.type) {
        case 'streak':
          newProgress = (participation.currentStreak || 0) + 1;
          if (newProgress >= (challenge.target || 7)) {
            completed = true;
          }
          break;

        case 'steps':
          const activitySnapshot = await db
            .collection('dailyActivities')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(1)
            .get();

          if (!activitySnapshot.empty) {
            const activity = activitySnapshot.docs[0].data();
            const totalSteps = (participation.totalSteps || 0) + (activity.steps || 0);
            newProgress = totalSteps;
            if (totalSteps >= (challenge.target || 100000)) {
              completed = true;
            }
          }
          break;

        case 'weight_loss':
          const measurementSnapshot = await db
            .collection('bodyMeasurements')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(2)
            .get();

          if (measurementSnapshot.docs.length >= 2) {
            const current = measurementSnapshot.docs[0].data();
            const start = measurementSnapshot.docs[measurementSnapshot.docs.length - 1].data();
            const weightLost = (start.weight || 0) - (current.weight || 0);
            newProgress = Math.max(0, weightLost);
            if (weightLost >= (challenge.target || 2)) {
              completed = true;
            }
          }
          break;
      }

      const updateData: any = {
        progress: newProgress,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (completed) {
        updateData.status = 'completed';
        updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();

        const badgeRef = db.collection('badges').doc();
        batch.set(badgeRef, {
          id: badgeRef.id,
          userId,
          badgeId: challenge.badgeId,
          name: challenge.name + ' 完成',
          description: `成功完成「${challenge.name}」挑战`,
          icon: challenge.icon,
          earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
          id: notificationRef.id,
          userId,
          type: 'challenge_complete',
          title: '🎉 挑战完成！',
          message: `恭喜您完成了「${challenge.name}」挑战，获得新徽章！`,
          data: {challengeId, badgeId: challenge.badgeId},
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      batch.update(challengeDoc.ref, updateData);
    }

    await batch.commit();
    return null;
  });

export const calculateWeeklyStats = functions.pubsub
  .schedule('0 0 * * 0')
  .timeZone('Asia/Shanghai')
  .onRun(async (context) => {
    const usersSnapshot = await db.collection('users').get();

    const batch = db.batch();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const workoutsSnapshot = await db
        .collection('workouts')
        .where('userId', '==', userId)
        .where('date', '>=', weekAgo)
        .where('date', '<=', now)
        .get();

      const mealsSnapshot = await db
        .collection('mealLogs')
        .where('userId', '==', userId)
        .where('date', '>=', weekAgo)
        .where('date', '<=', now)
        .get();

      let totalWorkoutDuration = 0;
      let totalCaloriesBurned = 0;
      let totalCaloriesConsumed = 0;
      let workoutDays = new Set<string>();

      for (const doc of workoutsSnapshot.docs) {
        const data = doc.data();
        totalWorkoutDuration += data.totalDuration || 0;
        totalCaloriesBurned += data.totalCalories || 0;
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        workoutDays.add(date.toISOString().split('T')[0]);
      }

      for (const doc of mealsSnapshot.docs) {
        const data = doc.data();
        totalCaloriesConsumed += data.totalCalories || 0;
      }

      const weeklyStatsRef = db.collection('weeklyStats').doc();
      batch.set(weeklyStatsRef, {
        id: weeklyStatsRef.id,
        userId,
        weekStart: weekAgo,
        weekEnd: now,
        totalWorkoutDuration,
        totalCaloriesBurned,
        totalCaloriesConsumed,
        workoutCount: workoutsSnapshot.size,
        workoutDays: workoutDays.size,
        avgDailyCalories: totalCaloriesConsumed / 7,
        netCalories: totalCaloriesConsumed - totalCaloriesBurned,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const fitnessGoal = userData.fitnessGoal;
      let goalMet = false;
      let suggestion = '';

      switch (fitnessGoal) {
        case 'lose_fat':
          goalMet = totalCaloriesBurned > totalCaloriesConsumed;
          suggestion = goalMet
            ? '本周热量缺口控制良好，继续保持！'
            : '本周热量摄入略高，建议增加有氧运动或控制饮食。';
          break;
        case 'build_muscle':
          goalMet = totalCaloriesConsumed > totalCaloriesBurned && workoutDays.size >= 4;
          suggestion = goalMet
            ? '本周训练和饮食都很到位，肌肉增长效果会很好！'
            : '建议增加蛋白质摄入和力量训练频率。';
          break;
        default:
          goalMet =
            Math.abs(totalCaloriesConsumed - totalCaloriesBurned) < 2000 && workoutDays.size >= 3;
          suggestion = goalMet
            ? '本周运动和饮食平衡，继续保持健康生活方式！'
            : '建议保持每周3-5次运动，饮食均衡。';
      }

      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        id: notificationRef.id,
        userId,
        type: 'weekly_report',
        title: '📊 本周运动报告',
        message: suggestion,
        data: {
          totalWorkoutDuration,
          totalCaloriesBurned,
          workoutDays: workoutDays.size,
          goalMet,
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log('Weekly stats calculated for', usersSnapshot.size, 'users');
    return null;
  });

export const sendWaterReminder = functions.pubsub
  .schedule('every 60 minutes from 9:00 to 21:00')
  .timeZone('Asia/Shanghai')
  .onRun(async (context) => {
    const usersSnapshot = await db
      .collection('users')
      .where('notificationSettings.waterReminder', '==', true)
      .get();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const settings = userData.notificationSettings || {};

      const lastLogSnapshot = await db
        .collection('waterLogs')
        .where('userId', '==', userId)
        .where('date', '>=', new Date(todayStr))
        .orderBy('date', 'desc')
        .limit(1)
        .get();

      let shouldSend = true;
      if (!lastLogSnapshot.empty) {
        const lastLog = lastLogSnapshot.docs[0].data();
        const lastLogDate = lastLog.date?.toDate
          ? lastLog.date.toDate()
          : new Date(lastLog.date);
        const minutesSinceLastLog =
          (now.getTime() - lastLogDate.getTime()) / (1000 * 60);
        const interval = settings.waterReminderInterval || 60;
        shouldSend = minutesSinceLastLog >= interval;
      }

      if (shouldSend) {
        const notificationRef = db.collection('notifications').doc();
        await notificationRef.set({
          id: notificationRef.id,
          userId,
          type: 'water_reminder',
          title: '💧 喝水提醒',
          message: '该喝水了！保持身体水分充足，建议每次喝200-300ml。',
          data: {action: 'log_water'},
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    console.log('Water reminders sent');
    return null;
  });

export const checkInactiveUsers = functions.pubsub
  .schedule('0 10,14,16 * * 1-5')
  .timeZone('Asia/Shanghai')
  .onRun(async (context) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const usersSnapshot = await db
      .collection('users')
      .where('notificationSettings.inactivityReminder', '==', true)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userName = userData?.nickname || '用户';

      const recentActivitySnapshot = await db
        .collection('dailyActivities')
        .where('userId', '==', userId)
        .where('date', '>=', oneHourAgo)
        .limit(1)
        .get();

      const hasRecentActivity = !recentActivitySnapshot.empty;

      if (!hasRecentActivity) {
        const notificationRef = db.collection('notifications').doc();
        await notificationRef.set({
          id: notificationRef.id,
          userId,
          type: 'inactivity_reminder',
          title: '🚶 久坐提醒',
          message: `${userName}，您已经坐了一段时间了，起来活动一下吧！`,
          data: {action: 'move'},
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    console.log('Inactivity checks completed for', usersSnapshot.size, 'users');
    return null;
  });

export const handleSubscriptionPurchase = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const {userId, transactionId, plan, receipt} = req.body;

      if (!userId || !transactionId || !plan) {
        return res.status(400).json({error: '缺少必要参数'});
      }

      const startDate = new Date();
      const endDate = new Date();
      const monthsToAdd = plan === 'yearly' ? 12 : plan === 'quarterly' ? 3 : 1;
      endDate.setMonth(endDate.getMonth() + monthsToAdd);

      const subscriptionData = {
        userId,
        plan,
        startDate: admin.firestore.Timestamp.fromDate(startDate),
        endDate: admin.firestore.Timestamp.fromDate(endDate),
        isActive: true,
        transactionId,
        receipt: receipt || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const batch = db.batch();

      const subscriptionRef = db.collection('subscriptions').doc();
      batch.set(subscriptionRef, subscriptionData);

      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {isPremium: true});

      await batch.commit();

      return res.status(200).json({success: true, subscriptionId: subscriptionRef.id});
    } catch (error: any) {
      console.error('订阅处理失败:', error);
      return res.status(500).json({success: false, error: error.message});
    }
  });
});

export const exportUserData = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const {userId, format = 'csv'} = req.body;

      if (!userId) {
        return res.status(400).json({error: '缺少用户ID'});
      }

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        return res.status(404).json({error: '用户不存在'});
      }

      const workoutsSnapshot = await db
        .collection('workouts')
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .get();

      const mealsSnapshot = await db
        .collection('mealLogs')
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .get();

      const measurementsSnapshot = await db
        .collection('bodyMeasurements')
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .get();

      const activitiesSnapshot = await db
        .collection('dailyActivities')
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .get();

      let csvContent = `FitTrack Pro 数据导出\n\n`;
      csvContent += `用户: ${userData.nickname || '用户'}\n`;
      csvContent += `导出日期: ${new Date().toLocaleString()}\n\n`;

      csvContent += '运动记录\n';
      csvContent += '日期,名称,总时长(分钟),总卡路里\n';
      workoutsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        csvContent += `${data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : new Date(data.date).toISOString().split('T')[0]},${data.name},${data.totalDuration},${data.totalCalories}\n`;
      });

      csvContent += '\n饮食记录\n';
      csvContent += '日期,餐次,总卡路里,蛋白质,碳水,脂肪\n';
      mealsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        csvContent += `${data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : new Date(data.date).toISOString().split('T')[0]},${data.mealType},${data.totalCalories},${data.totalProtein},${data.totalCarbs},${data.totalFat}\n`;
      });

      csvContent += '\n身体数据\n';
      csvContent += '日期,体重,体脂率,BMI\n';
      measurementsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        csvContent += `${data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : new Date(data.date).toISOString().split('T')[0]},${data.weight},${data.bodyFat},${data.bmi}\n`;
      });

      csvContent += '\n活动记录\n';
      csvContent += '日期,步数,距离,卡路里\n';
      activitiesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        csvContent += `${data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : new Date(data.date).toISOString().split('T')[0]},${data.steps},${data.distance},${data.caloriesBurned}\n`;
      });

      const exportRef = db.collection('exports').doc();
      await exportRef.set({
        id: exportRef.id,
        userId,
        format,
        content: csvContent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        success: true,
        exportId: exportRef.id,
        content: csvContent,
      });
    } catch (error: any) {
      console.error('数据导出失败:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
});

export const testFunction = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, () => {
    return res.status(200).json({
      success: true,
      message: 'FitTrack Pro 云函数正常运行',
      timestamp: new Date().toISOString(),
      features: ['食物识别', '排行榜', '挑战', '周统计', '提醒', '订阅', '数据导出'],
    });
  });
});
