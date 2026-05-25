import type { Song, Artist, Album, Playlist, LyricLine, Comment, RadioProgram, RecommendSong } from './api';

export const mockArtists: Artist[] = [
  { id: 1001, name: '周杰伦', picUrl: 'https://p2.music.126.net/DrZ1w==/109951165051626349.jpg' },
  { id: 1002, name: '林俊杰', picUrl: 'https://p2.music.126.net/Hhk6w==/109951166051626349.jpg' },
  { id: 1003, name: '陈奕迅', picUrl: 'https://p2.music.126.net/DrZ1w==/109951167051626349.jpg' },
  { id: 1004, name: '邓紫棋', picUrl: 'https://p2.music.126.net/Hhk6w==/109951168051626349.jpg' },
  { id: 1005, name: '薛之谦', picUrl: 'https://p2.music.126.net/DrZ1w==/109951169051626349.jpg' },
  { id: 1006, name: 'Taylor Swift', picUrl: 'https://p2.music.126.net/Hhk6w==/109951161051626349.jpg' },
  { id: 1007, name: 'Ed Sheeran', picUrl: 'https://p2.music.126.net/DrZ1w==/109951162051626349.jpg' },
  { id: 1008, name: 'Adele', picUrl: 'https://p2.music.126.net/Hhk6w==/109951163051626349.jpg' },
];

const createAlbum = (id: number, name: string, artistId: number): Album => ({
  id,
  name,
  picUrl: `https://p2.music.126.net/${(Math.random() > 0.5 ? 'DrZ1w' : 'Hhk6w')}==/10995116${100 + id * 1000}.jpg`,
  artist: mockArtists.find(a => a.id === artistId),
  publishTime: Date.now() - id * 86400000,
});

export const mockAlbums: Album[] = [
  createAlbum(2001, '范特西', 1001),
  createAlbum(2002, '七里香', 1001),
  createAlbum(2003, '叶惠美', 1001),
  createAlbum(2004, '伟大的渺小', 1002),
  createAlbum(2005, '和自己对话', 1002),
  createAlbum(2006, 'U87', 1003),
  createAlbum(2007, '七', 1003),
  createAlbum(2008, '光年之外', 1004),
  createAlbum(2009, '摩天动物园', 1004),
  createAlbum(2010, '演员', 1005),
  createAlbum(2011, '1989', 1006),
  createAlbum(2012, '÷', 1007),
  createAlbum(2013, '25', 1008),
];

const mockSongData = [
  { id: 3001, name: '晴天', artistIds: [1001], albumId: 2002, duration: 269000 },
  { id: 3002, name: '七里香', artistIds: [1001], albumId: 2002, duration: 299000 },
  { id: 3003, name: '青花瓷', artistIds: [1001], albumId: 2003, duration: 239000 },
  { id: 3004, name: '稻香', artistIds: [1001], albumId: 2003, duration: 223000 },
  { id: 3005, name: '双截棍', artistIds: [1001], albumId: 2001, duration: 189000 },
  { id: 3006, name: '江南', artistIds: [1002], albumId: 2004, duration: 248000 },
  { id: 3007, name: '修炼爱情', artistIds: [1002], albumId: 2004, duration: 257000 },
  { id: 3008, name: '可惜没如果', artistIds: [1002], albumId: 2005, duration: 296000 },
  { id: 3009, name: '富士山下', artistIds: [1003], albumId: 2006, duration: 287000 },
  { id: 3010, name: '十年', artistIds: [1003], albumId: 2006, duration: 205000 },
  { id: 3011, name: '浮夸', artistIds: [1003], albumId: 2007, duration: 298000 },
  { id: 3012, name: '光年之外', artistIds: [1004], albumId: 2008, duration: 235000 },
  { id: 3013, name: '泡沫', artistIds: [1004], albumId: 2009, duration: 276000 },
  { id: 3014, name: '演员', artistIds: [1005], albumId: 2010, duration: 256000 },
  { id: 3015, name: '丑八怪', artistIds: [1005], albumId: 2010, duration: 246000 },
  { id: 3016, name: 'Shake It Off', artistIds: [1006], albumId: 2011, duration: 219000 },
  { id: 3017, name: 'Blank Space', artistIds: [1006], albumId: 2011, duration: 231000 },
  { id: 3018, name: 'Shape of You', artistIds: [1007], albumId: 2012, duration: 234000 },
  { id: 3019, name: 'Perfect', artistIds: [1007], albumId: 2012, duration: 263000 },
  { id: 3020, name: 'Hello', artistIds: [1008], albumId: 2013, duration: 295000 },
  { id: 3021, name: 'Rolling in the Deep', artistIds: [1008], albumId: 2013, duration: 228000 },
  { id: 3022, name: '告白气球', artistIds: [1001], albumId: 2003, duration: 215000 },
  { id: 3023, name: '简单爱', artistIds: [1001], albumId: 2001, duration: 270000 },
  { id: 3024, name: '珊瑚海', artistIds: [1001, 1004], albumId: 2003, duration: 248000 },
  { id: 3025, name: '被风吹过的夏天', artistIds: [1002, 1004], albumId: 2004, duration: 257000 },
];

const sampleAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-';

export const mockSongs: Song[] = mockSongData.map((s, i) => ({
  id: s.id,
  name: s.name,
  artists: s.artistIds.map(id => mockArtists.find(a => a.id === id)!),
  album: mockAlbums.find(a => a.id === s.albumId)!,
  duration: s.duration,
  url: `${sampleAudioUrl}${(i % 16) + 1}.mp3`,
  fee: 0,
}));

export const mockPlaylists: Playlist[] = [
  {
    id: 4001,
    name: '华语经典金曲',
    coverImgUrl: 'https://p2.music.126.net/DrZ1w==/109951165051626349.jpg',
    description: '精选华语乐坛最经典的歌曲，每一首都是回忆',
    trackCount: 50,
    playCount: 12580000,
  },
  {
    id: 4002,
    name: '欧美流行精选',
    coverImgUrl: 'https://p2.music.126.net/Hhk6w==/109951166051626349.jpg',
    description: 'Billboard 热门单曲，紧跟潮流前线',
    trackCount: 100,
    playCount: 8920000,
  },
  {
    id: 4003,
    name: '深夜治愈民谣',
    coverImgUrl: 'https://p2.music.126.net/DrZ1w==/109951167051626349.jpg',
    description: '夜深人静时，让音乐治愈你的心灵',
    trackCount: 80,
    playCount: 5670000,
  },
  {
    id: 4004,
    name: '周杰伦完整收录',
    coverImgUrl: 'https://p2.music.126.net/Hhk6w==/109951168051626349.jpg',
    description: '从Jay到最伟大的作品，青春的完整记录',
    trackCount: 200,
    playCount: 15890000,
  },
  {
    id: 4005,
    name: '运动健身必备',
    coverImgUrl: 'https://p2.music.126.net/DrZ1w==/109951169051626349.jpg',
    description: '高能量节奏，点燃你的运动热情',
    trackCount: 60,
    playCount: 3450000,
  },
  {
    id: 4006,
    name: '学习专注纯音乐',
    coverImgUrl: 'https://p2.music.126.net/Hhk6w==/109951161051626349.jpg',
    description: '高效学习工作背景音，提升专注力',
    trackCount: 40,
    playCount: 7890000,
  },
];

export const mockLyrics: Record<number, string> = {
  3001: `[00:00.00]晴天 - 周杰伦
[00:04.50]词：周杰伦
[00:08.20]曲：周杰伦
[00:12.00]
[00:15.00]故事的小黄花
[00:18.50]从出生那年就飘着
[00:22.30]童年的荡秋千
[00:26.00]随记忆一直晃到现在
[00:29.80]
[00:30.50]Re So So Si Do Si La
[00:34.20]So La Si Si Si Si La Si La So
[00:38.00]吹着前奏望着天空
[00:41.80]我想起花瓣试着掉落
[00:45.00]
[00:46.00]为你翘课的那一天
[00:49.50]花落的那一天
[00:52.00]教室的那一间
[00:54.50]我怎么看不见
[00:57.00]
[00:58.00]消失的下雨天
[01:01.50]我好想再淋一遍
[01:05.00]没想到失去的勇气我还留着
[01:11.00]
[01:12.00]好想再问一遍
[01:15.50]你会等待还是离开
[01:19.00]
[01:22.00]刮风这天我试过握着你手
[01:26.50]但偏偏雨渐渐大到我看你不见
[01:31.00]还要多久我才能在你身边
[01:35.50]等到放晴的那天也许我会比较好一点
[01:41.00]
[01:42.00]从前从前有个人爱你很久
[01:46.50]但偏偏风渐渐把距离吹得好远
[01:51.00]好不容易又能再多爱一天
[01:55.50]但故事的最后你好像还是说了拜拜
[02:02.00]
[02:15.00]刮风这天我试过握着你手
[02:19.50]但偏偏雨渐渐大到我看你不见
[02:24.00]还要多久我才能在你身边
[02:28.50]等到放晴的那天也许我会比较好一点
[02:34.00]
[02:35.00]从前从前有个人爱你很久
[02:39.50]但偏偏风渐渐把距离吹得好远
[02:44.00]好不容易又能再多爱一天
[02:48.50]但故事的最后你好像还是说了拜拜`,
  3002: `[00:00.00]七里香 - 周杰伦
[00:04.00]词：方文山
[00:08.00]曲：周杰伦
[00:12.00]
[00:25.00]窗外的麻雀在电线杆上多嘴
[00:30.00]你说这一句很有夏天的感觉
[00:35.00]手中的铅笔在纸上来来回回
[00:40.00]我用几行字形容你是我的谁
[00:45.00]
[00:46.00]秋刀鱼的滋味猫跟你都想了解
[00:51.00]初恋的香味就这样被我们寻回
[00:56.00]那温暖的阳光像刚摘的鲜艳草莓
[01:01.00]你说你舍不得吃掉这一种感觉
[01:06.00]
[01:08.00]雨下整夜我的爱溢出就像雨水
[01:13.00]院子落叶跟我的思念厚厚一叠
[01:18.00]几句是非也无法将我的热情冷却
[01:23.00]你出现在我诗的每一页
[01:27.00]
[01:28.00]雨下整夜我的爱溢出就像雨水
[01:33.00]窗台蝴蝶像诗里纷飞的美丽章节
[01:38.00]我接着写把永远爱你写进诗的结尾
[01:43.00]你是我唯一想要的了解
[01:48.00]
[02:00.00]雨下整夜我的爱溢出就像雨水
[02:05.00]院子落叶跟我的思念厚厚一叠
[02:10.00]几句是非也无法将我的热情冷却
[02:15.00]你出现在我诗的每一页`,
  3003: `[00:00.00]青花瓷 - 周杰伦
[00:04.00]词：方文山
[00:08.00]曲：周杰伦
[00:12.00]
[00:20.00]素胚勾勒出青花笔锋浓转淡
[00:25.00]瓶身描绘的牡丹一如你初妆
[00:30.00]冉冉檀香透过窗心事我了然
[00:35.00]宣纸上走笔至此搁一半
[00:40.00]
[00:41.00]釉色渲染仕女图韵味被私藏
[00:46.00]而你嫣然的一笑如含苞待放
[00:51.00]你的美一缕飘散
[00:54.00]去到我去不了的地方
[00:58.00]
[01:00.00]天青色等烟雨而我在等你
[01:05.00]炊烟袅袅升起隔江千万里
[01:10.00]在瓶底书汉隶仿前朝的飘逸
[01:15.00]就当我为遇见你伏笔
[01:19.00]
[01:20.00]天青色等烟雨而我在等你
[01:25.00]月色被打捞起晕开了结局
[01:30.00]如传世的青花瓷自顾自美丽
[01:35.00]你眼带笑意`,
  3006: `[00:00.00]江南 - 林俊杰
[00:04.00]词：李瑞洵
[00:08.00]曲：林俊杰
[00:12.00]
[00:18.00]风到这里就是粘
[00:22.00]粘住过客的思念
[00:26.00]雨到了这里缠成线
[00:30.00]缠着我们流连人世间
[00:34.00]
[00:35.00]你在身边就是缘
[00:39.00]缘分写在三生石上面
[00:43.00]爱有万分之一甜
[00:47.00]宁愿我就葬在这一天
[00:51.00]
[00:52.00]圈圈圆圆圈圈
[00:55.00]天天年年天天的我
[00:58.00]深深看你的脸
[01:01.00]生气的温柔
[01:03.00]埋怨的温柔的脸
[01:07.00]
[01:08.00]不懂爱恨情愁煎熬的我们
[01:13.00]都以为相爱就像风云的善变
[01:18.00]相信爱一天抵过永远
[01:23.00]在这一刹那冻结了时间
[01:27.00]
[01:28.00]不懂怎么表现温柔的我们
[01:33.00]还以为殉情只是古老的传言
[01:38.00]离愁能有多痛痛有多浓
[01:43.00]当梦被埋在江南烟雨中
[01:48.00]心碎了才懂`,
  3016: `[00:00.00]Shake It Off - Taylor Swift
[00:04.00]Written by Taylor Swift, Max Martin, Shellback
[00:08.00]
[00:12.00]I stay out too late
[00:14.00]Got nothing in my brain
[00:16.00]That's what people say, mmm-mmm
[00:20.00]That's what people say, mmm-mmm
[00:24.00]
[00:25.00]I go on too many dates
[00:28.00]But I can't make 'em stay
[00:31.00]At least that's what they say, mmm-mmm
[00:35.00]That's what they say, mmm-mmm
[00:38.00]
[00:39.00]But I keep cruising
[00:42.00]Can't stop, won't stop moving
[00:45.00]It's like I got this music in my mind
[00:48.00]Saying it's gonna be alright
[00:52.00]
[00:53.00]'Cause the players gonna play, play, play, play, play
[00:57.00]And the haters gonna hate, hate, hate, hate, hate
[01:01.00]Baby, I'm just gonna shake, shake, shake, shake, shake
[01:06.00]I shake it off, I shake it off
[01:10.00]
[01:11.00]Heartbreakers gonna break, break, break, break, break
[01:15.00]And the fakers gonna fake, fake, fake, fake, fake
[01:19.00]Baby, I'm just gonna shake, shake, shake, shake, shake
[01:24.00]I shake it off, I shake it off`,
};

const mockUsers = [
  { userId: 5001, nickname: '音乐爱好者', avatarUrl: 'https://p2.music.126.net/DrZ1w==/109951165051626349.jpg' },
  { userId: 5002, nickname: '周杰伦的小迷妹', avatarUrl: 'https://p2.music.126.net/Hhk6w==/109951166051626349.jpg' },
  { userId: 5003, nickname: '循环播放一整天', avatarUrl: 'https://p2.music.126.net/DrZ1w==/109951167051626349.jpg' },
  { userId: 5004, nickname: '歌词收藏家', avatarUrl: 'https://p2.music.126.net/Hhk6w==/109951168051626349.jpg' },
  { userId: 5005, nickname: '深夜电台主播', avatarUrl: 'https://p2.music.126.net/DrZ1w==/109951169051626349.jpg' },
];

const mockCommentsContent = [
  '这首歌陪我度过了整个高中，每次听到都是满满的回忆',
  '周杰伦的歌永远听不腻，从小学听到现在工作了',
  '晴天不愧是神曲，旋律一出来就起鸡皮疙瘩了',
  '这首歌的编曲太绝了，每一个音符都恰到好处',
  '深夜一个人听这首歌，眼泪不自觉就下来了',
  '第一次听这首歌的时候我还在念初中，现在已经工作三年了',
  '这首歌的歌词写得太好了，方文山真的是鬼才',
  '每次去KTV必点的歌曲，全场大合唱的感觉太棒了',
  '感谢这首歌陪我走过那段最难的日子，音乐真的有治愈的力量',
  '已经循环了100遍，还是那么好听',
  '前奏一出来就知道是经典，无法超越的存在',
  '这首歌承载了太多人的青春记忆',
  '旋律太美了，加上周杰伦独特的唱腔，完美',
  '真正的好音乐是经得起时间考验的，十几年后再听依然感动',
  '今天心情不太好，听这首歌突然就释然了',
];

export const generateMockComments = (songId: number, count: number = 20): Comment[] => {
  return Array.from({ length: count }, (_, i) => ({
    commentId: 6000 + songId * 100 + i,
    content: mockCommentsContent[i % mockCommentsContent.length],
    user: mockUsers[i % mockUsers.length],
    likedCount: Math.floor(Math.random() * 10000) + 100,
    time: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
    liked: false,
  }));
};

export const mockRecommendSongs: RecommendSong[] = mockSongs.slice(0, 10).map(s => ({
  ...s,
  reason: Math.random() > 0.5 ? '根据你最近的播放推荐' : '每日推荐精选',
}));

export const mockRadioPrograms: RadioProgram[] = [
  {
    id: 7001,
    name: '深夜治愈电台',
    coverUrl: 'https://p2.music.126.net/DrZ1w==/109951165051626349.jpg',
    description: '每晚九点，用音乐治愈你的心灵',
    playCount: 568000,
    radio: { id: 8001, name: '治愈系', picUrl: 'https://p2.music.126.net/Hhk6w==/109951166051626349.jpg' },
  },
  {
    id: 7002,
    name: '经典老歌怀旧电台',
    coverUrl: 'https://p2.music.126.net/DrZ1w==/109951167051626349.jpg',
    description: '重温经典，回味青春',
    playCount: 1230000,
    radio: { id: 8002, name: '怀旧金曲', picUrl: 'https://p2.music.126.net/Hhk6w==/109951168051626349.jpg' },
  },
  {
    id: 7003,
    name: '电子音乐派对',
    coverUrl: 'https://p2.music.126.net/DrZ1w==/109951169051626349.jpg',
    description: '最嗨的电子音乐，唤醒你的身体',
    playCount: 890000,
    radio: { id: 8003, name: '电子音乐', picUrl: 'https://p2.music.126.net/Hhk6w==/109951161051626349.jpg' },
  },
  {
    id: 7004,
    name: '轻音乐咖啡馆',
    coverUrl: 'https://p2.music.126.net/DrZ1w==/109951162051626349.jpg',
    description: '午后时光，一杯咖啡一段音乐',
    playCount: 456000,
    radio: { id: 8004, name: '轻音乐', picUrl: 'https://p2.music.126.net/Hhk6w==/109951163051626349.jpg' },
  },
  {
    id: 7005,
    name: '华语流行榜',
    coverUrl: 'https://p2.music.126.net/DrZ1w==/109951164051626349.jpg',
    description: '最新最火的华语流行音乐',
    playCount: 2340000,
    radio: { id: 8005, name: '华语流行', picUrl: 'https://p2.music.126.net/Hhk6w==/109951165051626349.jpg' },
  },
  {
    id: 7006,
    name: '摇滚不死',
    coverUrl: 'https://p2.music.126.net/DrZ1w==/109951166051626349.jpg',
    description: '摇滚精神，永远年轻',
    playCount: 678000,
    radio: { id: 8006, name: '摇滚频道', picUrl: 'https://p2.music.126.net/Hhk6w==/109951167051626349.jpg' },
  },
];

export const getMockSongUrl = (songId: number): string | null => {
  const song = mockSongs.find(s => s.id === songId);
  return song?.url || null;
};

export const getMockLyric = (songId: number): LyricLine[] => {
  const lrcStr = mockLyrics[songId];
  if (!lrcStr) {
    return [
      { time: 0, text: '暂无歌词' },
      { time: 5000, text: '让音乐在空气中飘荡' },
      { time: 10000, text: '感受旋律的美好' },
      { time: 15000, text: '...' },
    ];
  }
  const lines = lrcStr.split('\n');
  const result: LyricLine[] = [];
  const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  for (const line of lines) {
    const matches = [...line.matchAll(timeReg)];
    if (matches.length === 0) continue;
    let text = line.replace(timeReg, '').trim();
    if (!text) text = '...';
    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
      result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
};

export const searchMockSongs = (keyword: string): Song[] => {
  const lowerKeyword = keyword.toLowerCase();
  return mockSongs.filter(song => {
    const nameMatch = song.name.toLowerCase().includes(lowerKeyword);
    const artistMatch = song.artists.some(a => a.name.toLowerCase().includes(lowerKeyword));
    const albumMatch = song.album.name.toLowerCase().includes(lowerKeyword);
    return nameMatch || artistMatch || albumMatch;
  });
};

export const mockUser = {
  userId: 9999,
  nickname: '音乐爱好者',
  avatarUrl: 'https://p2.music.126.net/DrZ1w==/109951165051626349.jpg',
  signature: '音乐是生活的调味剂',
  level: 8,
  listenSongs: 12580,
};
