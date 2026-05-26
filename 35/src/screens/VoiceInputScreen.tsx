import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  useTheme,
  Chip,
  FAB,
  Dialog,
  Portal,
  HelperText,
} from 'react-native-paper';
import { useData } from '../context/DataContext';
import { useAppTheme } from '../context/ThemeContext';
import { VoiceService, ParsedVoiceInput } from '../services/VoiceService';
import { Priority, RepeatConfig } from '../types/models';
import { formatDate, getPriorityText } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';

interface Props {
  navigation: any;
}

const VoiceInputScreen: React.FC<Props> = ({ navigation }) => {
  const { lists, addTask } = useData();
  const { theme } = useAppTheme();
  const paperTheme = useTheme();

  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedVoiceInput | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(lists[0]?.id || null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const recognitionStarted = useRef(false);

  useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [lists]);

  useEffect(() => {
    requestPermissions();

    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const requestPermissions = async () => {
    try {
      setPermissionGranted(Platform.OS !== 'web');
    } catch (err) {
      console.error('Permission error:', err);
      setPermissionGranted(false);
    }
  };

  const onSpeechStart = (e: any) => {
    setIsListening(true);
    setError(null);
    recognitionStarted.current = true;
  };

  const onSpeechRecognized = (e: SpeechRecognizedEvent) => {
    // 语音识别中
  };

  const onSpeechPartialResults = (e: any) => {
    if (e.value && e.value.length > 0) {
      setRecognizedText(e.value[0]);
    }
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      setRecognizedText(text);

      if (selectedListId) {
        const parsed = VoiceService.parseVoiceInput(text, selectedListId);
        setParsedTask(parsed);
      }
    }
    setIsListening(false);
    recognitionStarted.current = false;
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.error('Speech error:', e.error);
    setError('语音识别失败，请重试');
    setIsListening(false);
    recognitionStarted.current = false;
  };

  const onSpeechEnd = (e: SpeechEndEvent) => {
    if (recognitionStarted.current) {
      setIsListening(false);
      recognitionStarted.current = false;
    }
  };

  const handleStartListening = async () => {
    if (!permissionGranted) {
      setError('请先授予麦克风权限');
      return;
    }

    setError(null);
    try {
      await Voice.start('zh-CN');
      setRecognizedText('');
      setParsedTask(null);
    } catch (err) {
      console.error('Start voice error:', err);
      setError('启动语音识别失败，请重试');
    }
  };

  const handleStopListening = async () => {
    try {
      await Voice.stop();
    } catch (err) {
      console.error('Stop voice error:', err);
    }
    setIsListening(false);
    recognitionStarted.current = false;
  };

  const handleManualParse = () => {
    if (recognizedText.trim() && selectedListId) {
      const parsed = VoiceService.parseVoiceInput(recognizedText.trim(), selectedListId);
      setParsedTask(parsed);
    }
  };

  const handleCreateTask = () => {
    if (!parsedTask || !selectedListId) return;

    addTask({
      title: parsedTask.title,
      listId: selectedListId,
      description: parsedTask.description || '',
      dueDate: parsedTask.dueDate,
      priority: parsedTask.priority,
      completed: false,
      completedAt: null,
      order: 0,
      repeatConfig: { rule: 'none' } as RepeatConfig,
    });

    setShowSuccessDialog(true);
  };

  const handleReset = () => {
    setRecognizedText('');
    setParsedTask(null);
    setError(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.text }]}>
              语音输入
            </Title>
            <Paragraph style={[styles.description, { color: paperTheme.colors.onSurfaceVariant }]}>
              点击麦克风按钮，说出您的任务
              {'\n'}示例："明天下午3点开会，高优先级"
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.listRow}>
              <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>
                选择清单
              </Title>
              <Button
                mode="outlined"
                onPress={() => setShowListPicker(true)}
              >
                {lists.find(l => l.id === selectedListId)?.title || '选择清单'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        {error ? (
          <HelperText type="error" visible={!!error} style={styles.error}>
            {error}
          </HelperText>
        ) : null}

        {recognizedText ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>
                识别结果
              </Title>
              <TextInput
                value={recognizedText}
                onChangeText={setRecognizedText}
                multiline
                style={styles.textInput}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <Button
                mode="text"
                onPress={handleManualParse}
                style={styles.parseButton}
              >
                重新解析
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {parsedTask ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>
                解析后的任务
              </Title>

              <View style={styles.parsedItem}>
                <MaterialCommunityIcons name="format-title" size={20} color={paperTheme.colors.onSurfaceVariant} />
                <Paragraph style={[styles.parsedLabel, { color: paperTheme.colors.onSurfaceVariant }]}>标题:</Paragraph>
                <Paragraph style={{ color: theme.colors.text }}>{parsedTask.title}</Paragraph>
              </View>

              {parsedTask.dueDate && (
                <View style={styles.parsedItem}>
                  <MaterialCommunityIcons name="calendar" size={20} color={paperTheme.colors.onSurfaceVariant} />
                  <Paragraph style={[styles.parsedLabel, { color: paperTheme.colors.onSurfaceVariant }]}>截止:</Paragraph>
                  <Paragraph style={{ color: theme.colors.text }}>{formatDate(parsedTask.dueDate)}</Paragraph>
                </View>
              )}

              <View style={styles.parsedItem}>
                <MaterialCommunityIcons name="flag" size={20} color={paperTheme.colors.onSurfaceVariant} />
                <Paragraph style={[styles.parsedLabel, { color: paperTheme.colors.onSurfaceVariant }]}>优先级:</Paragraph>
                <Chip
                  style={{
                    backgroundColor: parsedTask.priority === 'high' ? '#ff6b6b20' : parsedTask.priority === 'medium' ? '#ffd93d20' : '#6bcb7720'
                  }}
                  textStyle={{
                    color: parsedTask.priority === 'high' ? '#ff6b6b' : parsedTask.priority === 'medium' ? '#ffd93d' : '#6bcb77'
                  }}
                >
                  {getPriorityText(parsedTask.priority)}
                </Chip>
              </View>

              {parsedTask.description && (
                <View style={styles.parsedItem}>
                  <MaterialCommunityIcons name="note" size={20} color={paperTheme.colors.onSurfaceVariant} />
                  <Paragraph style={[styles.parsedLabel, { color: paperTheme.colors.onSurfaceVariant }]}>备注:</Paragraph>
                  <Paragraph style={{ color: theme.colors.text }}>{parsedTask.description}</Paragraph>
                </View>
              )}

              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={handleReset}
                  style={styles.button}
                >
                  重新输入
                </Button>
                <Button
                  mode="contained"
                  style={[styles.button, styles.createButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCreateTask}
                >
                  创建任务
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {!isListening && !recognizedText && (
          <View style={styles.micContainer}>
            <MaterialCommunityIcons
              name="microphone"
              size={80}
              color={paperTheme.colors.onSurfaceVariant}
            />
            <Paragraph style={[styles.hintText, { color: paperTheme.colors.onSurfaceVariant }]}>
              点击右下角按钮开始录音
            </Paragraph>
          </View>
        )}
      </ScrollView>

      <FAB
        style={[
          styles.fab,
          { backgroundColor: isListening ? paperTheme.colors.error : theme.colors.primary },
        ]}
        icon={isListening ? 'stop' : 'microphone'}
        color="#fff"
        onPress={isListening ? handleStopListening : handleStartListening}
      />

      <Portal>
        <Dialog
          visible={showListPicker}
          onDismiss={() => setShowListPicker(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>选择清单</Dialog.Title>
          <Dialog.Content>
            {lists.map(list => (
              <Button
                key={list.id}
                mode={selectedListId === list.id ? 'contained' : 'outlined'}
                style={[styles.listOption, { backgroundColor: selectedListId === list.id ? list.color : undefined }]}
                onPress={() => {
                  setSelectedListId(list.id);
                  setShowListPicker(false);
                }}
              >
                {list.title}
              </Button>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowListPicker(false)}>取消</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => {
            setShowSuccessDialog(false);
            handleReset();
          }}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>✅ 创建成功</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ color: theme.colors.text }}>
              任务已成功创建！
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowSuccessDialog(false);
                handleReset();
              }}
            >
              确定
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  textInput: {
    minHeight: 80,
  },
  parseButton: {
    alignSelf: 'flex-end',
  },
  parsedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  parsedLabel: {
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  createButton: {
    borderRadius: 8,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  hintText: {
    marginTop: 16,
    fontSize: 16,
  },
  error: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  listOption: {
    marginBottom: 8,
  },
});

export default VoiceInputScreen;
