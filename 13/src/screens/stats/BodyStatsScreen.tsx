import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {LineChart} from 'react-native-chart-kit';
import {
  fetchMeasurements,
  addMeasurement,
  deleteMeasurement,
} from '@redux/slices/bodyMeasurementSlice';
import {recommendationService} from '@services/recommendationService';
import {BodyMeasurement} from '@types/index';
import {AppDispatch, RootState} from '@redux/store';

const screenWidth = Dimensions.get('window').width;
const THEME_COLOR = '#4CAF50';

type BodyStatsScreenRouteProp = RouteProp<
  {BodyStats: {selectedDate?: Date; highlightId?: string}},
  'BodyStats'
>;

interface FormData {
  weight: string;
  bodyFat: string;
  chest: string;
  waist: string;
  hips: string;
  bicep: string;
  thigh: string;
  calf: string;
  neck: string;
}

const initialFormData: FormData = {
  weight: '',
  bodyFat: '',
  chest: '',
  waist: '',
  hips: '',
  bicep: '',
  thigh: '',
  calf: '',
  neck: '',
};

const BodyStatsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const route = useRoute<BodyStatsScreenRouteProp>();

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const {measurements, latestMeasurement, isLoading, error} = useSelector(
    (state: RootState) => state.bodyMeasurement
  );
  const userId = useSelector((state: RootState) => state.auth.user?.uid);

  const [activeTab, setActiveTab] = useState<'current' | 'trend' | 'history'>('current');
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [chartType, setChartType] = useState<'weight' | 'bodyFat'>('weight');

  useEffect(() => {
    if (userId) {
      dispatch(fetchMeasurements(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (route.params?.highlightId) {
      setActiveTab('history');
    }
  }, [route.params]);

  const currentBMI =
    latestMeasurement?.weight && userProfile?.height
      ? recommendationService.calculateBMI(
          latestMeasurement.weight,
          userProfile.height
        )
      : latestMeasurement?.bmi || 0;

  const bmiStatus = recommendationService.getBMIStatus(currentBMI);

  const getChartData = () => {
    const sortedMeasurements = [...measurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);

    const labels = sortedMeasurements.map(m => {
      const date = new Date(m.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const data = sortedMeasurements.map(m =>
      chartType === 'weight' ? m.weight || 0 : m.bodyFat || 0
    );

    return {labels, data};
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('错误', '请先登录');
      return;
    }

    const weight = parseFloat(formData.weight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('提示', '请输入有效的体重');
      return;
    }

    const bmi = userProfile?.height
      ? recommendationService.calculateBMI(weight, userProfile.height)
      : undefined;

    const measurement: Omit<BodyMeasurement, 'id'> = {
      userId,
      date: new Date(),
      weight: weight,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      chest: formData.chest ? parseFloat(formData.chest) : undefined,
      waist: formData.waist ? parseFloat(formData.waist) : undefined,
      hips: formData.hips ? parseFloat(formData.hips) : undefined,
      bicep: formData.bicep ? parseFloat(formData.bicep) : undefined,
      thigh: formData.thigh ? parseFloat(formData.thigh) : undefined,
      calf: formData.calf ? parseFloat(formData.calf) : undefined,
      neck: formData.neck ? parseFloat(formData.neck) : undefined,
      bmi,
    };

    try {
      await dispatch(addMeasurement(measurement)).unwrap();
      setModalVisible(false);
      setFormData(initialFormData);
      Alert.alert('成功', '身体数据已记录');
    } catch (err) {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('确认删除', '确定要删除这条记录吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: () => dispatch(deleteMeasurement(id)),
      },
    ]);
  };

  const renderStatCard = (
    label: string,
    value: string | number | undefined,
    unit: string,
    icon: string,
    color?: string
  ) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value ?? '--'}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={[styles.statLabel, color && {color}]}>{label}</Text>
    </View>
  );

  const renderMeasurementItem = (label: string, value: number | undefined, unit: string) => (
    <View style={styles.measurementItem}>
      <Text style={styles.measurementLabel}>{label}</Text>
      <Text style={styles.measurementValue}>
        {value ? `${value} ${unit}` : '--'}
      </Text>
    </View>
  );

  if (isLoading && measurements.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>身体数据</Text>
        <Text style={styles.headerSubtitle}>
          {latestMeasurement
            ? `最近记录: ${formatDate(latestMeasurement.date)}`
            : '暂无记录'}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'current' && styles.activeTabText,
            ]}>
            当前数据
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trend' && styles.activeTab]}
          onPress={() => setActiveTab('trend')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'trend' && styles.activeTabText,
            ]}>
            趋势图表
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText,
            ]}>
            历史记录
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'current' && (
          <>
            <View style={styles.statsGrid}>
              {renderStatCard(
                '体重',
                latestMeasurement?.weight,
                'kg',
                '⚖️'
              )}
              {renderStatCard(
                '体脂率',
                latestMeasurement?.bodyFat,
                '%',
                '📊'
              )}
              {renderStatCard(
                'BMI',
                currentBMI || '--',
                '',
                '📈',
                bmiStatus.color
              )}
            </View>

            <View style={[styles.bmiCard, {borderLeftColor: bmiStatus.color}]}>
              <View style={styles.bmiHeader}>
                <Text style={styles.bmiTitle}>BMI 指数</Text>
                <View style={[styles.bmiBadge, {backgroundColor: bmiStatus.color}]}>
                  <Text style={styles.bmiBadgeText}>{bmiStatus.status}</Text>
                </View>
              </View>
              <Text style={styles.bmiDescription}>{bmiStatus.description}</Text>
              <View style={styles.bmiRange}>
                <View style={styles.bmiRangeItem}>
                  <Text style={styles.bmiRangeLabel}>偏瘦</Text>
                  <Text style={styles.bmiRangeValue}>{'< 18.5'}</Text>
                </View>
                <View style={styles.bmiRangeItem}>
                  <Text style={[styles.bmiRangeLabel, {color: '#4CAF50'}]}>正常</Text>
                  <Text style={styles.bmiRangeValue}>18.5-23.9</Text>
                </View>
                <View style={styles.bmiRangeItem}>
                  <Text style={[styles.bmiRangeLabel, {color: '#FF9800'}]}>偏胖</Text>
                  <Text style={styles.bmiRangeValue}>24-27.9</Text>
                </View>
                <View style={styles.bmiRangeItem}>
                  <Text style={[styles.bmiRangeLabel, {color: '#F44336'}]}>肥胖</Text>
                  <Text style={styles.bmiRangeValue}>{'>= 28'}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>身体围度</Text>
            <View style={styles.measurementsContainer}>
              <View style={styles.measurementsRow}>
                {renderMeasurementItem('胸围', latestMeasurement?.chest, 'cm')}
                {renderMeasurementItem('腰围', latestMeasurement?.waist, 'cm')}
              </View>
              <View style={styles.measurementsRow}>
                {renderMeasurementItem('臀围', latestMeasurement?.hips, 'cm')}
                {renderMeasurementItem('臂围', latestMeasurement?.bicep, 'cm')}
              </View>
              <View style={styles.measurementsRow}>
                {renderMeasurementItem('腿围', latestMeasurement?.thigh, 'cm')}
                {renderMeasurementItem('小腿围', latestMeasurement?.calf, 'cm')}
              </View>
              <View style={styles.measurementsRow}>
                {renderMeasurementItem('颈围', latestMeasurement?.neck, 'cm')}
              </View>
            </View>
          </>
        )}

        {activeTab === 'trend' && (
          <View style={styles.trendContainer}>
            <View style={styles.chartTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.chartTypeButton,
                  chartType === 'weight' && styles.chartTypeButtonActive,
                ]}
                onPress={() => setChartType('weight')}>
                <Text
                  style={[
                    styles.chartTypeButtonText,
                    chartType === 'weight' && styles.chartTypeButtonTextActive,
                  ]}>
                  体重趋势
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chartTypeButton,
                  chartType === 'bodyFat' && styles.chartTypeButtonActive,
                ]}
                onPress={() => setChartType('bodyFat')}>
                <Text
                  style={[
                    styles.chartTypeButtonText,
                    chartType === 'bodyFat' && styles.chartTypeButtonTextActive,
                  ]}>
                  体脂率趋势
                </Text>
              </TouchableOpacity>
            </View>

            {measurements.length >= 2 ? (
              <>
                <LineChart
                  data={{
                    labels: getChartData().labels,
                    datasets: [
                      {
                        data: getChartData().data,
                      },
                    ],
                  }}
                  width={screenWidth - 40}
                  height={250}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: THEME_COLOR,
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#e0e0e0',
                    },
                  }}
                  bezier
                  style={styles.chart}
                  yAxisSuffix={chartType === 'weight' ? ' kg' : '%'}
                  fromZero={false}
                />

                <View style={styles.trendStats}>
                  <View style={styles.trendStatCard}>
                    <Text style={styles.trendStatLabel}>最高值</Text>
                    <Text style={styles.trendStatValue}>
                      {Math.max(...getChartData().data).toFixed(1)}
                      {chartType === 'weight' ? ' kg' : '%'}
                    </Text>
                  </View>
                  <View style={styles.trendStatCard}>
                    <Text style={styles.trendStatLabel}>最低值</Text>
                    <Text style={styles.trendStatValue}>
                      {Math.min(...getChartData().data).toFixed(1)}
                      {chartType === 'weight' ? ' kg' : '%'}
                    </Text>
                  </View>
                  <View style={styles.trendStatCard}>
                    <Text style={styles.trendStatLabel}>平均值</Text>
                    <Text style={styles.trendStatValue}>
                      {(
                        getChartData().data.reduce((a, b) => a + b, 0) /
                        getChartData().data.length
                      ).toFixed(1)}
                      {chartType === 'weight' ? ' kg' : '%'}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataEmoji}>📊</Text>
                <Text style={styles.noDataText}>至少需要2条记录才能显示趋势图</Text>
                <Text style={styles.noDataSubtext}>点击右下角按钮添加新记录</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {measurements.length === 0 ? (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataEmoji}>📝</Text>
                <Text style={styles.noDataText}>暂无身体数据记录</Text>
                <Text style={styles.noDataSubtext}>点击右下角按钮添加第一条记录</Text>
              </View>
            ) : (
              measurements.map((measurement, index) => (
                <View
                  key={measurement.id}
                  style={[
                    styles.historyCard,
                    route.params?.highlightId === measurement.id && styles.highlightedCard,
                    index === 0 && styles.latestCard,
                  ]}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyDateContainer}>
                      {index === 0 && (
                        <View style={styles.latestBadge}>
                          <Text style={styles.latestBadgeText}>最新</Text>
                        </View>
                      )}
                      <Text style={styles.historyDate}>
                        {formatDate(measurement.date)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(measurement.id)}>
                      <Text style={styles.deleteButtonText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.historyStats}>
                    <View style={styles.historyStatItem}>
                      <Text style={styles.historyStatValue}>
                        {measurement.weight || '--'}
                      </Text>
                      <Text style={styles.historyStatLabel}>体重(kg)</Text>
                    </View>
                    <View style={styles.historyStatItem}>
                      <Text style={styles.historyStatValue}>
                        {measurement.bodyFat || '--'}
                      </Text>
                      <Text style={styles.historyStatLabel}>体脂(%)</Text>
                    </View>
                    <View style={styles.historyStatItem}>
                      <Text style={styles.historyStatValue}>
                        {measurement.bmi || '--'}
                      </Text>
                      <Text style={styles.historyStatLabel}>BMI</Text>
                    </View>
                    <View style={styles.historyStatItem}>
                      <Text style={styles.historyStatValue}>
                        {measurement.waist || '--'}
                      </Text>
                      <Text style={styles.historyStatLabel}>腰围(cm)</Text>
                    </View>
                  </View>
                  <View style={styles.historyMeasurements}>
                    {measurement.chest && (
                      <Text style={styles.historyMeasurementText}>
                        胸围 {measurement.chest}cm
                      </Text>
                    )}
                    {measurement.hips && (
                      <Text style={styles.historyMeasurementText}>
                        臀围 {measurement.hips}cm
                      </Text>
                    )}
                    {measurement.bicep && (
                      <Text style={styles.historyMeasurementText}>
                        臂围 {measurement.bicep}cm
                      </Text>
                    )}
                    {measurement.thigh && (
                      <Text style={styles.historyMeasurementText}>
                        腿围 {measurement.thigh}cm
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加身体数据</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.formSectionTitle}>基本数据</Text>
              <View style={styles.formRow}>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>体重 (kg) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.weight}
                    onChangeText={(v) => handleInputChange('weight', v)}
                    placeholder="例如: 65.5"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>体脂率 (%)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.bodyFat}
                    onChangeText={(v) => handleInputChange('bodyFat', v)}
                    placeholder="例如: 20.5"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <Text style={styles.formSectionTitle}>身体围度 (cm)</Text>
              <View style={styles.formRow}>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>胸围</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.chest}
                    onChangeText={(v) => handleInputChange('chest', v)}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>腰围</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.waist}
                    onChangeText={(v) => handleInputChange('waist', v)}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>臀围</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.hips}
                    onChangeText={(v) => handleInputChange('hips', v)}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>臂围</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.bicep}
                    onChangeText={(v) => handleInputChange('bicep', v)}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>腿围</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.thigh}
                    onChangeText={(v) => handleInputChange('thigh', v)}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>小腿围</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.calf}
                    onChangeText={(v) => handleInputChange('calf', v)}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>颈围</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.neck}
                    onChangeText={(v) => handleInputChange('neck', v)}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>保存记录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: THEME_COLOR,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: THEME_COLOR,
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: THEME_COLOR,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontWeight: '500',
  },
  bmiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bmiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bmiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bmiBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bmiDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  bmiRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bmiRangeItem: {
    alignItems: 'center',
  },
  bmiRangeLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 3,
  },
  bmiRangeValue: {
    fontSize: 11,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  measurementsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  measurementsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  measurementItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  measurementLabel: {
    fontSize: 14,
    color: '#666',
  },
  measurementValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trendContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  chartTypeButtonActive: {
    backgroundColor: '#fff',
  },
  chartTypeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chartTypeButtonTextActive: {
    color: THEME_COLOR,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  trendStatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  trendStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  trendStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME_COLOR,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  noDataEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
  },
  historyContainer: {
    paddingBottom: 100,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
  },
  latestCard: {
    borderWidth: 2,
    borderColor: THEME_COLOR,
  },
  highlightedCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: THEME_COLOR,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  latestBadge: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 10,
  },
  latestBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyStatItem: {
    alignItems: 'center',
  },
  historyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME_COLOR,
    marginBottom: 3,
  },
  historyStatLabel: {
    fontSize: 11,
    color: '#999',
  },
  historyMeasurements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  historyMeasurementText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 24,
  },
  modalScroll: {
    padding: 20,
    maxHeight: 500,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  formItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  formLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  formInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: THEME_COLOR,
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BodyStatsScreen;
