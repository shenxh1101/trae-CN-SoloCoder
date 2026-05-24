import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ProgressBarAndroid,
  ProgressViewIOS,
  Platform,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {fetchWorkouts} from '@redux/slices/workoutSlice';
import {fetchMealLogs} from '@redux/slices/nutritionSlice';
import {fetchMeasurements} from '@redux/slices/bodyMeasurementSlice';
import {AppDispatch, RootState} from '@redux/store';
import {exportService} from '@services/exportService';
import {Workout, MealLog, BodyMeasurement, DailyActivity} from '@types/index';

type ExportFormat = 'csv' | 'pdf';
type DateRange = '7days' | '30days' | '90days' | 'all';
type DataType = 'workouts' | 'meals' | 'measurements' | 'activities';

interface DateRangeOption {
  id: DateRange;
  label: string;
  days: number | null;
}

interface DataTypeOption {
  id: DataType;
  label: string;
  icon: string;
}

const ExportDataScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('30days');
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<DataType>>(
    new Set(['workouts', 'meals', 'measurements', 'activities'])
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const workouts = useSelector((state: RootState) => state.workout.workouts);
  const mealLogs = useSelector((state: RootState) => state.nutrition.mealLogs);
  const measurements = useSelector((state: RootState) => state.bodyMeasurement.measurements);
  const weeklyActivities = useSelector((state: RootState) => state.activity.weeklyActivities);
  const authUser = useSelector((state: RootState) => state.auth.user);

  const formatOptions = [
    {id: 'csv' as ExportFormat, label: 'CSV', icon: '📄', desc: '电子表格格式，适合数据处理'},
    {id: 'pdf' as ExportFormat, label: 'PDF', icon: '📑', desc: '图文报告格式，适合查看分享'},
  ];

  const dateRangeOptions: DateRangeOption[] = [
    {id: '7days', label: '最近7天', days: 7},
    {id: '30days', label: '最近30天', days: 30},
    {id: '90days', label: '最近90天', days: 90},
    {id: 'all', label: '全部数据', days: null},
  ];

  const dataTypeOptions: DataTypeOption[] = [
    {id: 'workouts', label: '运动记录', icon: '🏋️'},
    {id: 'meals', label: '饮食记录', icon: '🍎'},
    {id: 'measurements', label: '身体数据', icon: '📊'},
    {id: 'activities', label: '活动数据', icon: '🚶'},
  ];

  const toggleDataType = (type: DataType) => {
    const newSet = new Set(selectedDataTypes);
    if (newSet.has(type)) {
      if (newSet.size > 1) {
        newSet.delete(type);
      } else {
        Alert.alert('提示', '至少选择一种数据类型');
        return;
      }
    } else {
      newSet.add(type);
    }
    setSelectedDataTypes(newSet);
  };

  const getDateRange = (): {startDate: Date; endDate: Date} => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const range = dateRangeOptions.find(r => r.id === selectedDateRange);
    const startDate = new Date();
    if (range?.days) {
      startDate.setDate(startDate.getDate() - range.days);
    } else {
      startDate.setFullYear(2000, 0, 1);
    }
    startDate.setHours(0, 0, 0, 0);
    
    return {startDate, endDate};
  };

  const filterDataByDate = <T extends {date: Date}>(data: T[], startDate: Date, endDate: Date): T[] => {
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const handleExport = useCallback(async () => {
    if (!authUser?.uid) {
      Alert.alert('提示', '请先登录');
      return;
    }

    if (selectedDataTypes.size === 0) {
      Alert.alert('提示', '请至少选择一种数据类型');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportSuccess(false);
    setExportedFilePath(null);

    try {
      const {startDate, endDate} = getDateRange();

      let filteredWorkouts: Workout[] = [];
      let filteredMeals: MealLog[] = [];
      let filteredMeasurements: BodyMeasurement[] = [];
      let filteredActivities: DailyActivity[] = [];

      if (selectedDataTypes.has('workouts')) {
        setExportProgress(10);
        if (workouts.length === 0) {
          await dispatch(fetchWorkouts(authUser.uid)).unwrap();
        }
      }

      if (selectedDataTypes.has('meals')) {
        setExportProgress(25);
        if (mealLogs.length === 0) {
          await dispatch(fetchMealLogs({userId: authUser.uid, date: new Date()})).unwrap();
        }
      }

      if (selectedDataTypes.has('measurements')) {
        setExportProgress(40);
        if (measurements.length === 0) {
          await dispatch(fetchMeasurements(authUser.uid)).unwrap();
        }
      }

      if (selectedDataTypes.has('activities')) {
        setExportProgress(55);
      }

      setExportProgress(65);

      if (selectedDataTypes.has('workouts')) {
        filteredWorkouts = filterDataByDate(workouts, startDate, endDate);
      }
      if (selectedDataTypes.has('meals')) {
        filteredMeals = filterDataByDate(mealLogs, startDate, endDate);
      }
      if (selectedDataTypes.has('measurements')) {
        filteredMeasurements = filterDataByDate(measurements, startDate, endDate);
      }
      if (selectedDataTypes.has('activities')) {
        filteredActivities = filterDataByDate(weeklyActivities, startDate, endDate);
      }

      setExportProgress(75);

      const exportData = {
        workouts: filteredWorkouts,
        meals: filteredMeals,
        measurements: filteredMeasurements,
        activities: filteredActivities,
        startDate,
        endDate,
      };

      let filePath: string;
      if (selectedFormat === 'csv') {
        filePath = await exportService.exportToCSV(exportData);
      } else {
        filePath = await exportService.exportToPDF(exportData);
      }

      setExportProgress(100);
      setExportedFilePath(filePath);
      setExportSuccess(true);

      Alert.alert(
        '导出成功',
        `数据已成功导出为 ${selectedFormat.toUpperCase()} 格式`,
        [
          {
            text: '分享',
            onPress: () => handleShare(filePath),
          },
          {
            text: '好的',
            style: 'default',
          },
        ]
      );
    } catch (error: any) {
      console.error('导出失败:', error);
      Alert.alert('导出失败', error.message || '数据导出过程中出现错误，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [authUser?.uid, selectedDataTypes, selectedFormat, workouts, mealLogs, measurements, weeklyActivities, dispatch]);

  const handleShare = async (filePath: string) => {
    try {
      await exportService.shareFile(filePath);
    } catch (error: any) {
      Alert.alert('分享失败', error.message || '分享文件失败，请重试');
    }
  };

  const handleSaveToLocal = () => {
    if (exportedFilePath) {
      Alert.alert(
        '保存成功',
        `文件已保存到:\n${exportedFilePath}`
      );
    }
  };

  const getSelectedDataCount = (): {[key in DataType]: number} => {
    const {startDate, endDate} = getDateRange();
    return {
      workouts: selectedDataTypes.has('workouts') ? filterDataByDate(workouts, startDate, endDate).length : 0,
      meals: selectedDataTypes.has('meals') ? filterDataByDate(mealLogs, startDate, endDate).length : 0,
      measurements: selectedDataTypes.has('measurements') ? filterDataByDate(measurements, startDate, endDate).length : 0,
      activities: selectedDataTypes.has('activities') ? filterDataByDate(weeklyActivities, startDate, endDate).length : 0,
    };
  };

  const dataCounts = getSelectedDataCount();
  const totalRecords = Object.values(dataCounts).reduce((sum, count) => sum + count, 0);

  const renderProgressBar = (progress: number) => {
    if (Platform.OS === 'android') {
      return (
        <ProgressBarAndroid
          styleAttr="Horizontal"
          indeterminate={false}
          progress={progress / 100}
          color="#4CAF50"
          style={styles.progressBar}
        />
      );
    }
    return (
      <ProgressViewIOS
        progress={progress / 100}
        progressTintColor="#4CAF50"
        trackTintColor="#E0E0E0"
        style={styles.progressBar}
      />
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>数据导出</Text>
        <Text style={styles.headerSubtitle}>导出您的健身数据，方便备份和分享</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>导出格式</Text>
        <View style={styles.formatContainer}>
          {formatOptions.map((format) => (
            <TouchableOpacity
              key={format.id}
              style={[
                styles.formatCard,
                selectedFormat === format.id && styles.formatCardSelected,
              ]}
              onPress={() => setSelectedFormat(format.id)}
              disabled={isExporting}>
              <Text style={styles.formatIcon}>{format.icon}</Text>
              <Text style={[
                styles.formatLabel,
                selectedFormat === format.id && styles.formatLabelSelected,
              ]}>
                {format.label}
              </Text>
              <Text style={styles.formatDesc}>{format.desc}</Text>
              <View style={[
                styles.formatCheck,
                selectedFormat === format.id && styles.formatCheckSelected,
              ]}>
                {selectedFormat === format.id && (
                  <Text style={styles.formatCheckIcon}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>时间范围</Text>
        <View style={styles.dateRangeContainer}>
          {dateRangeOptions.map((range) => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.dateRangeItem,
                selectedDateRange === range.id && styles.dateRangeItemSelected,
              ]}
              onPress={() => setSelectedDateRange(range.id)}
              disabled={isExporting}>
              <Text style={[
                styles.dateRangeLabel,
                selectedDateRange === range.id && styles.dateRangeLabelSelected,
              ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>数据类型</Text>
        <View style={styles.dataTypeContainer}>
          {dataTypeOptions.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.dataTypeCard,
                selectedDataTypes.has(type.id) && styles.dataTypeCardSelected,
              ]}
              onPress={() => toggleDataType(type.id)}
              disabled={isExporting}>
              <View style={styles.dataTypeHeader}>
                <Text style={styles.dataTypeIcon}>{type.icon}</Text>
                <View style={[
                  styles.dataTypeCheck,
                  selectedDataTypes.has(type.id) && styles.dataTypeCheckSelected,
                ]}>
                  {selectedDataTypes.has(type.id) && (
                    <Text style={styles.dataTypeCheckIcon}>✓</Text>
                  )}
                </View>
              </View>
              <Text style={[
                styles.dataTypeLabel,
                selectedDataTypes.has(type.id) && styles.dataTypeLabelSelected,
              ]}>
                {type.label}
              </Text>
              <Text style={styles.dataTypeCount}>
                {dataCounts[type.id]} 条记录
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>导出预览</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>导出格式</Text>
            <Text style={styles.summaryValue}>{selectedFormat.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>时间范围</Text>
            <Text style={styles.summaryValue}>
              {dateRangeOptions.find(r => r.id === selectedDateRange)?.label}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>数据类型</Text>
            <Text style={styles.summaryValue}>
              {Array.from(selectedDataTypes)
                .map(id => dataTypeOptions.find(t => t.id === id)?.label)
                .join('、')}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>总记录数</Text>
            <Text style={[styles.summaryValue, styles.summaryHighlight]}>
              {totalRecords} 条
            </Text>
          </View>
        </View>
      </View>

      {isExporting && (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>正在导出数据... {exportProgress}%</Text>
          {renderProgressBar(exportProgress)}
        </View>
      )}

      {exportSuccess && exportedFilePath && (
        <View style={styles.successSection}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>导出成功</Text>
            <Text style={styles.successPath}>文件路径: {exportedFilePath}</Text>
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => handleShare(exportedFilePath)}>
                <Text style={styles.actionButtonText}>分享文件</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveToLocal}>
                <Text style={styles.actionButtonText}>保存到本地</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={isExporting}>
          {isExporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.exportButtonText}>
              📤 导出数据 ({totalRecords} 条)
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 温馨提示</Text>
        <Text style={styles.tipsItem}>• CSV 格式可以用 Excel、Numbers 等表格软件打开</Text>
        <Text style={styles.tipsItem}>• PDF 格式包含图表和统计数据，适合打印和分享</Text>
        <Text style={styles.tipsItem}>• 导出的文件保存在应用的文档目录中</Text>
        <Text style={styles.tipsItem}>• 建议定期导出数据备份，防止数据丢失</Text>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 24,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  formatContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  formatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formatCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  formatIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  formatLabelSelected: {
    color: '#4CAF50',
  },
  formatDesc: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  formatCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatCheckSelected: {
    backgroundColor: '#4CAF50',
  },
  formatCheckIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateRangeItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  dateRangeItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  dateRangeLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dateRangeLabelSelected: {
    color: '#4CAF50',
  },
  dataTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataTypeCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dataTypeCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  dataTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataTypeIcon: {
    fontSize: 28,
  },
  dataTypeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataTypeCheckSelected: {
    backgroundColor: '#4CAF50',
  },
  dataTypeCheckIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  dataTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dataTypeLabelSelected: {
    color: '#4CAF50',
  },
  dataTypeCount: {
    fontSize: 12,
    color: '#999',
  },
  summarySection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  summaryHighlight: {
    color: '#4CAF50',
    fontSize: 16,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  progressSection: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
  },
  successSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  successCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  successPath: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#2196F3',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  exportButtonDisabled: {
    backgroundColor: '#A5D6A7',
    shadowOpacity: 0.1,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  tipsSection: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8F00',
    marginBottom: 12,
  },
  tipsItem: {
    fontSize: 13,
    color: '#795548',
    lineHeight: 20,
    marginBottom: 4,
  },
  bottomSpace: {
    height: 40,
  },
});

export default ExportDataScreen;
