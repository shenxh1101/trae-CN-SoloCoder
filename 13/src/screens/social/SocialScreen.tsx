import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {
  fetchFriends,
  sendFriendRequest,
  acceptFriendRequest,
  fetchFeed,
  fetchLeaderboard,
  likePost,
} from '@redux/slices/socialSlice';
import {AppDispatch, RootState} from '@redux/store';
import {Friend, SocialPost, LeaderboardEntry} from '@types/index';

type TabType = 'friends' | 'leaderboard' | 'posts';

const SocialScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const friends = useSelector((state: RootState) => state.social.friends);
  const posts = useSelector((state: RootState) => state.social.posts);
  const leaderboard = useSelector((state: RootState) => state.social.leaderboard);
  const isLoading = useSelector((state: RootState) => state.social.isLoading);

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending');

  const loadData = useCallback(async () => {
    if (userProfile?.id) {
      await Promise.all([
        dispatch(fetchFriends(userProfile.id)).unwrap(),
        dispatch(fetchFeed(userProfile.id)).unwrap(),
        dispatch(fetchLeaderboard({userId: userProfile.id, type: 'steps', timeRange: 'daily'})).unwrap(),
      ]);
    }
  }, [dispatch, userProfile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSendFriendRequest = () => {
    if (!searchQuery.trim()) {
      Alert.alert('提示', '请输入好友用户名');
      return;
    }
    if (!userProfile?.id) return;

    const mockFriendId = `user_${searchQuery.toLowerCase().replace(/\s+/g, '_')}`;
    dispatch(sendFriendRequest({
      userId: userProfile.id,
      friendId: mockFriendId,
      friendName: searchQuery,
      friendPhotoURL: undefined,
    }))
      .unwrap()
      .then(() => {
        Alert.alert('成功', '好友请求已发送');
        setSearchQuery('');
        setShowSearch(false);
      })
      .catch((error: Error) => {
        Alert.alert('错误', error.message || '发送好友请求失败');
      });
  };

  const handleAcceptFriendRequest = (friendDocId: string) => {
    dispatch(acceptFriendRequest(friendDocId))
      .unwrap()
      .then(() => {
        Alert.alert('成功', '已接受好友请求');
      })
      .catch((error: Error) => {
        Alert.alert('错误', error.message || '接受好友请求失败');
      });
  };

  const handleLikePost = (postId: string) => {
    if (!userProfile?.id) return;
    dispatch(likePost({postId, userId: userProfile.id}));
  };

  const handleLikeLeaderboard = (entry: LeaderboardEntry) => {
    Alert.alert('点赞', `已为 ${entry.userName} 点赞！`);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {backgroundColor: '#FFD700', color: '#fff'};
      case 2:
        return {backgroundColor: '#C0C0C0', color: '#fff'};
      case 3:
        return {backgroundColor: '#CD7F32', color: '#fff'};
      default:
        return {backgroundColor: '#f0f0f0', color: '#666'};
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
        onPress={() => setActiveTab('friends')}>
        <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
          好友
        </Text>
        {pendingRequests.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingRequests.length}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
        onPress={() => setActiveTab('leaderboard')}>
        <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
          排行榜
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
        onPress={() => setActiveTab('posts')}>
        <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
          动态
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      {showSearch ? (
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索好友用户名..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSendFriendRequest}>
            <Text style={styles.searchButtonText}>添加</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            setShowSearch(false);
            setSearchQuery('');
          }}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => setShowSearch(true)}>
          <Text style={styles.addFriendIcon}>+</Text>
          <Text style={styles.addFriendText}>添加好友</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFriendItem = ({item}: {item: Friend}) => (
    <View style={styles.friendItem}>
      <View style={styles.friendAvatar}>
        {item.friendPhotoURL ? (
          <Image source={{uri: item.friendPhotoURL}} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {item.friendName?.charAt(0) || '?'}
          </Text>
        )}
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.friendName || '未知用户'}</Text>
        <Text style={styles.friendStatus}>好友</Text>
      </View>
      <TouchableOpacity style={styles.messageButton}>
        <Text style={styles.messageIcon}>💬</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriendRequestItem = ({item}: {item: Friend}) => (
    <View style={[styles.friendItem, styles.requestItem]}>
      <View style={styles.friendAvatar}>
        {item.friendPhotoURL ? (
          <Image source={{uri: item.friendPhotoURL}} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {item.friendName?.charAt(0) || '?'}
          </Text>
        )}
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.friendName || '未知用户'}</Text>
        <Text style={styles.requestText}>请求添加你为好友</Text>
      </View>
      <TouchableOpacity
        style={styles.acceptButton}
        onPress={() => handleAcceptFriendRequest(item.id)}>
        <Text style={styles.acceptButtonText}>接受</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLeaderboardItem = ({item}: {item: LeaderboardEntry}) => {
    const rankStyle = getRankStyle(item.rank);
    return (
      <View style={styles.leaderboardItem}>
        <View style={[styles.rankBadge, {backgroundColor: rankStyle.backgroundColor}]}>
          <Text style={[styles.rankText, {color: rankStyle.color}]}>
            {item.rank}
          </Text>
        </View>
        <View style={styles.leaderboardAvatar}>
          {item.userPhotoURL ? (
            <Image source={{uri: item.userPhotoURL}} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {item.userName?.charAt(0) || '?'}
            </Text>
          )}
        </View>
        <View style={styles.leaderboardInfo}>
          <Text style={styles.leaderboardName}>{item.userName}</Text>
          <Text style={styles.leaderboardSteps}>
            {item.value.toLocaleString()} 步
          </Text>
        </View>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => handleLikeLeaderboard(item)}>
          <Text style={styles.likeIcon}>👍</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPostItem = ({item}: {item: SocialPost}) => {
    const isLiked = userProfile?.id ? item.likes.includes(userProfile.id) : false;
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAvatar}>
            {item.userPhotoURL ? (
              <Image source={{uri: item.userPhotoURL}} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {item.userName?.charAt(0) || '?'}
              </Text>
            )}
          </View>
          <View style={styles.postUserInfo}>
            <Text style={styles.postUserName}>{item.userName}</Text>
            <Text style={styles.postTime}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
        {item.mediaURL && (
          <Image source={{uri: item.mediaURL}} style={styles.postImage} />
        )}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.postActionButton}
            onPress={() => handleLikePost(item.id)}>
            <Text style={[styles.postActionIcon, isLiked && styles.likedIcon]}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={[styles.postActionText, isLiked && styles.likedText]}>
              {item.likes.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.postActionButton}>
            <Text style={styles.postActionIcon}>💬</Text>
            <Text style={styles.postActionText}>{item.comments.length}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFriendsTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {renderSearchBar()}

      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>好友请求 ({pendingRequests.length})</Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderFriendRequestItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>我的好友 ({acceptedFriends.length})</Text>
        {acceptedFriends.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>还没有好友</Text>
            <Text style={styles.emptySubText}>点击上方按钮添加好友吧</Text>
          </View>
        ) : (
          <FlatList
            data={acceptedFriends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );

  const renderLeaderboardTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.leaderboardHeader}>
        <Text style={styles.leaderboardTitle}>🏆 今日步数排行榜</Text>
      </View>
      {leaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏃</Text>
          <Text style={styles.emptyText}>暂无排行数据</Text>
          <Text style={styles.emptySubText}>快去运动，争取上榜吧</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.userId}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ScrollView>
  );

  const renderPostsTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.postsHeader}>
        <Text style={styles.postsTitle}>朋友圈动态</Text>
        <TouchableOpacity style={styles.createPostButton}>
          <Text style={styles.createPostText}>发布动态</Text>
        </TouchableOpacity>
      </View>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>暂无动态</Text>
          <Text style={styles.emptySubText}>快来发布第一条动态吧</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>社交</Text>
      </View>
      {renderTabBar()}
      {activeTab === 'friends' && renderFriendsTab()}
      {activeTab === 'leaderboard' && renderLeaderboardTab()}
      {activeTab === 'posts' && renderPostsTab()}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 20,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addFriendIcon: {
    fontSize: 24,
    color: '#4CAF50',
    marginRight: 8,
  },
  addFriendText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requestItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendStatus: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  requestText: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 4,
  },
  messageButton: {
    padding: 10,
  },
  messageIcon: {
    fontSize: 24,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  leaderboardHeader: {
    marginBottom: 15,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboardAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  leaderboardSteps: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  likeButton: {
    padding: 10,
  },
  likeIcon: {
    fontSize: 24,
  },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  createPostButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  createPostText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30,
  },
  postActionIcon: {
    fontSize: 22,
    marginRight: 6,
  },
  postActionText: {
    fontSize: 14,
    color: '#666',
  },
  likedIcon: {
    color: '#FF5252',
  },
  likedText: {
    color: '#FF5252',
    fontWeight: '600',
  },
  separator: {
    height: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});

export default SocialScreen;
