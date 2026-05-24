import {Workout, MealLog, BodyMeasurement, DailyActivity} from '@types/index';
import RNFS from 'react-native-fs';
import {Platform, Share} from 'react-native';

interface ExportData {
  workouts: Workout[];
  meals: MealLog[];
  measurements: BodyMeasurement[];
  activities: DailyActivity[];
  startDate: Date;
  endDate: Date;
}

class ExportService {
  async exportToCSV(data: ExportData): Promise<string> {
    const BOM = '\uFEFF';
    let csvContent = BOM;

    csvContent += '运动记录\n';
    csvContent += '日期,名称,总时长(分钟),总卡路里,运动项目\n';
    data.workouts.forEach(workout => {
      const exerciseNames = workout.exercises.map(e => e.name).join('; ');
      csvContent += `${this.formatDate(workout.date)},"${workout.name}",${workout.totalDuration},${workout.totalCalories},"${exerciseNames}"\n`;
    });

    csvContent += '\n运动详情\n';
    csvContent += '日期,运动名称,类型,时长(分钟),距离(公里),组数,次数,重量(kg),卡路里\n';
    data.workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        csvContent += `${this.formatDate(workout.date)},"${exercise.name}",${exercise.type},${exercise.duration || ''},${exercise.distance || ''},${exercise.sets || ''},${exercise.reps || ''},${exercise.weight || ''},${exercise.caloriesBurned}\n`;
      });
    });

    csvContent += '\n饮食记录\n';
    csvContent += '日期,餐次,总卡路里,蛋白质(g),碳水(g),脂肪(g),食物\n';
    data.meals.forEach(meal => {
      const foodNames = meal.foods.map(f => `${f.foodName} x${f.quantity}`).join('; ');
      csvContent += `${this.formatDate(meal.date)},${this.getMealTypeName(meal.mealType)},${meal.totalCalories},${meal.totalProtein.toFixed(1)},${meal.totalCarbs.toFixed(1)},${meal.totalFat.toFixed(1)},"${foodNames}"\n`;
    });

    csvContent += '\n身体数据\n';
    csvContent += '日期,体重(kg),体脂率(%),BMI,胸围(cm),腰围(cm),臀围(cm),臂围(cm),大腿围(cm)\n';
    data.measurements.forEach(measurement => {
      csvContent += `${this.formatDate(measurement.date)},${measurement.weight || ''},${measurement.bodyFat || ''},${measurement.bmi || ''},${measurement.chest || ''},${measurement.waist || ''},${measurement.hips || ''},${measurement.bicep || ''},${measurement.thigh || ''}\n`;
    });

    csvContent += '\n日常活动\n';
    csvContent += '日期,总步数,步行步数,跑步步数,距离(公里),卡路里,活动时长(分钟)\n';
    data.activities.forEach(activity => {
      csvContent += `${this.formatDate(activity.date)},${activity.steps},${activity.walkingSteps},${activity.runningSteps},${activity.distance.toFixed(2)},${activity.caloriesBurned},${activity.activeMinutes}\n`;
    });

    const filePath = await this.saveFile(csvContent, 'fitness_report.csv');
    return filePath;
  }

  async exportToPDF(data: ExportData): Promise<string> {
    const totalWorkoutCalories = this.calculateTotalCalories(data.workouts);
    const totalDuration = this.calculateTotalDuration(data.workouts);
    const totalSteps = data.activities.reduce((sum, a) => sum + a.steps, 0);
    const totalMealCalories = data.meals.reduce((sum, m) => sum + m.totalCalories, 0);

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>健身数据报告</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      margin: 0; 
      color: #333; 
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #4CAF50;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 20px;
    }
    .date-range {
      color: #666;
      font-size: 11px;
      margin-top: 5px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      border-left: 4px solid #4CAF50;
    }
    .summary-value {
      font-size: 22px;
      font-weight: bold;
      color: #4CAF50;
      margin: 0;
    }
    .summary-label {
      color: #666;
      font-size: 10px;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      color: #2196F3;
      font-size: 14px;
      font-weight: bold;
      margin: 0 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background-color: #4CAF50;
      color: white;
      padding: 7px 5px;
      text-align: left;
      font-weight: bold;
      font-size: 10px;
    }
    td {
      padding: 6px 5px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .empty-message {
      color: #999;
      font-style: italic;
      text-align: center;
      padding: 15px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #999;
      font-size: 10px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
    }
    .badge-calories {
      background-color: #FF9800;
      color: white;
    }
    .badge-duration {
      background-color: #2196F3;
      color: white;
    }
    .badge-steps {
      background-color: #4CAF50;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💪 FitTrack Pro 健身数据报告</h1>
    <div class="date-range">报告期间: ${this.formatDate(data.startDate)} 至 ${this.formatDate(data.endDate)}</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">${data.workouts.length}</div>
      <div class="summary-label">总运动次数</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${totalWorkoutCalories}</div>
      <div class="summary-label">运动消耗卡路里</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${totalDuration}</div>
      <div class="summary-label">总运动时长(分钟)</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${totalSteps.toLocaleString()}</div>
      <div class="summary-label">总步数</div>
    </div>
  </div>
`;

    if (data.workouts.length > 0) {
      htmlContent += `
  <div class="section">
    <div class="section-title">🏋️ 运动记录</div>
    <div class="table-container">
      <table>
        <tr><th>日期</th><th>名称</th><th>时长</th><th>卡路里</th><th>运动项目</th></tr>
`;
      data.workouts.forEach(workout => {
        const exerciseNames = workout.exercises.map(e => e.name).join(', ');
        htmlContent += `        <tr><td>${this.formatDate(workout.date)}</td><td>${workout.name}</td><td>${workout.totalDuration}分钟</td><td>${workout.totalCalories}</td><td>${exerciseNames}</td></tr>\n`;
      });
      htmlContent += `      </table>
    </div>
  </div>
`;
    }

    if (data.meals.length > 0) {
      htmlContent += `
  <div class="section">
    <div class="section-title">🍎 饮食记录</div>
    <div class="table-container">
      <table>
        <tr><th>日期</th><th>餐次</th><th>卡路里</th><th>蛋白质(g)</th><th>碳水(g)</th><th>脂肪(g)</th></tr>
`;
      data.meals.forEach(meal => {
        htmlContent += `        <tr><td>${this.formatDate(meal.date)}</td><td>${this.getMealTypeName(meal.mealType)}</td><td>${meal.totalCalories}</td><td>${meal.totalProtein.toFixed(1)}</td><td>${meal.totalCarbs.toFixed(1)}</td><td>${meal.totalFat.toFixed(1)}</td></tr>\n`;
      });
      htmlContent += `      </table>
    </div>
    <div style="margin-top: 10px; padding: 10px; background: #FFF8E1; border-radius: 6px;">
      <div style="font-size: 11px; color: #E65100;">
        <strong>📊 饮食总计:</strong> ${totalMealCalories} 卡路里
      </div>
    </div>
  </div>
`;
    }

    if (data.measurements.length > 0) {
      htmlContent += `
  <div class="section">
    <div class="section-title">� 身体数据</div>
    <div class="table-container">
      <table>
        <tr><th>日期</th><th>体重(kg)</th><th>体脂率(%)</th><th>BMI</th><th>腰围(cm)</th><th>臀围(cm)</th></tr>
`;
      data.measurements.forEach(measurement => {
        htmlContent += `        <tr><td>${this.formatDate(measurement.date)}</td><td>${measurement.weight || '-'}</td><td>${measurement.bodyFat || '-'}</td><td>${measurement.bmi?.toFixed(1) || '-'}</td><td>${measurement.waist || '-'}</td><td>${measurement.hips || '-'}</td></tr>\n`;
      });
      htmlContent += `      </table>
    </div>
  </div>
`;
    }

    if (data.activities.length > 0) {
      htmlContent += `
  <div class="section">
    <div class="section-title">🚶 日常活动</div>
    <div class="table-container">
      <table>
        <tr><th>日期</th><th>总步数</th><th>距离(公里)</th><th>卡路里</th><th>活动时长(分钟)</th></tr>
`;
      data.activities.forEach(activity => {
        htmlContent += `        <tr><td>${this.formatDate(activity.date)}</td><td>${activity.steps.toLocaleString()}</td><td>${activity.distance.toFixed(2)}</td><td>${activity.caloriesBurned}</td><td>${activity.activeMinutes}</td></tr>\n`;
      });
      htmlContent += `      </table>
    </div>
  </div>
`;
    }

    if (data.workouts.length === 0 && data.meals.length === 0 && data.measurements.length === 0 && data.activities.length === 0) {
      htmlContent += `
  <div class="empty-message">暂无数据可导出</div>
`;
    }

    htmlContent += `
  <div class="footer">
    <p>FitTrack Pro 健身追踪应用</p>
    <p>数据导出时间: ${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>
`;

    const filePath = await this.saveFile(htmlContent, 'fitness_report.html');
    return filePath;
  }

  private calculateTotalCalories(workouts: Workout[]): number {
    return workouts.reduce((sum, workout) => sum + workout.totalCalories, 0);
  }

  private calculateTotalDuration(workouts: Workout[]): number {
    return workouts.reduce((sum, workout) => sum + workout.totalDuration, 0);
  }

  private getMealTypeName(type: string): string {
    const names: Record<string, string> = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐',
    };
    return names[type] || type;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private async saveFile(content: string, filename: string): Promise<string> {
    const path = Platform.OS === 'ios' 
      ? `${RNFS.DocumentDirectoryPath}/${filename}`
      : `${RNFS.ExternalDirectoryPath}/${filename}`;
    
    await RNFS.writeFile(path, content, 'utf8');
    return path;
  }

  async shareFile(filePath: string): Promise<void> {
    try {
      await Share.share({
        title: '健身数据报告',
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        message: '请查看我的健身数据报告',
      });
    } catch (error) {
      console.error('分享文件失败:', error);
      throw error;
    }
  }
}

export const exportService = new ExportService();
