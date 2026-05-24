import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  fetchAvailableChallenges,
  fetchActiveChallenges,
  fetchBadges,
  joinChallenge,
  clearChallengeError,
} from '@redux/slices/challengeSlice';
import {AppDispatch, RootState} from '@redux/store';
import {Challenge, Badge, ChallengeParticipation} from '@types/index';

const {width: screenWidth} = Dimensions.get('window');

type TabType = 'available' | 'active' | 'badges';
type ChallengeType = 'steps' | 'streak' | 'weight_loss';

const ChallengeScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {availableChallenges, activeChallenges, badges, isLoading, error} =
    useSelector((state: RootState) => state.challenge);
  const user = useSelector((state: RootState) => state.auth.user);
  const userProfile = useSelector((state: RootState) => state.user.profile);

  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchAvailableChallenges(userProfile?.isPremium || false));
      dispatch(fetchActiveChallenges(user.uid));
      dispatch(fetchBadges(user.uid));
    }
  }, [dispatch, user?.uid, userProfile?.isPremium]);

  useEffect(() => {
    if (error) {
      Alert.alert('错误', error, [
        {text: '确定', onPress: () => dispatch(clearChallengeError())},
      ]);
    }
  }, [error, dispatch]);

  const getChallengeTypeLabel = (type: ChallengeType): string => {
    const labels: Record<ChallengeType, string> = {
      steps: '步数挑战',
      streak: '连续打卡',
      weight_loss: '减重挑战',
    };
    return labels[type];
  };

  const getChallengeTypeEmoji = (type: ChallengeType): string => {
    const emojis: Record<ChallengeType, string> = {
      steps: '👟',
      streak: '🔥',
      weight_loss: '⚖️',
    };
    return emojis[type];
  };

  const getChallengeTypeDescription = (type: ChallengeType, target: number): string => {
    const descriptions: Record<ChallengeType, string> = {
      steps: `每日完成 ${target.toLocaleString()} 步`,
      streak: `连续打卡 ${target} 天`,
      weight_loss: `减重 ${target} 公斤`,
    };
    return descriptions[type];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: Date): number => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getProgressPercent = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  const isUserJoined = (challengeId: string): boolean => {
    return activeChallenges.some((ac) => ac.challengeId === challengeId && !ac.completed);
  };

  const getUserParticipation = (challengeId: string): ChallengeParticipation | undefined => {
    return activeChallenges.find((ac) => ac.challengeId === challengeId);
  };

  const handleJoinChallenge = useCallback(
    (challenge: Challenge) => {
      if (!user?.uid) return;
      if (challenge.isPremium && !userProfile?.isPremium) {
        Alert.alert('会员专享', '此挑战需要高级会员才能参与，请升级会员后再试。');
        return;
      }
      if (isUserJoined(challenge.id)) {
        Alert.alert('提示', '您已参与此挑战。');
        return;
      }
      dispatch(joinChallenge({challengeId: challenge.id, userId: user.uid}))
        .unwrap()
        .then(() => {
          Alert.alert('成功', '成功加入挑战！');
          setShowDetailModal(false);
        })
        .catch((err) => {
          Alert.alert('加入失败', err.message || '请稍后重试');
        });
    },
    [dispatch, user?.uid, userProfile?.isPremium, activeChallenges]
  );

  const showChallengeDetail = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setShowDetailModal(true);
  };

  const renderChallengeCard = (challenge: Challenge, showJoinButton: boolean = true) => {
    const participation = getUserParticipation(challenge.id);
    const progressPercent = participation
      ? getProgressPercent(participation.currentProgress, challenge.target)
      : 0;
    const joined = isUserJoined(challenge.id);

    return (
      <TouchableOpacity
        key={challenge.id}
        style={styles.challengeCard}
        onPress={() => showChallengeDetail(challenge)}>
        <View style={styles.challengeCardHeader}>
          <View style={styles.challengeTypeBadge}>
            <Text style={styles.challengeEmoji}>{getChallengeTypeEmoji(challenge.type)}</Text>
            <Text style={styles.challengeTypeText}>
              {getChallengeTypeLabel(challenge.type)}
            </Text>
          </View>
          {challenge.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>👑 会员</Text>
            </View>
          )}
        </View>

        <Text style={styles.challengeName}>{challenge.name}</Text>
        <Text style={styles.challengeDescription}>
          {getChallengeTypeDescription(challenge.type, challenge.target)}
        </Text>

        {participation && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>当前进度</Text>
              <Text style={styles.progressValue}>
                {participation.currentProgress} / {challenge.target} {challenge.unit}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${progressPercent}%`},
                ]}
              />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
          </View>
        )}

        <View style={styles.challengeFooter}>
          <View style={styles.challengeInfo}>
            <Text style={styles.infoText}>
              👥 {challenge.participants.length} 人参与
            </Text>
            <Text style={styles.infoText}>
              ⏰ {getDaysRemaining(challenge.endDate)} 天后结束
            </Text>
          </View>
          {showJoinButton && !joined && (
            <TouchableOpacity
              style={[
                styles.joinButton,
                challenge.isPremium && !userProfile?.isPremium && styles.joinButtonDisabled,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleJoinChallenge(challenge);
              }}>
              <Text style={styles.joinButtonText}>
                {challenge.isPremium && !userProfile?.isPremium ? '会员专享' : '加入挑战'}
              </Text>
            </TouchableOpacity>
          )}
          {joined && (
            <View style={styles.joinedBadge}>
              <Text style={styles.joinedText}>✓ 已加入</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBadgeGrid = () => {
    const allBadges: Badge[] = [
      {
        id: 'steps_10000',
        name: '万步达人',
        description: '单日步数达到10000步',
        icon: '👟',
        requirement: '单日10000步',
      },
      {
        id: 'steps_30',
        name: '健步新星',
        description: '累计30天完成步数目标',
        icon: '🏃',
        requirement: '30天达标',
      },
      {
        id: 'streak_7',
        name: '坚持一周',
        description: '连续打卡7天',
        icon: '🔥',
        requirement: '连续7天',
      },
      {
        id: 'streak_30',
        name: '月度达人',
        description: '连续打卡30天',
        icon: '🏆',
        requirement: '连续30天',
      },
      {
        id: 'streak_100',
        name: '百日之星',
        description: '连续打卡100天',
        icon: '💎',
        requirement: '连续100天',
      },
      {
        id: 'weight_loss_2',
        name: '轻装上阵',
        description: '成功减重2公斤',
        icon: '⚖️',
        requirement: '减重2kg',
      },
      {
        id: 'weight_loss_5',
        name: '塑形成功',
        description: '成功减重5公斤',
        icon: '🎯',
        requirement: '减重5kg',
      },
      {
        id: 'weight_loss_10',
        name: '蜕变达人',
        description: '成功减重10公斤',
        icon: '👑',
        requirement: '减重10kg',
      },
    ];

    const unlockedBadgeIds = new Set(badges.map((b) => b.id));

    return (
      <View style={styles.badgeGrid}>
        {allBadges.map((badge) => {
          const isUnlocked = unlockedBadgeIds.has(badge.id);
          return (
            <View
              key={badge.id}
              style={[
                styles.badgeItem,
                !isUnlocked && styles.badgeItemLocked,
              ]}>
              <Text
                style={[
                  styles.badgeIcon,
                  !isUnlocked && styles.badgeIconLocked,
                ]}>
                {badge.icon}
              </Text>
              <Text
                style={[
                  styles.badgeName,
                  !isUnlocked && styles.badgeNameLocked,
                ]}>
                {badge.name}
              </Text>
              <Text
                style={[
                  styles.badgeRequirement,
                  !isUnlocked && styles.badgeRequirementLocked,
                ]}>
                {badge.requirement}
              </Text>
              {isUnlocked && (
                <View style={styles.badgeUnlockedIndicator}>
                  <Text style={styles.badgeUnlockedText}>✓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedChallenge) return null;
    const joined = isUserJoined(selectedChallenge.id);
    const participation = getUserParticipation(selectedChallenge.id);
    const progressPercent = participation
      ? getProgressPercent(participation.currentProgress, selectedChallenge.target)
      : 0;

    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalChallengeType}>
                <Text style={styles.modalEmoji}>
                  {getChallengeTypeEmoji(selectedChallenge.type)}
                </Text>
                <Text style={styles.modalType}>
                  {getChallengeTypeLabel(selectedChallenge.type)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalTitle}>{selectedChallenge.name}</Text>
              <Text style={styles.modalDescription}>
                {selectedChallenge.description}
              </Text>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>挑战目标</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>目标要求</Text>
                  <Text style={styles.detailValue}>
                    {getChallengeTypeDescription(
                      selectedChallenge.type,
                      selectedChallenge.target
                    )}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>持续时间</Text>
                  <Text style={styles.detailValue}>
                    {selectedChallenge.durationDays} 天
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>开始时间</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedChallenge.startDate)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>结束时间</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedChallenge.endDate)}
                  </Text>
                </View>
              </View>

              {participation && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>我的进度</Text>
                  <View style={styles.modalProgressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>当前进度</Text>
                      <Text style={styles.progressValue}>
                        {participation.currentProgress} /{' '}
                        {selectedChallenge.target} {selectedChallenge.unit}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {width: `${progressPercent}%`},
                        ]}
                      />
                    </View>
                    <Text style={styles.progressPercent}>
                      {Math.round(progressPercent)}%
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>挑战奖励</Text>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardEmoji}>🏅</Text>
                  <View>
                    <Text style={styles.rewardTitle}>专属成就徽章</Text>
                    <Text style={styles.rewardDesc}>
                      完成挑战即可获得专属徽章，展示您的运动成就
                    </Text>
                  </View>
                </View>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardEmoji}>⭐</Text>
                  <View>
                    <Text style={styles.rewardTitle}>积分奖励</Text>
                    <Text style={styles.rewardDesc}>
                      获得 {selectedChallenge.target * 10} 积分，可用于兑换礼品
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>参与信息</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>参与人数</Text>
                  <Text style={styles.detailValue}>
                    {selectedChallenge.participants.length} 人
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>剩余时间</Text>
                  <Text style={styles.detailValue}>
                    {getDaysRemaining(selectedChallenge.endDate)} 天
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {!joined ? (
                <TouchableOpacity
                  style={[
                    styles.modalJoinButton,
                    selectedChallenge.isPremium &&
                      !userProfile?.isPremium &&
                      styles.modalJoinButtonDisabled,
                  ]}
                  onPress={() => handleJoinChallenge(selectedChallenge)}
                  disabled={selectedChallenge.isPremium && !userProfile?.isPremium}>
                  <Text style={styles.modalJoinButtonText}>
                    {selectedChallenge.isPremium && !userProfile?.isPremium
                      ? '👑 升级会员参与'
                      : '立即加入'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.modalJoinedButton}>
                  <Text style={styles.modalJoinedButtonText}>✓ 已参与此挑战</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading && availableChallenges.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>挑战中心</Text>
        <Text style={styles.headerSubtitle}>
          已获得 {badges.length} 枚徽章
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'available' && styles.activeTabText,
            ]}>
            可参与
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}>
            进行中
            {activeChallenges.filter((ac) => !ac.completed).length > 0 && (
              <Text style={styles.tabBadge}>
                {' '}
                {activeChallenges.filter((ac) => !ac.completed).length}
              </Text>
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
          onPress={() => setActiveTab('badges')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'badges' && styles.activeTabText,
            ]}>
            徽章墙
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'available' && (
          <View style={styles.listContainer}>
            {availableChallenges.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyTitle}>暂无可用挑战</Text>
                <Text style={styles.emptyDesc}>请稍后再来查看新的挑战</Text>
              </View>
            ) : (
              availableChallenges.map((challenge) =>
                renderChallengeCard(challenge, true)
              )
            )}
          </View>
        )}

        {activeTab === 'active' && (
          <View style={styles.listContainer}>
            {activeChallenges.filter((ac) => !ac.completed).length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💪</Text>
                <Text style={styles.emptyTitle}>暂无进行中的挑战</Text>
                <Text style={styles.emptyDesc}>
                  去可参与页面选择一个挑战开始吧
                </Text>
              </View>
            ) : (
              activeChallenges
                .filter((ac) => !ac.completed)
                .map((participation) => {
                  const challenge = availableChallenges.find(
                    (c) => c.id === participation.challengeId
                  );
                  if (!challenge) return null;
                  return renderChallengeCard(challenge, false);
                })
            )}
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.badgesContainer}>
            <View style={styles.badgeStats}>
              <View style={styles.badgeStatItem}>
                <Text style={styles.badgeStatValue}>{badges.length}</Text>
                <Text style={styles.badgeStatLabel}>已获得</Text>
              </View>
              <View style={styles.badgeStatDivider} />
              <View style={styles.badgeStatItem}>
                <Text style={styles.badgeStatValue}>8</Text>
                <Text style={styles.badgeStatLabel}>全部徽章</Text>
              </View>
            </View>
            {renderBadgeGrid()}
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
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
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  tabBadge: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 20,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  challengeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  challengeEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  challengeTypeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  premiumText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  challengeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressValue: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  joinedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  badgesContainer: {
    paddingBottom: 20,
  },
  badgeStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  badgeStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  badgeStatLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  badgeStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  badgeItem: {
    width: (screenWidth - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 5,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  badgeItemLocked: {
    backgroundColor: '#f5f5f5',
    borderColor: '#E0E0E0',
    opacity: 0.6,
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: '#999',
  },
  badgeRequirement: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
  },
  badgeRequirementLocked: {
    color: '#999',
  },
  badgeUnlockedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeUnlockedText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
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
  modalChallengeType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  modalType: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalProgressContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  rewardEmoji: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  rewardDesc: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalJoinButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalJoinButtonDisabled: {
    backgroundColor: '#FFD700',
  },
  modalJoinButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalJoinedButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalJoinedButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

export default ChallengeScreen;
