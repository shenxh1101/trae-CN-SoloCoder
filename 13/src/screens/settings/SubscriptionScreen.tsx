import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
} from 'react-native-iap';
import {
  fetchSubscription,
  purchaseSubscription,
  setProducts,
} from '@redux/slices/subscriptionSlice';
import {AppDispatch, RootState} from '@redux/store';

const ITEM_SKUS = Platform.select({
  ios: ['com.fittrackpro.monthly', 'com.fittrackpro.quarterly', 'com.fittrackpro.yearly'],
  android: ['com.fittrackpro.monthly', 'com.fittrackpro.quarterly', 'com.fittrackpro.yearly'],
});

interface PlanOption {
  id: string;
  sku: string;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  monthlyPrice: number;
  savings: string;
  features: string[];
  isPopular?: boolean;
}

const SubscriptionScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [products, setIapProducts] = useState<any[]>([]);
  const [iapLoading, setIapLoading] = useState(true);

  const subscription = useSelector((state: RootState) => state.subscription.subscription);
  const isLoading = useSelector((state: RootState) => state.subscription.isLoading);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const userProfile = useSelector((state: RootState) => state.user.profile);

  const planOptions: PlanOption[] = [
    {
      id: 'monthly',
      sku: Platform.OS === 'ios' ? 'com.fittrackpro.monthly' : 'com.fittrackpro.monthly',
      name: '月卡',
      price: '¥28',
      priceValue: 28,
      period: '/月',
      monthlyPrice: 28,
      savings: '',
      features: ['高级训练计划', '详细数据分析', '无广告', '优先客服'],
    },
    {
      id: 'quarterly',
      sku: Platform.OS === 'ios' ? 'com.fittrackpro.quarterly' : 'com.fittrackpro.quarterly',
      name: '季卡',
      price: '¥78',
      priceValue: 78,
      period: '/3个月',
      monthlyPrice: 26,
      savings: '节省8%',
      features: ['高级训练计划', '详细数据分析', '无广告', '优先客服'],
    },
    {
      id: 'yearly',
      sku: Platform.OS === 'ios' ? 'com.fittrackpro.yearly' : 'com.fittrackpro.yearly',
      name: '年卡',
      price: '¥288',
      priceValue: 288,
      period: '/年',
      monthlyPrice: 24,
      savings: '节省31%',
      features: ['高级训练计划', '详细数据分析', '无广告', '优先客服'],
      isPopular: true,
    },
  ];

  const premiumFeatures = [
    {icon: '🏋️', title: '高级训练计划', desc: 'AI智能定制专属训练方案'},
    {icon: '📊', title: '详细数据分析', desc: '多维度数据可视化分析报告'},
    {icon: '🚫', title: '无广告体验', desc: '纯净使用体验，无任何广告'},
    {icon: '🎧', title: '优先客服', desc: '专属客服通道，优先响应'},
  ];

  useEffect(() => {
    if (authUser?.uid) {
      dispatch(fetchSubscription(authUser.uid));
    }
    initIAP();
    return () => {
      endConnection();
    };
  }, [dispatch, authUser?.uid]);

  const initIAP = async () => {
    try {
      await initConnection();
      const fetchedProducts = await getSubscriptions({skus: ITEM_SKUS || []});
      setIapProducts(fetchedProducts);
      dispatch(setProducts(fetchedProducts));
    } catch (error) {
      console.log('IAP初始化失败:', error);
    } finally {
      setIapLoading(false);
    }
  };

  const handlePurchase = useCallback(async (plan: PlanOption) => {
    if (!authUser?.uid) {
      Alert.alert('提示', '请先登录');
      return;
    }

    setIsPurchasing(true);
    try {
      const product = products.find(p => p.productId === plan.sku);
      if (!product) {
        Alert.alert('错误', '无法获取产品信息，请稍后重试');
        return;
      }

      const purchase = await requestSubscription({
        sku: plan.sku,
        ...(Platform.OS === 'android' && product.subscriptionOfferDetails?.[0]?.offerToken && {
          subscriptionOffers: [{sku: plan.sku, offerToken: product.subscriptionOfferDetails[0].offerToken}],
        }),
      });

      if (purchase) {
        const transactionId = purchase.transactionId || purchase.purchaseToken || purchase.receipt;
        if (!transactionId) {
          Alert.alert('错误', '无法获取交易信息');
          return;
        }

        const planType = plan.id === 'yearly' ? 'yearly' : plan.id === 'quarterly' ? 'quarterly' : 'monthly';
        
        await dispatch(
          purchaseSubscription({
            userId: authUser.uid,
            plan: planType as 'monthly' | 'quarterly' | 'yearly',
            transactionId,
          })
        ).unwrap();

        Alert.alert('成功', '订阅成功！感谢您的支持', [
          {
            text: '确定',
            onPress: () => {
              dispatch(fetchSubscription(authUser.uid));
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('购买错误:', error);
      if (error.code === 'E_USER_CANCELLED') {
        return;
      }
      Alert.alert('购买失败', error.message || '购买过程中出现错误，请重试');
    } finally {
      setIsPurchasing(false);
    }
  }, [authUser?.uid, products, dispatch]);

  const handleRestorePurchase = async () => {
    if (!authUser?.uid) {
      Alert.alert('提示', '请先登录');
      return;
    }

    setIsRestoring(true);
    try {
      const purchases = await getAvailablePurchases();
      if (purchases.length > 0) {
        const activePurchase = purchases.find(p => p.transactionReceipt) || purchases[0];
        const transactionId = activePurchase.transactionId || activePurchase.purchaseToken || activePurchase.transactionReceipt;
        
        let planType: 'monthly' | 'quarterly' | 'yearly' = 'monthly';
        const productId = activePurchase.productId || '';
        
        if (productId.includes('yearly')) {
          planType = 'yearly';
        } else if (productId.includes('quarterly')) {
          planType = 'quarterly';
        }

        await dispatch(
          purchaseSubscription({
            userId: authUser.uid,
            plan: planType,
            transactionId,
          })
        ).unwrap();

        Alert.alert('恢复成功', '已成功恢复您的订阅', [
          {
            text: '确定',
            onPress: () => {
              dispatch(fetchSubscription(authUser.uid));
            },
          },
        ]);
      } else {
        Alert.alert('提示', '未找到可恢复的订阅');
      }
    } catch (error: any) {
      console.error('恢复购买错误:', error);
      Alert.alert('恢复失败', error.message || '恢复订阅失败，请重试');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getPlanName = (plan: string | undefined): string => {
    const names: Record<string, string> = {
      monthly: '月卡会员',
      quarterly: '季卡会员',
      yearly: '年卡会员',
    };
    return names[plan || ''] || '会员';
  };

  const isPremiumActive = subscription?.isActive || userProfile?.isPremium;

  if (isLoading && !subscription) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>订阅管理</Text>
        <Text style={styles.headerSubtitle}>升级会员，解锁全部功能</Text>
      </View>

      {isPremiumActive && subscription && (
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <View style={styles.premiumIconContainer}>
              <Text style={styles.premiumIcon}>💎</Text>
            </View>
            <View style={styles.currentPlanInfo}>
              <Text style={styles.currentPlanName}>{getPlanName(subscription.plan)}</Text>
              <Text style={styles.currentPlanStatus}>
                {subscription.isActive ? '✅ 订阅中' : '❌ 已过期'}
              </Text>
            </View>
          </View>
          <View style={styles.planDates}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>开始日期</Text>
              <Text style={styles.dateValue}>{formatDate(subscription.startDate)}</Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>到期日期</Text>
              <Text style={styles.dateValue}>{formatDate(subscription.endDate)}</Text>
            </View>
          </View>
        </View>
      )}

      {!isPremiumActive && (
        <View style={styles.freePlanCard}>
          <Text style={styles.freePlanIcon}>🆓</Text>
          <Text style={styles.freePlanTitle}>当前版本：免费版</Text>
          <Text style={styles.freePlanDesc}>升级会员，解锁更多高级功能</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>选择订阅计划</Text>
        <Text style={styles.sectionSubtitle}>所有计划均包含以下会员权益</Text>
      </View>

      <View style={styles.featuresContainer}>
        {premiumFeatures.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.plansContainer}>
        {iapLoading ? (
          <ActivityIndicator size="small" color="#4CAF50" style={styles.iapLoading} />
        ) : (
          planOptions.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.isPopular && styles.planCardPopular,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              disabled={isPurchasing}>
              {plan.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>最受欢迎</Text>
                </View>
              )}
              <View style={styles.planRadio}>
                <View
                  style={[
                    styles.radioOuter,
                    selectedPlan === plan.id && styles.radioOuterSelected,
                  ]}>
                  {selectedPlan === plan.id && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.planName}>{plan.name}</Text>
              </View>
              <View style={styles.planPriceContainer}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </View>
              <Text style={styles.planMonthlyPrice}>
                约 ¥{plan.monthlyPrice}/月
              </Text>
              {plan.savings ? (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>{plan.savings}</Text>
                </View>
              ) : (
                <View style={styles.savingsPlaceholder} />
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => {
            const plan = planOptions.find(p => p.id === selectedPlan);
            if (plan) handlePurchase(plan);
          }}
          disabled={isPurchasing || iapLoading}>
          {isPurchasing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              立即订阅 {planOptions.find(p => p.id === selectedPlan)?.price}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchase}
          disabled={isRestoring}>
          {isRestoring ? (
            <ActivityIndicator color="#4CAF50" size="small" />
          ) : (
            <Text style={styles.restoreButtonText}>恢复购买</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          订阅将自动续订，您可以在订阅到期前24小时取消自动续订。
          购买确认后将从您的账户扣款。
        </Text>
        <TouchableOpacity>
          <Text style={styles.termsLink}>用户协议</Text>
        </TouchableOpacity>
        <Text style={styles.termsDivider}> | </Text>
        <TouchableOpacity>
          <Text style={styles.termsLink}>隐私政策</Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
  currentPlanCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  premiumIcon: {
    fontSize: 28,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentPlanStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  planDates: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  freePlanCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  freePlanIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  freePlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  freePlanDesc: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
    width: 40,
    textAlign: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#999',
  },
  plansContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  iapLoading: {
    flex: 1,
    padding: 40,
  },
  planCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  planCardPopular: {
    transform: [{scale: 1.02}],
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  popularText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  planRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: '#4CAF50',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  planPeriod: {
    fontSize: 12,
    color: '#666',
  },
  planMonthlyPrice: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  savingsBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  savingsPlaceholder: {
    height: 20,
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  termsContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
    lineHeight: 18,
  },
  termsLink: {
    fontSize: 12,
    color: '#4CAF50',
  },
  termsDivider: {
    fontSize: 12,
    color: '#999',
  },
  bottomSpace: {
    height: 40,
  },
});

export default SubscriptionScreen;
